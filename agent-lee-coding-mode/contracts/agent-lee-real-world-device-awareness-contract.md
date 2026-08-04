# Agent Lee Real-World Device Awareness Contract

## Purpose

Define how Agent Lee discovers visible real-world devices around the laptop without faking presence or ownership.

## Device Categories

- WINDOWS_AUDIO_INPUT
- WINDOWS_AUDIO_OUTPUT
- WINDOWS_CAMERA
- WINDOWS_PRINTER
- WINDOWS_SCANNER
- WINDOWS_DISPLAY
- USB_DEVICE
- BLUETOOTH_DEVICE
- WIFI_NETWORK_DEVICE
- LOCAL_NETWORK_DEVICE
- MDNS_DEVICE
- SSDP_UPNP_DEVICE
- ROUTER_DHCP_DEVICE
- MOBILE_PHONE
- ANDROID_DEVICE
- IOS_DEVICE
- IOT_DEVICE
- UNKNOWN_DEVICE

## Device States

- DEVICE_VISIBLE
- DEVICE_NOT_VISIBLE
- DEVICE_DISCOVERABLE
- DEVICE_CONNECTED
- DEVICE_PAIRED
- DEVICE_AVAILABLE_FOR_ACTION
- DEVICE_ACTION_REQUIRES_APPROVAL
- DEVICE_ACTION_EXECUTED
- DEVICE_ACTION_BLOCKED
- DEVICE_PERMISSION_BLOCKED
- DEVICE_DRIVER_MISSING
- DEVICE_DISCOVERY_UNCERTAIN

## Truth Rules

- Do not identify a phone by owner unless an approved owner-device mapping exists.
- Do not claim "Leonard's phone" unless it is registered or strongly matched in the owner registry.
- If only vendor, hostname, IP, or MAC vendor is known, report only that level of certainty.
- If no signal exists, report the device as not discoverable.
- Do not fake printer success. A print job must be accepted by the queue or the system must truth-label the blocker.

## Discovery Sources

- Windows audio and device enumeration.
- Windows printer enumeration.
- USB and Bluetooth enumeration.
- Local network discovery where supported.
- mDNS, SSDP, DHCP, and ARP only when locally available and safe.
- ADB or phone bridge only when present and authorized.

## Receipt Rule

- Discovery reports and physical-world actions must write receipts.
- Reports must store only the least sensitive identifier needed.
- Sensitive raw identifiers must not leak into general discovery reports.

