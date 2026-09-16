# LeeWay skills container: canonical authority and preserved legacy workflows

This keeps the existing FastAPI workflow registry and adds read-only, hash-verified access to the canonical LeeWay Agent Skills package. It does not execute tools or Formula.

- GitHub authority: 4citeB4U/LeeWay-Agent-Skills, commit 66c976bb0e79e24503c847ef90929c6fb9d5d818.
- 100 canonical SKILL.md files; eight preserved legacy workflow recipes.
- /authority: verify every manifest file and report pinned identity.
- /authority/skills: list canonical skill paths and SHA-256.
- /authority/file?path=skills/leeway-continuity-authority/SKILL.md: read verified instructions.
- /authority/runtime: query the existing Docker Reality bridge for live container state.
- Existing /skills and other legacy endpoints retain their prior contract.

The missing old architecture binding is not silently replaced with the July archive. Legacy truth endpoints remain unverified; /authority/runtime provides live inventory without promoting stale architecture roles.

Persistent skills and receipts bind beneath the verified LEEWAY_ROOT. This repairs the previous container-local storage boundary.

Initialize the pinned Git submodule before building:
```sh
git submodule update --init docker/agent-skills/authority
```

The normal Dockerfile reuses the verified workstation legacy image. Dockerfile.rebuild is a source-only reconstruction recipe using pinned direct Python requirements; fresh-base reconstruction is not yet tested. Never claim this backup alone supplies application data or secrets.

Candidate tests verify canonical identity and file hashes, eight-recipe equivalence, live Docker inventory, path rejection, read-only HTTP behavior, tamper rejection and missing-file failure.

