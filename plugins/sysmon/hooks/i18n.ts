import type { Throttle } from '../types'

// Display languages. To add one: add its code to `language.options` in plugin.json and a table below.
export const LANGS = ['en', 'fr', 'ja', 'zh'] as const
export type Lang = (typeof LANGS)[number]

export type Strings = {
  paneTitle: string
  commandDescription: string
  opened: string
  closed: string
  notReady: string
  measuring: string
  noGpu: string
  gpuError: (message: string) => string
  pct: (n: string | number) => string
  gb: string
  utilization: string
  vram: string
  sharedMemory: string
  usedFree: (free: string) => string
  temperature: string
  power: string
  throttling: string
  throttleNone: string
  throttle: Record<Throttle, string>
  process: (name: string, pid: number, mem: string) => string
  noProcess: string
  cpuBusy: string
  load: string
  cores: (n: number | string) => string
  loadTrend: (m5: string, m15: string) => string
  available: string
  of: (total: string) => string
  used: (used: string) => string
  swapNone: string
  swap: (used: string, total: string) => string
  disk: string
  diskFree: (free: string) => string
}

const en: Strings = {
  paneTitle: 'Machine',
  commandDescription: 'Open or close the GPU / CPU / RAM panel',
  opened: 'sysmon panel opened.',
  closed: 'sysmon panel closed.',
  notReady: 'sysmon is not ready yet.',
  measuring: 'Measuring…',
  noGpu: 'No supported GPU',
  gpuError: m => `GPU error: ${m}`,
  pct: n => `${n}%`,
  gb: 'GB',
  utilization: 'Utilization',
  vram: 'VRAM',
  sharedMemory: 'Shared memory (CPU + GPU)',
  usedFree: f => `used · ${f} GB free`,
  temperature: 'Temperature',
  power: 'Power',
  throttling: 'Throttling',
  throttleNone: 'none',
  throttle: {
    thermal: 'thermal (GPU too hot)',
    'power-cap': 'power limit (max power draw reached)',
    'power-brake': 'power brake (external signal)',
    'hw-slowdown': 'hardware slowdown',
  },
  process: (n, pid, mem) => `process: ${n} (PID ${pid})  ${mem} GB`,
  noProcess: 'no GPU process',
  cpuBusy: 'busy',
  load: 'Load',
  cores: n => `${n} cores`,
  loadTrend: (a, b) => `(5 min: ${a} · 15 min: ${b})`,
  available: 'available',
  of: t => `of ${t} GB`,
  used: u => `used ${u} GB`,
  swapNone: 'swap not configured',
  swap: (u, t) => `swap ${u} / ${t} GB`,
  disk: 'Disk',
  diskFree: f => `${f} GB free`,
}

const fr: Strings = {
  paneTitle: 'Machine',
  commandDescription: 'Ouvrir ou fermer le panneau GPU / CPU / RAM',
  opened: 'Panneau sysmon ouvert.',
  closed: 'Panneau sysmon fermé.',
  notReady: "sysmon n'est pas encore prêt.",
  measuring: 'Mesure en cours…',
  noGpu: 'Aucun GPU pris en charge',
  gpuError: m => `Erreur GPU : ${m}`,
  pct: n => `${n} %`,
  gb: 'Go',
  utilization: 'Utilisation',
  vram: 'VRAM',
  sharedMemory: 'Mémoire partagée (CPU + GPU)',
  usedFree: f => `utilisés · ${f} Go libres`,
  temperature: 'Température',
  power: 'Conso',
  throttling: 'Bridage',
  throttleNone: 'aucun',
  throttle: {
    thermal: 'thermique (GPU trop chaud)',
    'power-cap': 'limite de puissance (conso max atteinte)',
    'power-brake': 'frein de puissance (signal externe)',
    'hw-slowdown': 'ralentissement matériel',
  },
  process: (n, pid, mem) => `process : ${n} (PID ${pid})  ${mem} Go`,
  noProcess: 'aucun process GPU',
  cpuBusy: 'occupé',
  load: 'Charge',
  cores: n => `${n} cœurs`,
  loadTrend: (a, b) => `(5 min : ${a} · 15 min : ${b})`,
  available: 'disponible',
  of: t => `sur ${t} Go`,
  used: u => `utilisée ${u} Go`,
  swapNone: 'swap non configuré',
  swap: (u, t) => `swap ${u} / ${t} Go`,
  disk: 'Disque',
  diskFree: f => `${f} Go libres`,
}

const ja: Strings = {
  paneTitle: 'マシン',
  commandDescription: 'GPU / CPU / RAM パネルを開閉する',
  opened: 'sysmon パネルを開きました。',
  closed: 'sysmon パネルを閉じました。',
  notReady: 'sysmon はまだ準備中です。',
  measuring: '計測中…',
  noGpu: '対応 GPU なし',
  gpuError: m => `GPU エラー：${m}`,
  pct: n => `${n}%`,
  gb: 'GB',
  utilization: '使用率',
  vram: 'VRAM',
  sharedMemory: '共有メモリ（CPU + GPU）',
  usedFree: f => `使用中 · 空き ${f} GB`,
  temperature: '温度',
  power: '消費電力',
  throttling: 'スロットリング',
  throttleNone: 'なし',
  throttle: {
    thermal: '温度（GPU が高温）',
    'power-cap': '電力制限（最大消費電力に到達）',
    'power-brake': '電力ブレーキ（外部信号）',
    'hw-slowdown': 'ハードウェア減速',
  },
  process: (n, pid, mem) => `プロセス：${n}（PID ${pid}） ${mem} GB`,
  noProcess: 'GPU プロセスなし',
  cpuBusy: '使用率',
  load: '負荷',
  cores: n => `${n} コア`,
  loadTrend: (a, b) => `（5分：${a} · 15分：${b}）`,
  available: '空き',
  of: t => `/ ${t} GB`,
  used: u => `使用中 ${u} GB`,
  swapNone: 'スワップ未設定',
  swap: (u, t) => `スワップ ${u} / ${t} GB`,
  disk: 'ディスク',
  diskFree: f => `空き ${f} GB`,
}

const zh: Strings = {
  paneTitle: '机器',
  commandDescription: '打开或关闭 GPU / CPU / 内存面板',
  opened: 'sysmon 面板已打开。',
  closed: 'sysmon 面板已关闭。',
  notReady: 'sysmon 尚未就绪。',
  measuring: '测量中…',
  noGpu: '无受支持的 GPU',
  gpuError: m => `GPU 错误：${m}`,
  pct: n => `${n}%`,
  gb: 'GB',
  utilization: '利用率',
  vram: '显存',
  sharedMemory: '共享内存（CPU + GPU）',
  usedFree: f => `已用 · 可用 ${f} GB`,
  temperature: '温度',
  power: '功耗',
  throttling: '降频',
  throttleNone: '无',
  throttle: {
    thermal: '温度（GPU 过热）',
    'power-cap': '功耗上限（已达最大功耗）',
    'power-brake': '功率制动（外部信号）',
    'hw-slowdown': '硬件降速',
  },
  process: (n, pid, mem) => `进程：${n}（PID ${pid}） ${mem} GB`,
  noProcess: '无 GPU 进程',
  cpuBusy: '占用',
  load: '负载',
  cores: n => `${n} 核`,
  loadTrend: (a, b) => `（5 分钟：${a} · 15 分钟：${b}）`,
  available: '可用',
  of: t => `/ 共 ${t} GB`,
  used: u => `已用 ${u} GB`,
  swapNone: '未配置交换空间',
  swap: (u, t) => `交换空间 ${u} / ${t} GB`,
  disk: '磁盘',
  diskFree: f => `可用 ${f} GB`,
}

const TABLES: Record<Lang, Strings> = { en, fr, ja, zh }

export function strings(lang: unknown): Strings {
  return TABLES[(LANGS as readonly unknown[]).includes(lang) ? (lang as Lang) : 'en']
}
