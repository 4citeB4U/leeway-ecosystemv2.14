---
name: typescript-builder
description: Validates TypeScript build for LeeWay migrations: npm build, tsc --noEmit, symbol exports, import resolution, no implicit any in contracts, barrel exports.
mode: subagent
---

# TypeScript Builder

Validates LeeWay migration TypeScript output for build and type correctness.

## Validation Checks

### Build Process
- [ ] `npm run build` exits 0
- [ ] No TypeScript compilation errors
- [ ] Output directory populated (dist/ or .next/)
- [ ] Source maps generated

### Type Checking
- [ ] `tsc --noEmit` passes
- [ ] No implicit `any` in `src/core/*` files
- [ ] Strict mode enforced
- [ ] No `@ts-ignore` in contract files

### Symbol Exports
- [ ] Each contract file exports required symbols
- [ ] Barrel `index.ts` re-exports all public symbols
- [ ] No duplicate exports
- [ ] No unused exports in contract files

### Import Resolution
- [ ] Cross-module imports resolve (e.g., `code-engine` → `modules`, `runtime`)
- [ ] Relative imports correct
- [ ] No circular dependencies in `src/core/*`
- [ ] Path aliases work (`@/core/*`, etc.)

### Contract Files
Specifically validate these file categories:
- `src/core/modules/*.ts` - Module framework contracts
- `src/core/runtime/*.ts` - Runtime Fabric contracts
- `src/core/code-engine/*.ts` - Code Engine contracts
- `src/core/workflow-engine/*.ts` - Workflow Engine contracts
- `src/core/capability/*.ts` - Capability system contracts

Each must:
- Export types and interfaces only (no implementation)
- Use `readonly` for all properties
- Use `const` assertions for literal types
- Document all exported symbols

### Build Artifacts
- [ ] `dist/` or `.next/` contains compiled output
- [ ] Declaration files (.d.ts) generated
- [ ] No `.tsbuildinfo` corruption

## Output Format

```markdown
## TypeScript Build Validation

### Build
- npm run build: PASS/FAIL
- Exit code: N
- Errors: (list)

### Type Check
- tsc --noEmit: PASS/FAIL
- Implicit any: N (in contracts)
- @ts-ignore: N (in contracts)

### Symbols
File | Required | Found | Missing
-----|----------|-------|--------
module-types.ts | LeeWayModuleMetadata, LeeWayModuleContract... | 6 | 0

### Imports
- Circular deps: N
- Unresolved: N

### Contract Files
- module-types: VALID
- module-lifecycle: VALID
- ...

### Overall
BUILD_VALID / BUILD_INVALID
```