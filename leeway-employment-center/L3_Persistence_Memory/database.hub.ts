/*
FILE: L3_Persistence_Memory\database.hub.ts
PURPOSE: Northbridge runtime contract for skill lookup, sync telemetry, and transitional persistence orchestration.
TAG: DATA.LOCAL.STORE.DATABASE_HUB.MAIN
REGION: 💾 DATA
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: ../core/eventBus
EXPORTS: SkillNode, registerSkill, L3_Northbridge
STATUS: ACTIVE
*/

import { eventBus } from '../core/eventBus';

export interface SkillNode {
  id: string;
  run: (payload: unknown) => Promise<unknown> | unknown;
  description?: string;
}

const registry = new Map<string, SkillNode>();

const fallbackSkill = (skillId: string): SkillNode => ({
  id: skillId,
  description: 'Transitional governed fallback skill.',
  run: async (payload: unknown) => ({
    skillId,
    payload,
    status: 'TRANSITIONAL_EXECUTION',
    handledAt: new Date().toISOString()
  })
});

export function registerSkill(skill: SkillNode) {
  registry.set(skill.id, skill);
}

export const L3_Northbridge = {
  async sync() {
    const telemetry = {
      load: { value: 32 },
      memory: { value: 54 },
      io: { value: 71 }
    };

    eventBus.emit('northbridge:pulse', {
      type: 'NORTHBRIDGE_SYNC',
      telemetry,
      registrySize: registry.size
    });

    return {
      status: 'SYNCED',
      registrySize: registry.size,
      telemetry
    };
  },

  async getSkill(skillId: string) {
    return registry.get(skillId) ?? fallbackSkill(skillId);
  },

  listSkills() {
    return Array.from(registry.keys());
  }
};
