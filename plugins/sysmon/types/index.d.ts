export type GpuKind = 'nvidia' | 'jetson' | 'amd'

export type Throttle = 'thermal' | 'power-brake' | 'hw-slowdown' | 'power-cap'

export type GpuProcess = { pid: number; name: string; memMiB: number | null }

export type Gpu = {
  kind: GpuKind
  name: string
  // Jetson: CPU and GPU share the RAM, there is no separate VRAM.
  isSharedMemory: boolean
  utilPercent: number | null
  memUsedMiB: number | null
  memTotalMiB: number | null
  powerW: number | null
  powerLimitW: number | null
  tempC: number | null
  // null = unknown on this backend, [] = not throttled.
  throttle: Throttle[] | null
  // null = not available on this backend.
  processes: GpuProcess[] | null
}

export type GpuState = { kind: 'ok'; gpu: Gpu } | { kind: 'absent' } | { kind: 'error'; message: string }

export type Ram = { usedKiB: number; availableKiB: number; totalKiB: number; swapUsedKiB: number; swapTotalKiB: number }

export type Disk = { mount: string; sizeBytes: number; availBytes: number }

// A program and the resident memory of all its processes together.
export type MemUser = { name: string; kib: number }

export type Snapshot = {
  gpu: GpuState
  cpuPercent: number | null
  cores: number | null
  load: number[] | null
  ram: Ram | null
  // The programs using the most RAM, biggest first; null = not measured (no `ps`).
  topRam: MemUser[] | null
  disks: Disk[] | null
}

declare module 'claude-code' {
  interface PluginState {
    sysmon: { snapshot: Shaped<Snapshot | null> }
  }
}
