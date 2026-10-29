import type { HookStream, ProcessRunInit, ProcessRunResult, ProcessSpawnChunk, ProcessSpawnResult } from 'claude-code'

import type { Gpu, GpuKind, GpuProcess, GpuState, Throttle } from '../types'
import { clean, csvRows, num } from './util'

// System access, built inside a hook from `$` (which can never be passed around as a value).
export type Io = {
  run: (argv: readonly string[], init?: ProcessRunInit) => Promise<ProcessRunResult>
  spawn: (argv: readonly string[]) => HookStream<ProcessSpawnChunk, ProcessSpawnResult>
  read: (path: string) => Promise<string>
  sleep: (ms: number) => Promise<void>
}

export type GpuBackend = 'auto' | GpuKind | 'none'

const TIMEOUT_MS = 5000

// ---------------------------------------------------------------- NVIDIA (nvidia-smi)

// Two queries per cycle, run in parallel: nvidia-smi cannot return GPU state and process list in one.
const NVIDIA_FIELDS = 'uuid,name,utilization.gpu,memory.used,memory.total,power.draw,power.limit,temperature.gpu'
// Throttle reasons bitmask. Renamed on some drivers: dropped from the query if refused.
const THROTTLE_FIELD = 'clocks_throttle_reasons.active'
const APP_FIELDS = 'gpu_uuid,pid,process_name,used_memory'

// Bits that matter (nvidia-smi docs); idle, application clocks and sync boost are ignored.
const THROTTLE_BITS: [number, Throttle][] = [
  [0x40, 'thermal'],
  [0x20, 'thermal'],
  [0x80, 'power-brake'],
  [0x08, 'hw-slowdown'],
  [0x04, 'power-cap'],
]

// null = unknown, [] = not throttled.
export function parseThrottle(hex: string | undefined): Throttle[] | null {
  if (!hex || !/^0x[0-9a-f]+$/i.test(hex)) return null
  const mask = Number.parseInt(hex, 16)
  const found = THROTTLE_BITS.filter(([bit]) => (mask & bit) !== 0).map(([, reason]) => reason)
  return [...new Set(found)]
}

export function parseNvidia(gpuCsv: string, appsCsv: string): Gpu | null {
  const row = csvRows(gpuCsv)[0]
  if (!row) return null
  const [uuid, name, util, memUsed, memTotal, power, powerLimit, temp, throttle] = row
  const processes: GpuProcess[] = csvRows(appsCsv)
    .filter(([appUuid]) => appUuid === uuid)
    .map(([, pid, path, mem]) => ({
      pid: Number(pid),
      name: clean((path ?? '?').split('/').pop() || '?'),
      memMiB: num(mem),
    }))
    .sort((a, b) => (b.memMiB ?? 0) - (a.memMiB ?? 0))
  return {
    kind: 'nvidia',
    name: clean((name ?? 'GPU').replace(/^NVIDIA (GeForce )?/, '')),
    isSharedMemory: false,
    utilPercent: num(util),
    memUsedMiB: num(memUsed),
    memTotalMiB: num(memTotal),
    powerW: num(power),
    powerLimitW: num(powerLimit),
    tempC: num(temp),
    throttle: parseThrottle(throttle),
    processes,
  }
}

let isThrottleFieldOk = true

async function sampleNvidia(io: Io, index: number): Promise<GpuState> {
  const smi = (args: string[]) => io.run(['nvidia-smi', ...args], { timeoutMs: TIMEOUT_MS })
  const fields = () => `--query-gpu=${NVIDIA_FIELDS}${isThrottleFieldOk ? `,${THROTTLE_FIELD}` : ''}`
  const queryGpu = () => smi([`--id=${index}`, fields(), '--format=csv,noheader,nounits'])
  let [gpu, apps] = await Promise.all([queryGpu(), smi([`--query-compute-apps=${APP_FIELDS}`, '--format=csv,noheader,nounits'])])
  if (gpu.exitCode !== 0 && isThrottleFieldOk) {
    isThrottleFieldOk = false
    gpu = await queryGpu()
  }
  if (gpu.exitCode !== 0) return { kind: 'error', message: clean(gpu.stderr.split('\n')[0] || `exit ${gpu.exitCode}`, 120) }
  const parsed = parseNvidia(gpu.stdout, apps.exitCode === 0 ? apps.stdout : '')
  return parsed ? { kind: 'ok', gpu: parsed } : { kind: 'error', message: 'empty nvidia-smi output' }
}

// ---------------------------------------------------------------- Jetson (tegrastats) [to validate]

// One tegrastats line, e.g. (Orin, JetPack 5/6):
// RAM 2448/7620MB (lfb 1x4MB) SWAP 0/3810MB ... GR3D_FREQ 0%@[305,305] ... gpu@46.375C ... VDD_IN 4383mW/4383mW
// Older modules print POM_5V_IN 1135/1135 and GPU@26C. Unified memory: RAM is shared by CPU and GPU.
export function parseTegrastats(line: string, model: string | null): Gpu | null {
  const ram = /\bRAM (\d+)\/(\d+)MB/.exec(line)
  const gr3d = /\bGR3D_FREQ (\d+)%/.exec(line)
  if (!ram && !gr3d) return null
  const temp = /\bgpu@(-?\d+(?:\.\d+)?)C/i.exec(line)
  const power = /\b(?:VDD_IN|POM_5V_IN|VIN_SYS_5V0) (\d+)(?:mW)?\//.exec(line)
  return {
    kind: 'jetson',
    name: model ? clean(model.replace(/^NVIDIA\s+/, '')) : 'Jetson',
    isSharedMemory: true,
    utilPercent: num(gr3d?.[1]),
    memUsedMiB: num(ram?.[1]),
    memTotalMiB: num(ram?.[2]),
    powerW: power ? Number(power[1]) / 1000 : null,
    powerLimitW: null,
    tempC: num(temp?.[1]),
    throttle: null,
    processes: null,
  }
}

const readModel = (io: Io) =>
  io
    .read('/proc/device-tree/model')
    .then(s => s.replace(/\0/g, '').trim())
    .catch(() => null)

// tegrastats never exits: read its first line, then close the stream (which stops it).
async function firstLine(io: Io, argv: string[], timeoutMs: number): Promise<string | null> {
  const stream = io.spawn(argv)
  const deadline = io.sleep(timeoutMs).then(() => null)
  let buffer = ''
  try {
    for (;;) {
      const piece = await Promise.race([stream.next(), deadline])
      if (piece === null || piece.done) return null
      buffer += piece.value.text
      const end = buffer.indexOf('\n')
      if (end >= 0) return buffer.slice(0, end)
    }
  } finally {
    void stream.return(undefined as never).catch(() => {})
  }
}

async function sampleJetson(io: Io): Promise<GpuState> {
  const [model, line] = await Promise.all([readModel(io), firstLine(io, ['tegrastats', '--interval', '200'], TIMEOUT_MS)])
  if (line === null) return { kind: 'error', message: 'no tegrastats output' }
  const parsed = parseTegrastats(line, model)
  return parsed ? { kind: 'ok', gpu: parsed } : { kind: 'error', message: 'unrecognized tegrastats line' }
}

// ---------------------------------------------------------------- AMD (rocm-smi) [to validate]

const ROCM_ARGS = ['--showproductname', '--showuse', '--showmeminfo', 'vram', '--showtemp', '--showpower', '--showmaxpower', '--json']

// rocm-smi --json: { "card0": { "GPU use (%)": "12", "VRAM Total Memory (B)": "...", ... } }.
// Key names drift between ROCm versions, so keys are matched by pattern, first match wins.
export function parseRocmSmi(json: string, index: number): Gpu | null {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  const card = (data as Record<string, unknown> | null)?.[`card${index}`]
  if (!card || typeof card !== 'object') return null
  const entries = Object.entries(card as Record<string, unknown>)
  const pick = (...patterns: RegExp[]) => {
    for (const re of patterns) {
      const hit = entries.find(([key]) => re.test(key))
      if (hit) return String(hit[1])
    }
    return undefined
  }
  const mib = (bytes: string | undefined) => {
    const v = num(bytes)
    return v === null ? null : v / 1024 ** 2
  }
  return {
    kind: 'amd',
    name: clean(pick(/^Card series$/i, /^Card SKU$/i, /^Card model$/i) ?? 'AMD GPU'),
    isSharedMemory: false,
    utilPercent: num(pick(/^GPU use \(%\)$/i)),
    memUsedMiB: mib(pick(/^VRAM Total Used Memory \(B\)$/i)),
    memTotalMiB: mib(pick(/^VRAM Total Memory \(B\)$/i)),
    powerW: num(pick(/^(Average|Current Socket) Graphics Package Power \(W\)$/i)),
    powerLimitW: num(pick(/^Max Graphics Package Power \(W\)$/i)),
    tempC: num(pick(/^Temperature \(Sensor edge\) \(C\)$/i, /^Temperature .*\(C\)$/i)),
    throttle: null,
    processes: null,
  }
}

async function sampleAmd(io: Io, index: number): Promise<GpuState> {
  const r = await io.run(['rocm-smi', ...ROCM_ARGS], { timeoutMs: TIMEOUT_MS })
  if (r.exitCode !== 0) return { kind: 'error', message: clean(r.stderr.split('\n')[0] || `exit ${r.exitCode}`, 120) }
  const parsed = parseRocmSmi(r.stdout, index)
  return parsed ? { kind: 'ok', gpu: parsed } : { kind: 'error', message: `card${index} not found in rocm-smi output` }
}

// ---------------------------------------------------------------- selection

const succeeds = (io: Io, argv: string[]) =>
  io.run(argv, { timeoutMs: TIMEOUT_MS }).then(
    r => r.exitCode === 0,
    () => false,
  )

// Jetson first (a file read, and some JetPack versions ship a limited nvidia-smi), then NVIDIA, then AMD.
export async function detectGpu(io: Io): Promise<GpuKind | null> {
  if (/jetson/i.test((await readModel(io)) ?? '')) return 'jetson'
  if (await succeeds(io, ['nvidia-smi', '-L'])) return 'nvidia'
  if (await succeeds(io, ['rocm-smi', '--showid'])) return 'amd'
  return null
}

// A tool that cannot start (not installed) reads as "no GPU", never as a crash.
export async function sampleGpu(io: Io, kind: GpuKind, index: number): Promise<GpuState> {
  try {
    if (kind === 'nvidia') return await sampleNvidia(io, index)
    if (kind === 'jetson') return await sampleJetson(io)
    return await sampleAmd(io, index)
  } catch {
    return { kind: 'absent' }
  }
}
