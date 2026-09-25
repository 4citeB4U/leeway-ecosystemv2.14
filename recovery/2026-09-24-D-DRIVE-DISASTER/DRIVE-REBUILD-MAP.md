# LeeWay Drive Reconstruction Map — Historical Authority Snapshot

Recovery branch: `recovery/d-drive-disaster-2026-09-24`

Purpose: preserve the last known topology before rebuilding the destroyed D: environment.
This file records **historical evidence**, not current host state. Current host state must be re-inventoried when Agent-Lee reconnects.

## 1. Last known canonical D topology

### Promoted canonical root
Observed historically:
- Logical root: `D:\LeeWay\Ecosystem`
- Target: `D:\LeeWay\Formula-Data-Fabric\Canonical-Shadow\E\Leeway-Ecosystem v2.1.4`
- Historical state: `PROMOTED ROOT — VERIFIED IDENTITY`
- Boundary: D-to-D junction; not a physical E dependency.

Do not recreate this junction until the destination payload is rebuilt and hash/provenance reconciliation passes.

### Separate D branch that was not merged
Observed historically:
- Source: `D:\Leeway-Ecosystem v2.1.4`
- Reconciliation destination: `D:\LeeWay\Formula-Data-Fabric\Pending-Reconciliation\D-Partial-Ecosystem-20260916`
- Historical state: `SEPARATE BRANCH — OPEN`
- Historical record: 518,062 files / 129.614 GB; merge was not complete.

Recovery rule: never mirror this historical branch over the canonical tree. Recovered objects require per-object KEEP / MERGE / HISTORICAL / RETIRED classification.

## 2. Formula-Data-Fabric authority

Known high-value historical path:
- `D:\LeeWay\Formula-Data-Fabric\production-v1\M4-R2`
- Historical state: contract verified; transformation open.
- Historical corpus contract recorded 5,522,067 canonical files and zero contract blockers.
- Resume only from recovered successor/checkpoint evidence; do not invent a terminal transform receipt.

Other D payload outside Formula-Data-Fabric:
- D-root projects
- HTML/app artifacts
- other physical files not yet proven admitted through the Formula path

Rule: physical placement on D: did not itself prove governance/admission.

## 3. C: dependencies that must be recovered or rebound

Historically active sources included:

- `C:\Users\Leona\AppData\Local\Docker\wsl\disk\docker_data.vhdx`
  - historical size: 392,664,449,024 bytes
  - Docker relocation was still open
- `C:\LeeWay-Storage-Science`
  - active Formula/storage-science source dependency
- `C:\LeeWay-Formula-Data-Fabric-Research-Bundle-v1.0.0`
  - research / skills / evidence custody
- `C:\LeeWay\Forgejo`
  - Forgejo data, credentials and MCP receipts historically C-backed
- `C:\LeeWay\BitwardenLite`
  - security state / live bind
- `C:\Users\Leona\.jitsi-meet-cfg`
  - Jitsi web/bridge/conference/XMPP config
- `C:\Users\Leona\LeeWay-Runtime`
  - sensory/runtime state; ears audio/transcripts/operator inbox
- `C:\Users\Leona\Documents\LeeWay-D-Drive-Inventory`
  - inventory/Brain dependency
- `C:\LeeWay-RLS-HotCache`
  - cache/hot-tier policy dependency

Do not delete or retire any surviving C: copy until the corresponding D-side reconstruction is verified and consumers are rebound.

## 4. E: dependencies and lineage

Historical E roots:

- `E:\Leeway-Ecosystem v2.1.4`
  - physical source present after D promotion
- `E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4`
  - active runtime source
  - historical evidence reported ten services binding this tree

Other scoped E sources historically included custody, recovery, IDE, app-forge, n8n and related LeeWay data.

Rule: E: lineage must be compared and preserved before retirement. A D root marker never implied E data could be erased.

## 5. Surviving GitHub reconstruction authorities

Core recovery seed:
- `4citeB4U/leeway-ecosystemv2.14`

Independent authorities to restore into staging:
- `4citeB4U/LeeWay-Standards`
- `4citeB4U/Leeway-Runtime-Fabric`
- `4citeB4U/LeeWay-Agent-Skills`
  - required 238-skill ref: `feature/full-238-gateway-promotion`
- `4citeB4U/Leeway-formula-live`
- `4citeB4U/LEEWAY-VSCODE`
- `4citeB4U/LEEWAY-DEVICE-BRIDGE`
- `4citeB4U/LEEWAY-BRIDGE-`
- `4citeB4U/Leeway-live`
- `4citeB4U/agentleevoice`
- additional project repos must be classified after core recovery

## 6. Runtime reconstruction order

Rebuild by dependency, not by folder nostalgia:

1. Restore source authorities to an isolated staging root.
2. Recover local C:/E:/container/Forgejo evidence.
3. Reconcile Formula v1 hashes and recovery manifests.
4. Restore LeeWay Standards + Root of Trust.
5. Restore Runtime Fabric source and registries.
6. Restore Agent Lee + 238-skill authority.
7. Restore Veritas / receipt / Learning Ledger paths.
8. Restore Docker/Forgejo/service state with application-consistent backups.
9. Rebind runtime consumers using `<LEEWAY_ROOT>`.
10. Reconstruct the canonical shadow and aliases only after destination integrity passes.
11. Restore secondary projects and media assets.
12. Run service-specific acceptance tests.
13. Create a new disaster-recovery receipt only for actions actually executed.
14. Promote reconstructed state only after Veritas convergence.

## 7. Current disaster boundary

At creation of this map:
- Remote host inspection: BLOCKED — Agent-Lee device offline.
- D: current physical state: UNVERIFIED.
- C:/E: current survival state: UNVERIFIED.
- GitHub recovery branch: EXECUTED.
- Formula historical authority: DISCOVERED.
- Formula live execution: NOT_EXECUTED.
- Runtime recovery execution: BLOCKED until host connectivity returns.
- Veritas runtime acceptance: NOT_RUN.
