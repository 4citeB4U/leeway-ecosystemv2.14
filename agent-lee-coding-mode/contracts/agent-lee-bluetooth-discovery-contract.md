# Agent Lee Bluetooth Discovery Contract

## Purpose

Define truthful Bluetooth discovery and reporting for Agent Lee.

## Discovery Scope

- Bluetooth radio status.
- Paired devices.
- Nearby discoverable devices when supported.
- Permission or service blockers.

## Truth Rules

- Do not claim a nearby device is visible unless the local stack actually reports it.
- Do not identify a person from Bluetooth alone.
- Use vendor and friendly name only when that is all the runtime can prove.

