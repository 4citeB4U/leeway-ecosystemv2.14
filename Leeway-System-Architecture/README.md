# Leeway System Architecture

**Version:** 1.0.0  
**Created:** 2026-06-20  
**Authority:** Leonard Lee (Creator)

## Overview

The Leeway System Architecture provides a unified integration layer that connects external system directories (Governor, Logs, Scripts) with the Agent Lee ecosystem and Archive structure.

## Purpose

This architecture solves the problem of having critical system components scattered across different locations by creating a single, organized integration point that:

- ✅ Connects external directories to the workspace
- ✅ Integrates with the Archive (receipts, ledgers, manifests, runtime-state)
- ✅ Provides a clean bridge for Agent Lee to access system resources
- ✅ Maintains proper data custody and audit trails

## Directory Structure

```
Leeway-System-Architecture/
├── README.md                          # This file
├── Quick-Integration-Setup.ps1        # One-command setup script
├── System-Integration-Bridge.ps1      # Advanced integration tool
├── integration-manifest.json          # Integration configuration
├── governor/                          # Bridge to Governor
├── logs/                              # Bridge to Logs
└── scripts/                           # Bridge to Scripts
```

## External Directories

These directories exist outside the workspace:

### C:\Users\Leona\Leeway-System-Governor
- **Purpose:** Enterprise Runtime Governor (single control plane)
- **Contains:** Run-Governor.ps1, START-GOVERNOR.bat
- **Function:** Monitors system health, manages resources, provides safe remediation

### C:\Users\Leona\Leeway-System-Logs
- **Purpose:** Centralized system logs and audit trails
- **Contains:** All system operation logs, audit logs, diagnostic logs
- **Function:** Provides historical record of system operations

### C:\Users\Leona\Leeway-System-PowerShell-Scripts
- **Purpose:** PowerShell execution layer scripts
- **Contains:** Execution scripts, launchers, utilities
- **Function:** Provides standardized script execution environment

## Archive Integration

The system integrates with the workspace Archive structure:

```
Archive/
├── receipts/system-integration/       # Integration operation receipts
├── ledgers/system-integration/        # System integration ledgers
├── manifests/system/                  # System manifests
└── runtime-state/system-governor/     # Governor runtime state snapshots
```

## Quick Start

### Initial Setup

Run the quick integration setup:

```powershell
cd "e:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\Leeway-System-Architecture"
powershell -ExecutionPolicy Bypass -File ".\Quick-Integration-Setup.ps1"
```

This will:
1. Create all Archive integration points
2. Create bridge directory structure
3. Create external directories if missing
4. Generate integration manifest
5. Write setup receipt

### Start the Governor

After setup, start the Enterprise Runtime Governor:

```powershell
cd "C:\Users\Leona\Leeway-System-Governor"
.\START-GOVERNOR.bat
```

The Governor will:
- Monitor CPU, RAM, disk usage every 15 seconds
- Alert on threshold violations
- Perform safe remediation (temp cleanup)
- Write state to JSON feeds for Agent Lee

### Monitor Logs

View system logs:

```powershell
cd "C:\Users\Leona\Leeway-System-Logs"
Get-ChildItem | Sort-Object LastWriteTime -Descending | Select-Object -First 10
```

## Integration Manifest

The `integration-manifest.json` file contains:

```json
{
  "version": "1.0.0",
  "created": "2026-06-20T...",
  "externalDirectories": {
    "governor": "C:\\Users\\Leona\\Leeway-System-Governor",
    "logs": "C:\\Users\\Leona\\Leeway-System-Logs",
    "scripts": "C:\\Users\\Leona\\Leeway-System-PowerShell-Scripts"
  },
  "bridgeRoot": "e:\\.LeeWay-Produucts-File\\Leeway-Ecosystem v2.1.4\\Leeway-System-Architecture",
  "archiveRoot": "e:\\.LeeWay-Produucts-File\\Leeway-Ecosystem v2.1.4\\Archive"
}
```

## Data Flow

### Governor → Archive
```
External Governor runs
  → Collects system state
  → Writes governor_state.json
  → Writes agent_lee_feed.json
  → Logs to Leeway-System-Logs
  → State snapshots → Archive/runtime-state/system-governor/
```

### Logs → Archive
```
System operations
  → Write to Leeway-System-Logs
  → Important events → Archive/receipts/system-integration/
  → Audit trails → Archive/ledgers/system-integration/
```

### Scripts → Execution
```
PowerShell scripts in Leeway-System-PowerShell-Scripts
  → Launched via standardized execution layer
  → Logs → Leeway-System-Logs
  → Receipts → Archive/receipts/
```

## Agent Lee Integration

Agent Lee can access system resources through this architecture:

### Read Governor State
```powershell
$state = Get-Content "C:\Users\Leona\Leeway-System-Logs\governor_state.json" | ConvertFrom-Json
$state.CPU
$state.FreeRAM_MB
```

### Read Agent Feed
```powershell
$feed = Get-Content "C:\Users\Leona\Leeway-System-Logs\agent_lee_feed.json" | ConvertFrom-Json
$feed.state  # OK or WARN
$feed.alerts # Array of alert strings
```

### Access Logs
```powershell
$logs = Get-ChildItem "C:\Users\Leona\Leeway-System-Logs" -Filter "*.log"
```

## Receipts

All integration operations write receipts to:
```
Archive/receipts/system-integration/
```

Receipt schema:
```json
{
  "schema": "leeway-system-integration-receipt-v1",
  "timestamp": "2026-06-20T...",
  "action": "quick-integration-setup",
  "status": "OK",
  "manifestPath": "..."
}
```

## Maintenance

### Check Integration Status

```powershell
cd "e:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\Leeway-System-Architecture"
powershell -ExecutionPolicy Bypass -File ".\System-Integration-Bridge.ps1" -Status
```

### Validate Integration

```powershell
powershell -ExecutionPolicy Bypass -File ".\System-Integration-Bridge.ps1" -Validate
```

### Re-run Setup

If directories are missing or corrupted:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Quick-Integration-Setup.ps1"
```

## Troubleshooting

### Governor Not Running

Check if the Governor is running:
```powershell
Get-Process | Where-Object {$_.Path -like "*Leeway-System-Governor*"}
```

Start it:
```powershell
cd "C:\Users\Leona\Leeway-System-Governor"
.\START-GOVERNOR.bat
```

### Logs Not Appearing

Check log directory exists:
```powershell
Test-Path "C:\Users\Leona\Leeway-System-Logs"
```

Check permissions:
```powershell
Get-Acl "C:\Users\Leona\Leeway-System-Logs"
```

### Integration Manifest Missing

Re-run setup:
```powershell
cd "e:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\Leeway-System-Architecture"
powershell -ExecutionPolicy Bypass -File ".\Quick-Integration-Setup.ps1"
```

## Architecture Principles

### 1. Single Control Plane
The Governor is the single authority for system monitoring and remediation. No duplicate monitors.

### 2. Data Custody
All operational data flows through Archive structure for proper custody and audit trails.

### 3. Receipt-Backed Operations
Every significant operation writes a receipt for audit and recovery.

### 4. External Directory Respect
External directories (Governor, Logs, Scripts) remain outside workspace but are properly integrated.

### 5. Agent Lee Integration
Agent Lee can access system state through well-defined JSON feeds and log files.

## Future Enhancements

Potential future additions:

- **Symbolic Links:** Create junction points for direct access (requires admin)
- **Real-time Monitoring:** WebSocket feed for live system state
- **Alert Routing:** Route Governor alerts to Agent Lee chat
- **Automated Remediation:** Expand safe action capabilities
- **Health Dashboard:** Web UI for system health visualization

## Related Documentation

- [AGENTS.md](../AGENTS.md) - Agent Lee operating standard
- [Archive/README.md](../Archive/README.md) - Archive structure
- [Archive/receipts/README.md](../Archive/receipts/README.md) - Receipt standard
- [Archive/ledgers/README.md](../Archive/ledgers/README.md) - Ledger standard
- [Archive/manifests/README.md](../Archive/manifests/README.md) - Manifest standard

## Support

For issues or questions:
1. Check receipts in `Archive/receipts/system-integration/`
2. Check logs in `C:\Users\Leona\Leeway-System-Logs`
3. Review integration manifest
4. Re-run Quick-Integration-Setup.ps1

---

**Created by:** Bob (AI Assistant)  
**For:** Leonard Lee  
**Date:** 2026-06-20  
**Version:** 1.0.0
