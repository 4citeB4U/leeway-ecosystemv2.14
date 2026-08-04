# Agent Lee Cursor Separation Rule

## Status
ACTIVE

## Rule
Leonard's Windows cursor must remain Leonard's normal cursor.

Agent Lee must not attach a label, bubble, overlay, or pointer to Leonard's real cursor.

## Correct split

### Leonard Cursor
- Real Windows cursor
- Controlled by Leonard
- Must remain normal
- Must not be hijacked by Agent Lee
- Must not carry Agent Lee labels

### Agent Lee UI Pointer
- Must be rendered inside Agent Lee's own UI window/panel
- Must not follow Leonard's real cursor
- Must not call SetCursorPos
- Must not call mouse_event
- Must not click
- Must not type
- Must be visually separate from Leonard's cursor

### Desktop Hands Mode
- Separate mode
- Approval gated
- May move real OS mouse only after explicit approval
- Must show warning before action
- Must log every movement and click

## Deprecated
The previous Agent Lee hand overlay scripts are deprecated because they visually attached Agent Lee to Leonard's cursor or used real cursor movement patterns.

Future tests must build a separate Agent Lee UI surface instead of modifying or following Leonard's cursor.
