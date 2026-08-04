# Agent Lee USB Peripheral Contract

## Purpose

Define safe USB peripheral discovery for Agent Lee.

## Discovery Scope

- Connected USB devices.
- Vendor and product names when available.
- Device status and driver blockers.

## Truth Rules

- Do not claim a USB device is owned by Leonard unless the owner registry says so.
- Do not leak raw serials in general reports.
- Use hashes or safe names when identifiers are needed.

