# Agent Lee Owner Device Registry Contract

## Purpose

Define how Agent Lee records Leonard-approved personal devices without exposing raw sensitive hardware identifiers in general reports.

## Required Fields

- ownerId
- deviceId
- friendlyName
- deviceType
- platform
- identifiers
- registeredAt
- lastSeenAt
- verificationMethod
- consentReceipt
- status

## Identifier Rules

- Prefer hashes for MAC addresses and serials.
- Hostname and friendlyName may be stored when Leonard supplied them.
- A device is Leonard's only when the registry says so or a strong match is proven.
- Uncertain matches must be labeled `OWNER_DEVICE_MATCH_UNCERTAIN`.

