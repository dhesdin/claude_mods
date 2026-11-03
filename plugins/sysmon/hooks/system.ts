import type { Disk, MemUser, Ram } from '../types'
import type { Io } from './gpu'
import { clean, num } from './util'

export type CpuTimes = { idle: number; total: number }

export function parseCpuTimes(stat: string): CpuTimes | null {
  const line = stat.split('\n').find(l => l.startsWith('cpu '))
  if (!line) return null
  // user nice system idle iowait irq softirq steal
  const v = line.trim().split(/\s+/).slice(1, 9).map(Number)
  if (v.length < 8 || v.some(x => !Number.isFinite(x))) return null
  const idle = (v[3] ?? 0) + (v[4] ?? 0)
  return { idle, total: v.reduce((a, b) => a + b, 0) }
}

// Logical cores: the cpu0, cpu1… lines of /proc/stat.
export function parseCores(stat: string): number | null {
  const n = stat.split('\n').filter(l => /^cpu\d+ /.test(l)).length
  return n > 0 ? n : null
}

export function cpuPercent(prev: CpuTimes | null, cur: CpuTimes | null): number | null {
  if (!prev || !cur || cur.total <= prev.total) return null
  return (1 - (cur.idle - prev.idle) / (cur.total - prev.total)) * 100
}

export function parseLoad(loadavg: string): number[] | null {
  const v = loadavg.trim().split(/\s+/).slice(0, 3).map(Number)
  return v.length === 3 && v.every(Number.isFinite) ? v : null
}

export function parseMeminfo(meminfo: string): Ram | null {
  const kib = (key: string) => num(new RegExp(`^${key}:\\s+(\\d+)`, 'm').exec(meminfo)?.[1])
  const total = kib('MemTotal')
  const available = kib('MemAvailable')
  if (total === null || available === null) return null
  const swapTotal = kib('SwapTotal') ?? 0
  const swapFree = kib('SwapFree') ?? 0
  return {
    usedKiB: total - available,
    availableKiB: available,
    totalKiB: total,
    swapUsedKiB: swapTotal - swapFree,
    swapTotalKiB: swapTotal,
  }
}

// `df -B1 --output=target,size,avail`: header skipped, one mount point per line, no duplicates.
export function parseDf(text: string): Disk[] {
  const disks: Disk[] = []
  for (const line of text.split('\n').slice(1)) {
    const m = /^(.+?)\s+(\d+)\s+(\d+)\s*$/.exec(line)
    if (!m) continue
    const mount = clean(m[1] ?? '?')
    if (disks.some(d => d.mount === mount)) continue
    disks.push({ mount, sizeBytes: Number(m[2]), availBytes: Number(m[3]) })
  }
  return disks
}

const readOrNull = (io: Io, path: string) => io.read(path).catch(() => null)

export async function sampleSystem(io: Io, prevCpu: CpuTimes | null) {
  const [stat, loadavg, meminfo] = await Promise.all([
    readOrNull(io, '/proc/stat'),
    readOrNull(io, '/proc/loadavg'),
    readOrNull(io, '/proc/meminfo'),
  ])
  const cpu = stat === null ? null : parseCpuTimes(stat)
  return {
    cpu,
    cpuPercent: cpuPercent(prevCpu, cpu),
    cores: stat === null ? null : parseCores(stat),
    load: loadavg === null ? null : parseLoad(loadavg),
    ram: meminfo === null ? null : parseMeminfo(meminfo),
  }
}

export async function sampleDisks(io: Io, paths: readonly string[]): Promise<Disk[] | null> {
  try {
    // `--` ends option parsing: a configured path can never be read as a df flag.
    // Exit code 1 when one path is missing: the other lines still hold.
    const r = await io.run(['df', '-B1', '--output=target,size,avail', '--', ...paths], { timeoutMs: 5000 })
    const disks = parseDf(r.stdout)
    return disks.length > 0 ? disks : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- Windows (no /proc)

// One PowerShell process prints one JSON line every `ms` (`count` lines, or until stopped when < 0).
// CIM classes rather than counter paths, which Windows translates into its display language.
// idle / ts: the raw idle counter and its 100 ns clock, so cpuPercent works as on /proc/stat.
// The 3 programs using the most RAM are listed every `topEvery` lines; the numbers are ours, not options.
export function windowsScript(ms: number, count: number, topEvery: number): string {
  return `$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$cores = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
$top = @(); $n = 0
while (${count} -lt 0 -or $n -lt ${count}) {
  $p = Get-CimInstance Win32_PerfRawData_PerfOS_Processor -Filter "Name='_Total'"
  $m = Get-CimInstance Win32_PerfRawData_PerfOS_Memory
  $o = Get-CimInstance Win32_OperatingSystem
  $f = @(Get-CimInstance Win32_PageFileUsage)
  if ($n % ${topEvery} -eq 0) {
    $top = @(Get-Process | Group-Object ProcessName | ForEach-Object { [pscustomobject]@{ kib = [long](($_.Group | Measure-Object WorkingSet64 -Sum).Sum / 1024); name = $_.Name } } | Sort-Object kib -Descending | Select-Object -First 3)
  }
  $s = [ordered]@{ idle = [double]$p.PercentProcessorTime; ts = [double]$p.Timestamp_Sys100NS; cores = $cores
    totalKiB = [long]$o.TotalVisibleMemorySize; availKiB = [long]$m.AvailableKBytes
    swapUsedKiB = [long](($f | Measure-Object CurrentUsage -Sum).Sum * 1024); swapTotalKiB = [long](($f | Measure-Object AllocatedBaseSize -Sum).Sum * 1024)
    top = $top }
  [Console]::Out.WriteLine(($s | ConvertTo-Json -Compress -Depth 3))
  $n++
  if (${count} -lt 0 -or $n -lt ${count}) { Start-Sleep -Milliseconds ${ms} }
}`
}

export const windowsArgv = (script: string) => ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', script]

export type WindowsSample = { cpu: CpuTimes; cores: number | null; ram: Ram; top: MemUser[] | null }

export function parseWindows(line: string): WindowsSample | null {
  let v: Record<string, unknown>
  try {
    v = JSON.parse(line)
  } catch {
    return null
  }
  const n = (key: string) => (typeof v[key] === 'number' && Number.isFinite(v[key]) ? (v[key] as number) : null)
  const [idle, ts, total, avail] = [n('idle'), n('ts'), n('totalKiB'), n('availKiB')]
  if (idle === null || ts === null || total === null || avail === null || total <= 0) return null
  // PowerShell 5.1 writes a one-item list as the item itself.
  const raw = Array.isArray(v.top) ? v.top : v.top ? [v.top] : []
  const top = raw
    .map(p => p as { kib?: unknown; name?: unknown })
    .filter(p => typeof p.kib === 'number' && typeof p.name === 'string')
    .map(p => ({ name: clean(p.name as string).slice(0, 24), kib: p.kib as number }))
  return {
    cpu: { idle, total: ts },
    cores: n('cores'),
    ram: {
      usedKiB: total - avail,
      availableKiB: avail,
      totalKiB: total,
      swapUsedKiB: n('swapUsedKiB') ?? 0,
      swapTotalKiB: n('swapTotalKiB') ?? 0,
    },
    top: top.length > 0 ? top : null,
  }
}

// Every JSON line of a PowerShell output, in order; partial or broken lines are skipped.
export const parseWindowsLines = (text: string) =>
  text
    .split('\n')
    .map(parseWindows)
    .filter((s): s is WindowsSample => s !== null)

// `ps -eo rss=,comm=` lines: resident KiB and program name. Processes of one program are added up
// (a browser runs dozens), then the `count` biggest are kept.
export function parsePs(text: string, count = 3): MemUser[] {
  const byName = new Map<string, number>()
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(.+)$/)
    if (!m) continue
    const name = clean(m[2] ?? '').slice(0, 24)
    if (name) byName.set(name, (byName.get(name) ?? 0) + Number(m[1]))
  }
  return [...byName]
    .map(([name, kib]) => ({ name, kib }))
    .sort((a, b) => b.kib - a.kib)
    .slice(0, count)
}

export async function sampleTopRam(io: Io): Promise<MemUser[] | null> {
  try {
    const r = await io.run(['ps', '-eo', 'rss=,comm='], { timeoutMs: 5000 })
    const top = r.exitCode === 0 ? parsePs(r.stdout) : []
    return top.length > 0 ? top : null
  } catch {
    return null
  }
}
