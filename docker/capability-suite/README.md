## Current checkpoint: September 17
43 running, zero stopped. Storage repaired and eight-to-one consolidation deployed. See [current status](../CURRENT_STATUS.md), [43-container inventory](../CONTAINER_CONTENTS.md), and [live evidence](../evidence/consolidation-live-20260917.json). Earlier sections below describe prior checkpoints.

# LeeWay capability suite - verified candidate, not deployed

One Python server hosts eight separately configured work-order modules: phone, email, calendar, browser, desktop, license, installer and PWA. Routing uses the local listening port, so a Host header cannot select another module. Each module has its own state and receipt directory.

The original eight applications have matching executable source after their service-name constant is normalized. The generated application factory preserves their work-order behavior and adds a storage-aware health check. It returns HTTP 503 when its state or receipt directory is unavailable.

This does not add real phone/email/browser/device providers. It consolidates the existing work-order functions.

## Verified

Fresh Docker build; all eight identities and status interfaces; invalid payload rejection; Host-header routing isolation; work-order and receipt ownership; persistence after a restart; storage-failure HTTP 503; aggregate health; one Python server process. Tests used isolated empty fixtures. See candidate-verification.json.

The temporary candidate and its generated fixture volumes were removed after verification. No production containers were replaced and no historical data was deleted.

## Deployment gate

Production promotion is blocked by inaccessible original E: bind mounts and stale D: sharing in Docker Desktop. Empty canonical state directories are not proof that the old history was empty. Data-custody evidence must be reconciled before restoring state or explicitly approving a fresh start.

compose.json uses the data-custody-verified profile and refuses to auto-create missing bind sources. Before deliberate deployment, restore the eight state/receipt directories, provide the private configuration/lanes.json, and repair Docker's access to those paths. lanes.example.json documents the format; it is not a recovered production configuration.

The saved PowerShell preparation and test scripts are diagnostic operator records, not a production cutover script. Do not run docker compose against the legacy ports while the eight originals still own them.

The source image remains available as leeway-capability-suite:20260917. Legacy ports and aliases are represented in compose.json. Source provenance and the explicit data boundary are recorded alongside this file.

