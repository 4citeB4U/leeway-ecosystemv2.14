import { NextResponse } from 'next/server';
import { getSkillRegistrySnapshot } from '@/src/services/tooling/skillRegistry';
import { getToolingSnapshot } from '@/src/services/tooling/toolingRegistry';

export async function GET() {
  const tooling = getToolingSnapshot();
  const skills = getSkillRegistrySnapshot();

  return NextResponse.json({
    generatedAt: tooling.generatedAt,
    mcp: {
      count: tooling.mcpCount,
      enabledCount: tooling.enabledCount,
      entries: tooling.entries,
    },
    skills: {
      count: skills.length,
      enabledCount: skills.filter((skill) => skill.enabled).length,
      entries: skills,
    },
  });
}
