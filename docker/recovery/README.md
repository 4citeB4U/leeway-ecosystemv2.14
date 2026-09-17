# Recovery boundary

These scripts preserve and recreate container configuration. They do not certify business workflows, repair missing bind sources, or restore application data from Git.

## Preserved stopped containers

The workstation backup is under the verified root at `Archive/backups/stopped-docker-20260916-154303`.

- `configuration.dpapi.bin`: full original Docker inspection data, protected with Windows DPAPI CurrentUser. Recovery requires the original Windows identity/profile or a separately managed secure export.
- `snapshots.tar`: 44 image snapshots, SHA-256 `072A3ACF8F52E49A322B2B58AD80E960B9038E993081F1572F9ADA8AE9F23D3B`.
- Eight `*.rootfs.tar` fallback exports: individual hashes and imported snapshot identities are recorded in `preservation-manifest.json`.
- Original container logs, mount references, archive reload results and isolated recreation results remain beside the backup.
- Original named and anonymous data volumes were retained. Bind-mounted files stay on their original host locations. Image archives and filesystem exports do not contain mounted volume data.

## Preview and recreate

Load the verified image archive, or import the exact fallback export named by the recovery record, if its snapshot image is no longer present. Verify image identity against the manifest. Never substitute an empty data volume.

Use the complete original container ID from `evidence/retired-containers.json`:

```powershell
$backup = Join-Path $env:LEEWAY_ROOT 'Archive\backups\stopped-docker-20260916-154303'
.\Restore-LeeWayPreservedDocker-v1.ps1 -BackupRoot $backup -ContainerId '<full original ID>'
.\Restore-LeeWayPreservedDocker-v1.ps1 -BackupRoot $backup -ContainerId '<full original ID>' -Create
```

The first command previews. The second creates but does not start the original configuration. Resolve missing historical host bindings, inspect secrets and port ownership, and verify data identity before starting it.

The 52 automated recovery checks used `-IsolatedValidation`: no network, no original host mounts and no process start. They prove image/container creation, not full original-volume attachment or successful application recovery.

## Other cutovers

Capability-center rollback images, protected original configuration, registry data and logs are in `Archive/backups/docker-centers-20260916-153707`.
Skills rollback image, protected configuration and state copies are in `Archive/backups/skills-cutover-20260916-155520`.
The old Ollama archive and model verification evidence are in `Archive/backups/bounded-runtime-retirement-20260916-160111`; model data stayed in the shared original volume.

These maintenance scripts are dated execution records, not idempotent installers. Do not rerun cutover or retirement scripts indiscriminately. Resume only from verified receipts and exact object identities.
