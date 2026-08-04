# Agent Lee Service Installation Guide

## Overview

The Agent Lee Windows Service provides runtime persistence, allowing Agent Lee to automatically start when the system boots and run continuously in the background.

## Prerequisites

- Windows operating system
- Python installed with pywin32 package
- Administrator privileges

## Installation Steps

### Step 1: Open PowerShell as Administrator

1. Press `Windows + X`
2. Select "Windows PowerShell (Admin)" or "Terminal (Admin)"
3. Click "Yes" when prompted by User Account Control

### Step 2: Navigate to Workspace

```powershell
cd "E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4"
```

### Step 3: Run Installation Script

```powershell
.\scripts\install-agent-lee-service.ps1
```

The script will:
- Check for Administrator privileges
- Install pywin32 if needed
- Install the Agent Lee service
- Configure automatic startup
- Start the service

### Step 4: Verify Installation

After installation, verify the service is running:

```powershell
Get-Service -Name "AgentLee"
```

Expected output:
```
Status   Name               DisplayName
------   ----               -----------
Running  AgentLee           Agent Lee Autonomous Runtime
```

### Step 5: Re-run Certification

After service installation, re-run the certification suite:

```powershell
.\scripts\certify-agent-lee.ps1
```

## Service Management

### Check Service Status

```powershell
Get-Service -Name "AgentLee"
```

### Start Service

```powershell
Start-Service -Name "AgentLee"
```

### Stop Service

```powershell
Stop-Service -Name "AgentLee"
```

### Restart Service

```powershell
Restart-Service -Name "AgentLee"
```

### Uninstall Service

```powershell
cd "E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4"
python agent-lee-coding-mode\runtime\agent-lee-service.py remove
```

## Service Logs

Service logs and receipts are written to:

```
Archive\receipts\service-logs\
```

## Troubleshooting

### Service Won't Start

1. Check service logs in `Archive\receipts\service-logs\`
2. Verify Python is in system PATH
3. Verify pywin32 is installed: `python -c "import win32serviceutil"`
4. Check Windows Event Viewer for service errors

### Permission Errors

Ensure you're running PowerShell as Administrator when installing or managing the service.

### Service Not Found After Installation

Wait a few seconds after installation, then check again. If still not found, try reinstalling.

## Current Status

To check if the service is installed without Administrator privileges:

```powershell
Get-Service -Name "AgentLee" -ErrorAction SilentlyContinue
```

If this returns nothing, the service is not installed.