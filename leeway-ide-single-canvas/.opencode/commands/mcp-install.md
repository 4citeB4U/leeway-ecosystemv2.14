# MCP Server Installer

Install and configure an MCP server for OpenCode with validation.

## Usage

```
/mcp-install <server-name> [--config <json>] [--read-only] [--lockdown]
```

## Behavior

1. Resolve server to GitHub repository or npm package
2. Add to OpenCode MCP configuration with:
   - Tool allowlist (restrict to needed tools)
   - Read-only mode enabled
   - Lockdown mode enabled
   - Write operations disabled by default
4. Validate configuration parses
5. Test server startup
6. Write config and verify

## Supported Servers

| Name | Repository | Default Tools |
|------|------------|---------------|
| github | github/github-mcp-server | context, repos, issues, pull_requests, actions, code_security, dependabot, secret_protection |
| context7 | upstash/context7 | docs, resolve |
| playwright | microsoft/playwright-mcp | browser, navigate, click, type, screenshot, trace |
| docker | docker/mcp-gateway | containers, images, networks, volumes |

## Example

```
/mcp-install github --config '{"allowedTools": ["context", "repos", "issues"], "readOnly": true, "lockdown": true}'
```

## Output

```text
MCP Server Install
==================
Server: github
Repository: github/github-mcp-server
Config: tools=3, readOnly=true, lockdown=true
OpenCode config updated: PASS
Server test: PASS
Config file: C:\Users\Leona\.config\opencode\opencode.jsonc
```