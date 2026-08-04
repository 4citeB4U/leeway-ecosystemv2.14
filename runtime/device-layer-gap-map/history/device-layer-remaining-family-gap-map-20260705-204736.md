# Leeway Device Layer Remaining Family Gap Map

Version: LEEWAY_DEVICE_LAYER_REMAINING_FAMILY_GAP_MAP_2026-07-05

Verdict: LEEWAY_DEVICE_LAYER_REMAINING_FAMILY_GAP_MAP_CREATED

Current truth: Windows control plane is complete. Full Device Layer is not complete yet.

Completed families: 1
Remaining families: 9

## Families

### windows
- Status: PROVEN_CONTROL_PLANE_READY_LOCKED_CLEAN
- Done: True
- Risk: medium
- Next script: none_required_for_windows_core

Remaining work:
- optional mouse-click lane
- optional hotkey lane
- optional screenshot/read-only lane
- optional shell allowlist lane

### iot
- Status: DISCOVERY_ROUTE_PRESENT_NOT_PROVEN
- Done: False
- Risk: high
- Next script: 214-iot-discovery-registry-contract-no-execute.ps1

Remaining work:
- normalize IoT registry schema
- create IoT approval policy
- separate read-only discovery from physical control
- add device capability map
- create no-execute approval lane
- prove lockback for any physical IoT command

### printers
- Status: DISCOVERY_ROUTE_PRESENT_NOT_PROVEN
- Done: False
- Risk: high
- Next script: 215-printer-discovery-registry-contract-no-execute.ps1

Remaining work:
- normalize printer registry
- separate status/read-only from print action
- approval gate print-job lane
- dry-run print preview
- one approved print proof only after explicit approval

### casting_tv
- Status: DISCOVERY_ROUTE_PRESENT_NOT_PROVEN
- Done: False
- Risk: high
- Next script: 216-casting-discovery-registry-contract-no-execute.ps1

Remaining work:
- normalize cast targets
- separate discover/status from launch media
- approval gate cast action
- no autoplay without approval
- one approved cast proof only after explicit approval

### android
- Status: NOT_STARTED
- Done: False
- Risk: high
- Next script: 217-android-adb-adapter-contract-no-execute.ps1

Remaining work:
- ADB adapter contract
- device pairing policy
- read-only inventory
- approval gate tap/text/open-app
- never run bulk phone control without approval

### ios
- Status: NOT_STARTED
- Done: False
- Risk: high
- Next script: 218-ios-adapter-capability-contract-no-execute.ps1

Remaining work:
- iOS capability assessment
- Shortcuts/automation contract where available
- read-only connection inventory
- approval-gated action model
- document limitations and manual-confirm boundaries

### linux
- Status: NOT_STARTED
- Done: False
- Risk: medium
- Next script: 219-linux-satellite-contract-no-execute.ps1

Remaining work:
- Linux satellite contract
- SSH/local agent boundary
- read-only status
- approval-gated shell allowlist
- one approved action then lockback

### macos
- Status: NOT_STARTED
- Done: False
- Risk: medium
- Next script: 220-macos-satellite-contract-no-execute.ps1

Remaining work:
- macOS satellite contract
- accessibility permission boundary
- read-only status
- approval-gated app/open/type lane
- one approved action then lockback

### audio_camera_microphone
- Status: NOT_STARTED
- Done: False
- Risk: high
- Next script: 221-audio-camera-mic-registry-contract-no-execute.ps1

Remaining work:
- read-only device inventory
- permission detection
- no recording without approval
- separate live-stream analysis contract
- receipt-backed capture only after explicit approval

### smart_home
- Status: NOT_STARTED
- Done: False
- Risk: critical
- Next script: 222-smart-home-contract-no-execute.ps1

Remaining work:
- Home Assistant or vendor gateway decision
- read-only entity inventory
- approval-gated entity control
- deny locks/doors/security-critical commands until separate policy
- one approved low-risk command proof only

## Safety

- Gap map only: true
- Physical actions executed: 0
- IoT actions executed: 0
- Print jobs sent: 0
- Casting started: 0
- Phone actions executed: 0
- Docker prune: false
- Destructive cleanup: false

## Next

214-iot-discovery-registry-contract-no-execute.ps1
