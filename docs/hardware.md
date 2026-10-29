# Hardware: preparing a machine for sysmon

How to set up any machine (laptop, GPU workstation, robot computer) so `sysmon` sees it, and what it will show. **[to validate]** marks support written from official documentation and recorded output formats, not yet checked on the real hardware: see the checklists at the end.

## Start here: your machine in one table

Run `make doctor` first: it detects most of this for you.

| Machine | What to do | What sysmon shows |
| --- | --- | --- |
| Linux, no dedicated GPU (laptop) | nothing | CPU, RAM, disk; GPU card "No supported GPU" (hide it with `hideMissingGpu`) |
| Linux + NVIDIA GPU | install the NVIDIA driver ([below](#linux-pc-or-laptop-with-an-nvidia-gpu)), check `nvidia-smi` | everything, GPU included |
| WSL2 + NVIDIA GPU | Windows NVIDIA driver only ([below](#wsl2-windows)) | everything (RAM = what WSL gets) |
| NVIDIA Jetson | nothing (tegrastats ships with JetPack) | everything, GPU memory shared with RAM **[to validate]** |
| Linux + AMD GPU | install ROCm, check `rocm-smi` | GPU utilization, VRAM, temperature, power **[to validate]** |
| Raspberry Pi | nothing | CPU, RAM, disk; no GPU card |
| Linux + Intel GPU only | nothing | CPU, RAM, disk; Intel GPU not supported |
| macOS, Windows native | nothing (use WSL2 on Windows) | sysmon shows `n/a`; the other mods work |

The other mods (usage-pace, teacher-guard, langmod) need nothing from the hardware.

## What sysmon reads

| Source | Gives | Available on | Status |
| --- | --- | --- | --- |
| `/proc/stat`, `/proc/loadavg` | CPU busy %, core count, load | every Linux: PC, laptop, WSL2, Jetson, Raspberry Pi | validated (laptop) |
| `/proc/meminfo` | RAM available / used, swap | every Linux | validated (laptop) |
| `df` | free disk space | every Linux (coreutils) | validated (laptop) |
| `nvidia-smi` | NVIDIA GPU: utilization, VRAM, temperature, power, throttling, processes | Linux with an NVIDIA GPU and the proprietary driver; WSL2 with the Windows driver | parsers tested on recorded output; **[to validate]** on a real GPU |
| `tegrastats` | Jetson GPU: utilization, shared memory, temperature, input power | NVIDIA Jetson (JetPack / L4T) | **[to validate]** |
| `rocm-smi` | AMD GPU: utilization, VRAM, temperature, power | Linux with ROCm | **[to validate]** |

`gpuBackend = auto` (default) tries Jetson (`/proc/device-tree/model`), then `nvidia-smi -L`, then `rocm-smi --showid`, once each time the pane opens. Force a source with `gpuBackend = nvidia | jetson | amd | none`.

No `/proc` on macOS or native Windows: sysmon shows `n/a` there.

## One-minute machine check

`make doctor` (or `scripts/doctor.sh`) does all of this and says what to do next. By hand:

```bash
cat /etc/os-release | head -2        # distribution
uname -m                             # x86_64 (PC) or aarch64 (Jetson, Raspberry Pi, ARM)
nproc                                # logical cores
lspci | grep -iE 'vga|3d|display'    # graphics cards (PC)
nvidia-smi -L                        # NVIDIA GPUs and their index (gpuIndex option)
cat /proc/device-tree/model; echo    # board name on Jetson / Raspberry Pi
head -3 /proc/meminfo                # total, free, available RAM
df -h / /home                        # disks
```

## Per machine

### Linux laptop or PC without a supported GPU
Nothing to install. The GPU card shows "No supported GPU"; set `hideMissingGpu = true` to hide it, or `gpuBackend = none` to never look.

### Linux PC or laptop with an NVIDIA GPU
`nvidia-smi` ships with the proprietary NVIDIA driver: installing the driver is enough.

| Distribution | Commands |
| --- | --- |
| Ubuntu, Linux Mint | `ubuntu-drivers devices` (recommended driver), then `sudo ubuntu-drivers install` or `sudo apt install nvidia-driver-<version>`; on Mint the Driver Manager does the same. `nvidia-smi` comes from `nvidia-utils-<version>`, installed with it. |
| Debian | enable `contrib non-free non-free-firmware`, then `sudo apt install nvidia-driver nvidia-smi` |
| Fedora | enable RPM Fusion, then `sudo dnf install akmod-nvidia xorg-x11-drv-nvidia-cuda` (the latter provides `nvidia-smi`) |
| Arch | `sudo pacman -S nvidia nvidia-utils` (or `nvidia-open` on recent cards) |

Reboot, then check `nvidia-smi`.

- **Secure Boot**: the driver may ask to enroll a key (blue "MOK" screen at reboot); otherwise it does not load.
- **Several GPUs**: `nvidia-smi -L` gives the indexes; set `gpuIndex`.
- **Hybrid laptop (Intel/AMD + NVIDIA)**: querying `nvidia-smi` wakes the NVIDIA GPU and keeps it from sleeping, which costs battery. On battery: close the pane (`/sysmon`) or raise `intervalSeconds`.
- **Docker**: GPU containers go through the NVIDIA Container Toolkit (`docker run --gpus all ...`). sysmon runs on the host and sees every GPU process, containers included.

### WSL2 (Windows)
- Install **only the Windows NVIDIA driver**; never install a Linux NVIDIA driver inside WSL.
- `nvidia-smi` is provided by Windows in `/usr/lib/wsl/lib/`; `which nvidia-smi` must find it.
- `/proc` works: values are those of the WSL virtual machine (the RAM given to WSL, not the whole PC).

### NVIDIA Jetson (Orin Nano, Orin NX, AGX Orin): the usual robotics computer — [to validate]
Linux `aarch64` with JetPack (L4T). CPU, RAM and disk work as on any Linux.

GPU through `tegrastats` (preinstalled). What differs from a PC:
- **Unified memory**: CPU and GPU share the same RAM; there is no separate VRAM. The GPU card shows "Shared memory (CPU + GPU)", which is the room left for a model.
- `nvidia-smi` is missing or very limited depending on the JetPack version; `auto` therefore checks for a Jetson first.
- No per-process GPU memory and no throttle reasons: those lines are not shown.
- Power is the board's total input (`VDD_IN`, `VIN_SYS_5V0` or `POM_5V_IN` depending on the module), with no limit shown.

Useful commands:

```bash
tegrastats --interval 1000              # what sysmon parses (some fields may need sudo)
sudo pip3 install -U jetson-stats        # jtop + Python API, then reboot
jtop
cat /sys/class/thermal/thermal_zone*/type   # temperature sensor names
cat /sys/class/thermal/thermal_zone*/temp   # values in thousandths of °C
sudo nvpmodel -q                         # active power mode (changes performance)
sudo jetson_clocks --show                # current clocks
```

For reproducible performance measurements, record the `nvpmodel` mode and the `jetson_clocks` state: the same network runs at very different speeds across modes. Check that Claude Code installs on the board (Linux arm64): sysmon only sees the machine Claude Code runs on.

### AMD GPU — [to validate]
Install ROCm (AMD's instructions for your distribution), then check `rocm-smi`. sysmon runs `rocm-smi --showproductname --showuse --showmeminfo vram --showtemp --showpower --showmaxpower --json` and reads `card<gpuIndex>`. No per-process memory and no throttle reasons. Recent ROCm releases also ship `amd-smi`; sysmon uses `rocm-smi` only.

### Raspberry Pi
CPU, RAM and disk work. No CUDA GPU; temperature and throttling are **not implemented**:

```bash
vcgencmd measure_temp      # SoC temperature
vcgencmd get_throttled     # throttling and under-voltage (0x0 = no problem)
```

### Intel GPU
**Not implemented.** `sudo apt install intel-gpu-tools`, then `sudo intel_gpu_top` (needs root).

### macOS
**Not implemented.** No `/proc`, no `nvidia-smi`. Possible sources: `sysctl -n hw.ncpu hw.memsize vm.loadavg`, `vm_stat`, `df`, and for Apple Silicon `sudo powermetrics --samplers gpu_power` (needs root).

### Windows native
Not supported: use WSL2.

### Robot with several computers
A humanoid often has several computers (real-time motor control on one, perception on a Jetson or GPU PC on another). sysmon watches only the machine where Claude Code runs and makes no network request: watching another computer remotely (SSH, ROS) is out of scope.

## Adapting sysmon to new hardware

GPU sources live in `plugins/sysmon/hooks/gpu.ts`, one section each (`parseNvidia`/`sampleNvidia`, `parseTegrastats`/`sampleJetson`, `parseRocmSmi`/`sampleAmd`), all returning the `Gpu` type of `plugins/sysmon/types/index.d.ts`.

1. Record the tool's real output on the machine.
2. Write a pure parser returning `Gpu`, and a test feeding it the recorded output (`plugins/sysmon/tests/sysmon.test.tsx`).
3. Write the sampler through the `Io` object (`io.run`, `io.spawn`, `io.read`): a mod has no direct system access.
4. Add the source to `GpuKind`, to `detectGpu` and to the `gpuBackend` options in `plugin.json`.
5. Clean any text coming from the tool with `clean()` (util.ts) before it is displayed or sent to the model.
6. `scripts/check.sh sysmon`, `--update-surface sysmon` if a new `$` call was needed, then check on screen.

A tool that never exits (like `tegrastats`) is read with `io.spawn` and closed after the first line (`firstLine` in gpu.ts).

## Validation checklists

### NVIDIA workstation
1. `nvidia-smi --query-gpu=uuid,name,utilization.gpu,memory.used,memory.total,power.draw,power.limit,temperature.gpu,clocks_throttle_reasons.active --format=csv,noheader,nounits` prints one line per GPU. A field printing `[N/A]` or `[Not Supported]` shows as `n/a` (normal on some cards).
2. If that command refuses `clocks_throttle_reasons.active` (renamed on some drivers), the Throttling line disappears: note the accepted name (`nvidia-smi --help-query-gpu | grep -i reasons`).
3. `nvidia-smi --query-compute-apps=gpu_uuid,pid,process_name,used_memory --format=csv,noheader,nounits` while a PyTorch script runs: the process appears in the GPU card.
4. `/sysmon`: GPU name, utilization, VRAM used / total + free, temperature, power / limit, Throttling line.
5. Under load (short training run): VRAM > 90% or temperature > 80 °C turns the card red; throttling reads "thermal (GPU too hot)" in red or "power limit (max power draw reached)" in orange.
6. Several GPUs: set `gpuIndex` and check the card follows the right one.
7. Ask Claude to call `machine_status`: the sentence carries the same values as the pane.

### Jetson
1. `tegrastats --interval 1000` without sudo prints lines with `RAM`, `GR3D_FREQ`, a `gpu@`/`GPU@` temperature and an input power rail. Paste one line in an issue or in `plugins/sysmon/tests/sysmon.test.tsx` if the card shows `n/a` or an error.
2. `cat /proc/device-tree/model` names the board; the GPU card title shows it.
3. With a model loaded, "Shared memory" grows and RAM "available" shrinks by about the same amount.
4. `gpuBackend = auto` picks `jetson` (not `nvidia`).

### AMD
1. `rocm-smi --showproductname --showuse --showmeminfo vram --showtemp --showpower --showmaxpower --json` prints a `card0` object. If a value shows `n/a`, note the key names actually printed: `parseRocmSmi` matches them by pattern.
2. `/sysmon`: name, utilization, VRAM, temperature, power / limit.

When a checklist passes, remove the matching **[to validate]** marks in this file, in `docs/specs/02-sysmon.md` and in `plugins/sysmon/README.md`.
