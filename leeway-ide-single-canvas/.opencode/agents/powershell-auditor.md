---
name: powershell-auditor
description: Validates PowerShell migration scripts for compliance with LeeWay standards: parser validation, strict mode, error handling, evidence generation, rollback, protected file hashing, mandatory collection parameters, and idempotency.
mode: subagent
---

# PowerShell Auditor

Validates LeeWay migration PowerShell scripts for standards compliance.

## Validation Checks

### Parser & Syntax
- [ ] Script parses with `[System.Management.Automation.Language.Parser]::ParseFile()`
- [ ] No syntax errors or warnings
- [ ] `#requires -Version 7.0` present
- [ ] UTF-8 no BOM encoding

### Strict Mode & Error Handling
- [ ] `Set-StrictMode -Version Latest`
- [ ] `$ErrorActionPreference = 'Stop'`
- [ ] `$ProgressPreference = 'SilentlyContinue'`
- [ ] All external commands check `$LASTEXITCODE`
- [ ] Try/catch/finally structure for entire migration
- [ ] Transcript started/stopped in try/finally

### Evidence Generation
- [ ] Timestamped evidence session directory created
- [ ] `environment.json` written
- [ ] `migration.json` written
- [ ] `validation.json` written (PASS/FAIL)
- [ ] `receipt.json` written
- [ ] `transcript.log` written
- [ ] `npm-build.log` written (if applicable)
- [ ] Rollback directory created with backups

### Prerequisite Verification
- [ ] PowerShell version check (7+)
- [ ] Git available
- [ ] Project root verified
- [ ] Architecture directory verified
- [ ] Migration directory verified
- [ ] Evidence directory verified
- [ ] Prerequisite receipts found and PASS

### Protected File Hashing
- [ ] Protected files defined: package.json, package-lock.json, server.ts, vite.config.ts, vite.config.js
- [ ] Hashes captured BEFORE mutation (`protectedBefore`)
- [ ] Hashes captured AFTER mutation (`protectedAfter`)
- [ ] Comparison throws if any changed

### Rollback
- [ ] `Backup-TargetFile` for each target (create or update)
- [ ] Rollback actions recorded (restore/remove)
- [ ] `Invoke-Rollback` executes in reverse order
- [ ] Rollback triggered on any FAIL
- [ ] Rollback writes failure evidence

### Collection Parameters
- [ ] Mandatory collections use `[AllowEmptyCollection()]` attribute
- [ ] No parameter binding failures on empty lists

### Idempotency
- [ ] `New-LeeWayDirectory` or equivalent handles existing paths
- [ ] File writes use `Write-TextFile` with overwrite
- [ ] Re-running produces same evidence structure

### Git Awareness
- [ ] Git root resolved
- [ ] Project root inside git root verified
- [ ] Initial git status captured
- [ ] Final git status captured

### Output Format
- [ ] `Write-LeeWayLog` with STEP/PASS/WARN/FAIL/INFO levels
- [ ] Color-coded console output
- [ ] Final summary with evidence path and receipt path

## Output Format

```markdown
## PowerShell Audit: <script-path>

### Parser
- Parse: PASS/FAIL
- Errors: N

### Standards
- Requires PS7: PASS/FAIL
- StrictMode: PASS/FAIL
- ErrorAction: PASS/FAIL
- Transcript: PASS/FAIL

### Evidence
- Session dir: PASS/FAIL
- environment.json: PASS/FAIL
- migration.json: PASS/FAIL
- validation.json: PASS/FAIL
- receipt.json: PASS/FAIL
- transcript.log: PASS/FAIL
- npm-build.log: PASS/FAIL
- rollback dir: PASS/FAIL

### Prerequisites
- PS Version: PASS/FAIL
- Git: PASS/FAIL
- Receipts: PASS/FAIL

### Protection
- Protected files: PASS/FAIL
- Before/after hash: PASS/FAIL

### Rollback
- Backup created: PASS/FAIL
- Actions recorded: PASS/FAIL
- Reverse execution: PASS/FAIL

### Collections
- AllowEmptyCollection: PASS/FAIL

### Idempotency
- Handles existing: PASS/FAIL

### Overall
COMPLIANT / NON_COMPLIANT (N violations)
```