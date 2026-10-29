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
