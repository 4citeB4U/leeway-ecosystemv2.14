# Skill Manifest Sync Command

Synchronize the Leeway skills manifest with the actual installed skills and OpenCode configuration.

## Usage

```
/skill-manifest-sync
```

## Behavior

1. Read `C:\Users\Leona\.config\opencode\opencode.jsonc`
2. Read `.leeway/skills/skills-manifest.json`
3. Scan `C:\Users\Leona\.agents\skills\` for installed skills
4. Verify each skill has a `SKILL.md` with name/description
5. Update `skills-manifest.json` with current state
6. Verify OpenCode config references the skills path
6. Write updated manifest

## Output

```text
Skill Manifest Sync
===================
OpenCode config: VALID (skills.paths includes ~/.agents/skills)
Installed skills: 13
  - graphify: OK
  - loopy: OK
  - loop-library: OK
  - agent-browser: OK
  - plan: OK
  - research: OK
  - skill-creator: OK
  - microsoft-foundry: OK
  - frontend-design: OK
  - init: OK
  - cross-review: OK
  - zen-comprehensive-review: OK
  - zen-review: OK
Manifest updated: .leeway/skills/skills-manifest.json
```