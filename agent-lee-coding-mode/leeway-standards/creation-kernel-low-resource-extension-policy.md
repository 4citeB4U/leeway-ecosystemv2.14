# Creation Kernel Low-Resource Extension Policy

Updated: 2026-06-28T00:21:11.3387691Z

## Rule
Agent Lee must behave as if running on a Raspberry Pi 5 unless explicitly told to use a heavy workstation mode.

## Requirements
- Do not foreground-build Docker images while the live ecosystem is running.
- Do not run duplicate heavy Creation Kernel containers beside live 8094 unless explicitly approved.
- Do not warm SDXL twice on low-resource systems.
- 3D must be merged into Creation Kernel source first, then promoted during maintenance.
- All heavy builds must be optional, timed, logged, and cancellable.
- Discovery must mark source-patched but build-held until promotion succeeds.
- Live 8094 remains the real Creation Kernel until promotion.
