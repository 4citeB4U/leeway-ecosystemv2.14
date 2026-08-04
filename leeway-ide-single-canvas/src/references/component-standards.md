<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.REFERENCE.COMPONENT_STANDARDS
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Reference for LeeWay React component and UI control standards.
-->

# LeeWay Component Standards

When creating LeeWay UI screens, components, buttons, inputs, or images, enforce the following:

## React components
- Include a LeeWay header.
- Declare a stable component ID.
- Add `data-leeway-id` to the root and important elements.
- Attach the screen ID for owner-facing views.
- Keep source classification attached to the component file.

## Buttons and actions
- Every button must have an action ID.
- Owner-facing buttons must have help triggers.
- Mutating buttons must have an audit category.
- No anonymous click handlers.
- Clearly document workflow IDs for button actions.

## Inputs
- Every input must have a schema path.
- Validate against data classification.
- Provide a help link for owner-facing settings.
- Add an audit category when input changes mutate state.

## Images and assets
- Every image/video must have an asset ID.
- Provide validated alt text or caption path.
- Define storage and security authority for uploads.
- Validate content before accepting public assets.
