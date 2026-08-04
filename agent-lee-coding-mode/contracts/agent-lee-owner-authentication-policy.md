# Agent Lee Owner Authentication Policy

## Policy Goal

Define the truthful, local-first path for recognizing Leonard J Lee as creator-root authority and optional owner identity.

## Allowed Authentication Factors

- Face, if a camera and supported model are available.
- Voice, if a microphone and supported model are available.
- Passphrase fallback, if explicitly enabled.
- Local session trust, only as supporting context.

## Required Rules

- Do not claim a match without support from the actual runtime.
- Do not claim a biometric pass when the hardware or model is unavailable.
- Do not use owner authentication to bypass approval for high-risk actions.
- Do not store raw biometric samples by default.
- Do not copy government ID details into general logs or reports.

## Status Handling

- `OWNER_IDENTITY_NOT_ENROLLED` means the local owner profile exists but has not been enrolled.
- `OWNER_FACE_ENROLLED` means face enrollment completed locally.
- `OWNER_VOICE_ENROLLED` means voice enrollment completed locally.
- `OWNER_FACE_AND_VOICE_ENROLLED` means both local enrollments completed.
- `OWNER_AUTHENTICATED` means the owner was verified by the active session method.
- `OWNER_AUTHENTICATION_PARTIAL` means a partial or weak match exists.
- `OWNER_AUTHENTICATION_BLOCKED_CAMERA_UNAVAILABLE` means face auth cannot run because camera support is missing.
- `OWNER_AUTHENTICATION_BLOCKED_MIC_UNAVAILABLE` means voice auth cannot run because mic support is missing.
- `OWNER_AUTHENTICATION_BLOCKED_MODEL_UNAVAILABLE` means the model or runtime needed for auth is unavailable.

## Approval Authority

- Leonard J Lee is the final human-in-the-loop.
- Root authority covers standards changes, identity changes, and high-risk actions.
- Owner authentication does not remove the need for explicit approval where policy requires it.

## Receipts

Every owner authentication attempt must write a receipt with:

- ownerId
- method
- runtime support status
- confidence
- blockers
- timestamp

