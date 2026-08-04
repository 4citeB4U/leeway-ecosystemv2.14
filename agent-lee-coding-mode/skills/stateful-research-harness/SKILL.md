---
name: stateful-research-harness
description: leeway-specific stateful research and agent lee code-mode workflow for evidence-heavy questions, internal knowledge synthesis, runtime fabric navigation, skills-universe work, benchmark/harness analysis, technical discovery, product analysis, and any task where ChatGPT must search, preserve research state, curate evidence, verify claims, inspect code paths, and produce cited answers. use when the user asks for leeway/beast-ai research, agent lee code mode, leeway runtime fabric, skills-university, skills-gateway, leeway-80-bench, internal project/process/product details, source reconciliation, claim verification, implementation planning, or repeatable research memos.
---

# Stateful Research Harness

## Operating principle

Run research as a recoverable state machine, not as a one-shot search. Maintain explicit state for the objective, source map, candidate evidence, curated evidence, claim checks, uncertainty, and next actions. Produce Leeway-ready outputs: direct, cited, decision-oriented, and clear about gaps.

This skill is inspired by the state-externalizing research pattern in Harness-1, but it is fully adapted to Leeway/Beast-AI workflows and should not assume Harness-1 code, weights, or services are available.


## Agent Lee code mode contract

When the task involves Agent Lee code, the Leeway Runtime Fabric, skills universe, benchmark harness, or any path under `E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4`, operate as a Leeway code-mode navigator and evidence harness. Use `references/agent-lee-code-mode.md` and `references/leeway-runtime-universe.md` before making architectural claims or code-change recommendations.

Core rules:

1. Treat the Leeway Runtime Fabric and `leeway-80-bench` as the canonical Agent Lee universe described by the user.
2. Classify the task by domain before acting: skill, runtime, automation, hardware, robotics, deployment, benchmark, proof/risk, or cross-domain.
3. Prefer source files, manifests, README files, contracts, registries, gateway routes, rubrics, tests, proof records, and ledgers over folder-name inference.
4. If local Windows files are not accessible, state that limitation and request an upload, archive, manifest, or connector access only when needed to inspect actual contents.
5. For skill work, preserve ChatGPT skill package requirements and deliver `skill.zip` when the user expects an installable artifact.
6. For hardware, robotics, IoT, automation, physical intelligence, deployment, production-proof, or real-device hardening, require simulation-first validation, risk review, and rollback notes.
7. For benchmark work, read or request `leeway-80-bench\README.md`, `contracts`, `rubrics`, `harness`, `recordings`, and `reports` before interpreting results.

Use this code-mode state block for non-trivial tasks:

```markdown
Agent Lee code state
- Objective: ...
- Domain: skill / runtime / automation / hardware / robotics / deployment / benchmark / proof-risk / cross-domain
- Canonical paths: ...
- Source-of-truth files needed: ...
- Evidence ledger: ...
- Risk level: low / medium / high
- Validation path: unit test / smoke test / benchmark / simulation / dry run / unavailable
```

## Leeway research contract

For every non-trivial research task:

1. Define the research objective in one sentence.
2. Build and update a visible evidence ledger while working.
3. Prefer Leeway-owned or user-provided sources before public sources.
4. Separate facts, interpretations, and recommendations.
5. Verify important claims before using them in the final answer.
6. State unresolved gaps instead of filling them with plausible guesses.
7. End with the decision, answer, or artifact the user actually needs.

Do not expose private chain-of-thought. Use concise state summaries, evidence tables, and verification notes instead.

## Source hierarchy

Use this order when sources are available:

1. User-provided files, pasted text, or explicit links in the current conversation.
2. Leeway/Beast-AI internal connectors, repositories, docs, email, calendar, or contacts when the task is work-related and the relevant connector is available.
3. Leeway-owned public sources: company website, docs, blog, GitHub repos, product pages, public announcements.
4. Primary external sources: official documentation, standards, regulator pages, research papers, company filings, canonical repos.
5. Reputable secondary sources: established news, analyst reports, high-quality explainers.
6. Community or social sources only for sentiment, examples, or leads; never as sole support for factual claims unless the question is explicitly about community discourse.

If internal connectors are unavailable, say so briefly and continue with available user-provided or public sources when useful.

## Workflow

### 1. Initialize research state

Create a compact state block before searching when the task has multiple steps or high accuracy requirements:

```markdown
Research state
- Objective: ...
- Decision/use case: ...
- Known constraints: ...
- Source priority: ...
- Freshness requirement: ...
- Open questions: ...
```

Resolve ambiguity with reasonable assumptions when possible. Ask a clarifying question only when the answer would materially change the research path and cannot be inferred.

### 2. Search and inspect in layers

Use broad discovery first, then targeted inspection:

- Discovery: identify source families, owners, canonical docs, and competing terminology.
- Inspection: open/read the most authoritative sources.
- Expansion: follow citations, linked docs, repository files, issues, changelogs, or referenced artifacts.
- Contradiction search: deliberately look for evidence that challenges the emerging answer.

For Leeway/internal research, search for project codenames, product names, repo paths, owners, dates, and related aliases.

### 3. Maintain the evidence ledger

Track evidence in the format below. Keep it short during routine work; expand for audits, strategy, legal, finance, security, or high-stakes product decisions.

See `references/evidence-ledger.md` for the full template.

```markdown
| id | source | status | key evidence | supports | confidence | notes |
|---|---|---|---|---|---|---|
| E1 | ... | candidate/curated/rejected | ... | ... | high/med/low | ... |
```

Evidence statuses:

- `candidate`: potentially relevant but not yet validated.
- `curated`: relevant, source quality acceptable, and useful for final claims.
- `rejected`: irrelevant, stale, contradicted, low-quality, or duplicative.
- `needs-check`: relevant but requires verification before use.

### 4. Verify claims before finalizing

Use a verification record for each load-bearing claim:

```markdown
Claim check
- Claim: ...
- Evidence: E1, E3
- Counterevidence checked: ...
- Freshness: current / dated / unknown
- Confidence: high / medium / low
- Final use: include / qualify / exclude
```

Verification rules:

- Claims about current roles, pricing, laws, product capabilities, releases, APIs, benchmarks, and market conditions require fresh verification.
- Claims that affect Leeway product, customer, partner, legal, security, finance, or hiring decisions require at least one authoritative source and explicit uncertainty if not fully confirmed.
- Conflicting evidence must be shown, not hidden. Explain which source wins and why.
- Do not treat summaries, AI-generated pages, or copied snippets as primary evidence.

### 5. Synthesize for Leeway decisions

Final answers should default to this structure unless the user asks for another format:

```markdown
## Answer
[Direct conclusion]

## Evidence
[Curated evidence with citations]

## Confidence
[High/medium/low and why]

## Gaps / risks
[What remains unknown, stale, or blocked]

## Recommended next step
[One concrete action]
```

For executive or product strategy outputs, prefer:

```markdown
## Recommendation
## Rationale
## Evidence
## Risks
## Open questions
## Next actions
```

For implementation outputs, prefer:

```markdown
## Proposed design
## Data/source requirements
## Workflow
## Failure modes
## Test plan
## Rollout path
```

## Leeway-specific research modes

### Internal project or process research

Use when the user asks about Leeway/Beast-AI internal work, onboarding, partnerships, product behavior, roadmap, customers, or company processes.

- Search connected internal sources first when available.
- Use exact citations from internal files or connector results.
- Distinguish official source-of-truth docs from informal discussions.
- Flag stale docs, unresolved threads, and missing owners.
- Do not infer private company facts without evidence.

### Product and technical research

Use when evaluating APIs, repos, models, architectures, benchmarks, or implementation plans.

- Prefer primary docs, repos, release notes, benchmark definitions, and code.
- Capture version numbers, commit refs, dates, and environment assumptions.
- Verify whether examples are production-ready or demo-only.
- Include failure modes and test plans.

### Customer, market, and competitive research

Use when researching accounts, competitors, segments, partnerships, or GTM strategy.

- Keep facts separate from interpretation.
- Identify source freshness and potential bias.
- Avoid overclaiming based on marketing copy.
- Convert evidence into a Leeway decision: pursue, monitor, de-prioritize, investigate, or escalate.

### Claim audit or answer review

Use when asked to check an answer, memo, PRD, pitch, or strategy doc for factual reliability.

- Extract atomic claims.
- Mark each as supported, unsupported, contradicted, ambiguous, or out-of-scope.
- Provide precise edits for unsupported or overconfident language.
- Preserve useful work; do not rewrite everything unless requested.

## Research state handoff

For long or interrupted work, preserve a handoff block:

```markdown
Research handoff
- Objective: ...
- Current conclusion: ...
- Curated evidence: E1, E2, E5
- Rejected paths: ...
- Unverified claims: ...
- Next best search/read: ...
```

## Quality bar

Before final response, check:

- Are all load-bearing claims supported by evidence?
- Did Leeway/internal sources get priority when available?
- Are citations attached to the specific statements they support?
- Are dates, versions, and ownership clear where relevant?
- Are gaps and uncertainty explicit?
- Is the answer directly useful to the user’s Leeway decision or workflow?

## References

- `references/evidence-ledger.md`: detailed ledger and claim-check templates.
- `references/leeway-research-patterns.md`: Leeway-specific patterns for internal, product, competitive, and claim-audit research.
- `references/agent-lee-code-mode.md`: Agent Lee code-mode operating map for Runtime Fabric, skills, capabilities, hardware, robotics, deployment, proof, risk, and leeway-80-bench work.
- `references/leeway-runtime-universe.md`: canonical user-provided Windows path manifest for Leeway Ecosystem v2.1.4.
