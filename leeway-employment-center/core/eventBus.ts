/*
FILE: core\EventBus.ts
PURPOSE: Compatibility re-export preserving LeeWay EventBus import casing.
TAG: CORE.RUNTIME.EVENT_BUS.COMPAT
REGION: 🟢 CORE
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: ./eventBus
EXPORTS: eventBus
STATUS: ACTIVE
*/

export { eventBus } from './eventBus';
