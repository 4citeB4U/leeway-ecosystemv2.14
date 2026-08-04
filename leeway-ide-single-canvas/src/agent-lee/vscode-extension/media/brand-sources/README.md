<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.BRAND_SOURCES
PURPOSE: Maps original LeeWay branding source assets to the optimized extension surfaces that ship in the VSIX.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
-->

# LeeWay Branding Asset Registry

## Live extension surfaces

| Source asset | Packaged asset | VS Code surface |
| :--- | :--- | :--- |
| `agent-lee-activitybar-icon.svg` | `../agent-lee-activitybar-icon.svg` | Archived source for Activity Bar derivation |
| `agent-lee-activitybar-icon.svg` | `../leeway-activity.svg` | Activity Bar icon (`contributes.viewsContainers.activitybar`) |
| `agent-lee-activitybar-icon.svg` | `../agent-lee-chat-avatar.svg` | Agent Lee chat header avatar |
| `leeway-prime-vector-2.svg` | `../leeway-logo.svg` | Full LeeWay mark for README and sidebar header |
| `top-right-button-new.png` | `../top-right-button-new.png` | Sidebar top-right LeeWay button |
| `bottom-button-for-agent-lee.png` | `../bottom-button-for-agent-lee.png` | Sidebar footer Agent Lee button |
| `leeway-standards-button.png` | `../leeway-standards-button.png` | Sidebar standards button |
| `LeeWayStandardslogo.png` | `../leeway-standards-logo.png` | Extension/package logo and standards logo surface |
| `readme-header.png` | `../readme-header.png` | README header image |
| `readme-system-flow.png` | `../readme-system-flow.png` | README system flow image |

## Archived vector sources

- `leeway-prime-vector-3.svg`
- `leeway-prime-vector-5.svg`
- `leeway-prime-vector-6.svg`

These source vectors are preserved for future design work, but they are not referenced directly by `package.json` or the packaged webview until they are optimized for VS Code runtime use.
