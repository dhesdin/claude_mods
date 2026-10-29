# Mod 02: sysmon

## Problem
Know at a glance whether the machine is free and what is loading it: before starting a training run, during inference, or when the fan spins up.

## Display
A "Machine" pane (opened at start or with `/sysmon`, closed by the same command), one framed card per resource, every value named:

```
╭──────────────────────────────────────────────────────╮
│ GPU  RTX 4070                                         │
│ Utilization 87%                                       │
│ VRAM 11.0 / 12.0 GB used · 1.0 GB free                │
│ Temperature 71 °C · Power 182 / 220 W                 │
│ Throttling thermal (GPU too hot)                      │
│ process: python3 (PID 4821)  9.1 GB                   │
╰──────────────────────────────────────────────────────╯
╭──────────────────────────────────────────────────────╮
│ CPU  busy 34%                                         │
│ Load 2.1 / 8 cores (5 min: 1.8 · 15 min: 1.5)         │
╰──────────────────────────────────────────────────────╯
╭──────────────────────────────────────────────────────╮
│ RAM  available 8.0 GB of 15.2 GB                      │
│ used 7.2 GB · swap not configured                     │
╰──────────────────────────────────────────────────────╯
╭──────────────────────────────────────────────────────╮
│ Disk /  166.2 GB free of 385.2 GB                     │
╰──────────────────────────────────────────────────────╯
```

Without a supported GPU: the GPU card shows "No supported GPU" or is hidden (config). No error.

## Data
| Resource | Fields | Source |
|---|---|---|
| GPU, NVIDIA | utilization, VRAM used/total/free, power/limit (W), temperature, throttling | `nvidia-smi --query-gpu=...,clocks_throttle_reasons.active --format=csv,noheader,nounits` |
| GPU processes, NVIDIA | name, PID, VRAM per process | `nvidia-smi --query-compute-apps=...` |
| GPU, Jetson **[to validate]** | utilization (GR3D_FREQ), shared memory, GPU temperature, total input power | `tegrastats`, `/proc/device-tree/model` |
| GPU, AMD **[to validate]** | utilization, VRAM, edge temperature, power/limit | `rocm-smi ... --json` |
| CPU | busy % (difference between two reads), core count, load 1/5/15 min | `/proc/stat`, `/proc/loadavg` |
| RAM | available (MemAvailable), used = total - available, swap used/total | `/proc/meminfo` |
| Disk | free space / size per mount point | `df -B1 --output=target,size,avail` |

- Two `nvidia-smi` calls per cycle, run in parallel: nvidia-smi cannot return GPU state and process list in one query. Each query takes all its fields at once.
- The throttle field was renamed on some drivers: if refused, the query is retried without it and the Throttling line disappears.
- GPU source: `gpuBackend` = `auto` detects Jetson (device-tree model), then NVIDIA (`nvidia-smi -L`), then AMD (`rocm-smi --showid`), once per pane opening.
- Disk measured less often (60 s by default): it moves slowly.
- Text from other programs (process names, GPU names, mount points) is cleaned of control characters and length-capped before display or before reaching the model.

## Visual thresholds
- Common scale with usage-pace (white < 50%, yellow 50-75, orange 75-90, red ≥ 90) for GPU utilization, GPU memory, CPU, load (against the core count), RAM used, disk used.
- Red alert (value + card border): GPU memory > threshold, GPU temperature > threshold, swap > 0 while a process runs on the GPU, disk below the free-space threshold.
- Throttling, always written out: thermal or hardware in red ("thermal (GPU too hot)"), power limit alone in orange ("power limit (max power draw reached)").

## Refresh
- 3 s by default while the pane is open and in front; nothing is measured while it is closed.
- GPU tool not installed: not started again until the pane is reopened.

## `machine_status` tool
Exposed to Claude (`mcp__sysmon__machine_status`, deferred behind ToolSearch): the same summary in one English sentence. Costs tokens only when Claude calls it. Names in the result are quoted and described as data, not instructions.

## Config
`language` (en), `gpuBackend` (auto), `intervalSeconds` (3), `vramAlertPercent` (90), `tempAlertC` (80), `hideMissingGpu` (false), `gpuIndex` (0), `openOnStart` (true), `diskPaths` ("/,/home"), `diskIntervalSeconds` (60), `diskAlertGb` (20).

## Out of scope
- Consumption history and charts.
- Intel GPUs, macOS, Windows native: see docs/hardware.md.
- Watching another computer over the network (zero-network rule).
- **Inference benchmarks (FPS, latency, CPU/GPU/TensorRT comparison)**: measured reproducibly in the project's own code, not in a display mod.
