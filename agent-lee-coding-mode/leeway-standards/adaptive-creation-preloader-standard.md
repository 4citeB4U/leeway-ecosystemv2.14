# Adaptive Creation Preloader Standard

Updated: 2026-06-28T00:29:40.6447037Z

## Purpose
The Creation Kernel should behave like a warm Llama/Ollama model during active creative sessions.

## Modes
- IDLE_STANDBY: Service remains ready, model may be unloaded.
- PRELOAD_NEXT_IMAGE: Warm model before expected image request.
- HOT_CREATION_MODE: Keep model warm during active package creation.

## Speed Truth
Under-one-second cold SDXL loading is not guaranteed on CPU. The way to feel instant is to prewarm before the user submits the final image request.

## Package Rule
Agent Lee must create the package shell, tags, metadata, receipts, prompt record, and document structure immediately while image rendering runs.

## Guardrails
- No duplicate Creation Kernel.
- No foreground Docker build.
- No second SDXL warmup.
- No fake READY.
- 3D remains held until maintenance promotion.
