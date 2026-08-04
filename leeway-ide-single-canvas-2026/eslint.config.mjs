import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Candidate lint policy (leeway-ide-single-canvas-2026, current-stack migration):
// - Strict rules apply to the whole candidate.
// - @typescript-eslint/no-explicit-any is relaxed: the candidate carries legacy
//   single-canvas code typed with `any`; TypeScript correctness is enforced by the
//   separate `tsc --noEmit` gate (npm run typecheck), which is a hard failure.
// - React Compiler advisory rules are relaxed: React Compiler is not enabled for
//   this candidate; legacy carried canvas components intentionally sync state
//   inside effects (pre-existing behavior, preserved during migration).
// - react/no-unescaped-entities and react/jsx-no-comment-textnodes are relaxed:
//   legacy carried prose UI text; runtime-correct, HTML-escaping migration is a
//   later per-module remediation item, not a stack-proof blocker.
// Keep enabled and enforced: prefer-const, no-unused-vars, exhaustive-deps,
// ban-ts-comment, and all remaining correctness rules from eslint-config-next.

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react/no-unescaped-entities": "off",
      "react/jsx-no-comment-textnodes": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "evidence/**",
    "migration/**",
    "graphify-out/**",
    "architecture/**",
    ".opencode/**",
    "public/**",
  ]),
]);

export default eslintConfig;
