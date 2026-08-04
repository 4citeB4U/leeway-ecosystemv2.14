# OpenCode Config Validator

Validate the OpenCode configuration against schema and project requirements.

## Usage

```
/opencode-validate
```

## Behavior

1. Read `C:\Users\Leona\.config\opencode\opencode.jsonc`
2. Validate against OpenCode schema (`https://opencode.ai/config.json`)
3. Check project-specific requirements:
   - `skills.paths` includes `~/.agents/skills` and `./.leeway/skills`
   - `instructions` includes AGENTS.md, ADR files, standards compliance
   - No conflicting provider configurations
4. Report validation errors or warnings

## Output

```text
OpenCode Config Validation
==========================
Schema validation:        PASS
Skills paths:             PASS (2 paths configured)
Instructions:             PASS (3 instruction files)
Provider config:          PASS (no conflicts)
Agent config:             PASS
Permission config:        PASS
MCP config:               NOT_CONFIGURED (expected for now)
Warnings:
  - MCP servers not configured (add when needed)
```