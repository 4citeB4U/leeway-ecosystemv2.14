# Next Low-Resource Creation Kernel 3D Promotion Plan

Do not run another foreground Docker build while the full ecosystem is live.

## Current state
- Live Creation Kernel remains on 8094.
- 3D source extension is patched into the Creation Kernel source: True
- Build/promotion is held because V13.2 froze during Docker build.

## Correct next step
Use a separate maintenance window:
1. Confirm Seafile, Voice, Vision, Creation, and Runtime Fabric are healthy.
2. Stop only optional staged build attempts, not live containers.
3. Build with timeout and low priority.
4. Do not warm SDXL twice.
5. Promote only after staged health proves routes.

## Raspberry Pi 5 rule
- No duplicate heavy creation container.
- No heavy foreground build.
- No full model warmup during infrastructure proof.
- Discovery must report HOLD until promotion.
