# sysmon

"Machine" panel, one framed card per resource, opened at start or with `/sysmon` (the same command closes it):

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
│ mostly firefox 3.1 GB · code 1.8 GB · claude 0.9 GB   │
╰──────────────────────────────────────────────────────╯
╭──────────────────────────────────────────────────────╮
│ Disk /  166.2 GB free of 385.2 GB                     │
╰──────────────────────────────────────────────────────╯
```

## Reading it

- **CPU busy**: share of the last interval the processor spent working, all cores together.
- **Load**: average number of programs running or waiting for the processor over the last minute, shown against the core count (load = cores: processor full; above: programs queue). In parentheses, the same average over 5 and 15 minutes, to see the trend.
- **RAM available**: what a new program can still take. **Swap**: disk used as emergency RAM, very slow; red when used while a process runs on the GPU.
- **Throttling**: the GPU lowers its clock; speed measurements are then wrong. Always written out: "thermal (GPU too hot)" in red, "power limit (max power draw reached)" in orange.
- Red alert (value + card border): GPU memory > threshold, temperature > threshold, swap during GPU work, disk below threshold.

## GPU sources

| Source | Status |
| --- | --- |
| NVIDIA (`nvidia-smi`) | parsers tested on recorded output; check on a real GPU with [the checklist](../../docs/hardware.md#nvidia-workstation) |
| Jetson (`tegrastats`) | **[to validate]** |
| AMD (`rocm-smi`) | **[to validate]** |

Machine setup per hardware: [docs/hardware.md](../../docs/hardware.md).

## `machine_status` tool

Claude can call `mcp__sysmon__machine_status` to get the same summary as one English sentence (for example before starting a training run). The tool is deferred behind ToolSearch: it costs tokens only when called.

## What it does on your machine

Everything stays on the machine: the mod makes no network request and reads no credential.

| What | Why |
| --- | --- |
| Runs `nvidia-smi` (`-L`, `--query-gpu`, `--query-compute-apps`) | NVIDIA GPU utilization, memory, temperature, power, throttling, processes |
| Runs `tegrastats --interval 200`, reads its first line, then stops it | Jetson GPU figures |
| Runs `rocm-smi` (`--showid`, then the query listed in docs/hardware.md, `--json`) | AMD GPU figures |
| Runs `df -B1 --output=target,size,avail -- <diskPaths>` | free disk space of the paths you configure |
| Runs `ps -eo rss=,comm=`, every 15 s | the 3 programs using the most RAM (all their processes added up) |
| Reads `/proc/stat`, `/proc/loadavg`, `/proc/meminfo`, `/proc/device-tree/model` | CPU, load, RAM, board name |

Programs run with fixed arguments (never a shell), only while the panel is open, and only the GPU tool that exists on the machine.

The only data that leaves the mod is the `machine_status` tool's answer, a one-sentence summary of the figures above, which goes to Claude when Claude calls the tool. The mod's `tool.call` hook answers that tool only; it does not see or change other tool calls.

## Cost

Measures only while the panel is open and in front: nothing runs while it is closed. Disk every 60 s. A GPU tool that is not installed is not started again until the panel is reopened.

## Options (`/config`, or `scripts/configure.sh sysmon key=value`)

| Option | Default | Role |
| --- | --- | --- |
| `language` | `en` | `en`, `fr`, `ja`, `zh` (or `/langmod`) |
| `gpuBackend` | `auto` | `auto`, `nvidia`, `jetson`, `amd`, `none` |
| `intervalSeconds` | 3 | measurement period while visible |
| `vramAlertPercent` | 90 | GPU memory alert |
| `tempAlertC` | 80 | GPU temperature alert |
| `hideMissingGpu` | false | hide the GPU card without a supported GPU |
| `gpuIndex` | 0 | GPU to follow on a multi-GPU machine |
| `openOnStart` | true | open the panel in every session |
| `diskPaths` | `/,/home` | disks to watch (comma-separated) |
| `diskIntervalSeconds` | 60 | disk measurement period |
| `diskAlertGb` | 20 | alert below this free space |

An unrequested panel opens from 144 terminal columns; narrower, `/sysmon` opens it anyway.

## Disable

`claude plugin disable sysmon@claude-mods`

Spec: [docs/specs/02-sysmon.md](../../docs/specs/02-sysmon.md)
