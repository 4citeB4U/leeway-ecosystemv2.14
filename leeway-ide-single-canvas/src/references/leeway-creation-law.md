# LeeWay Creation Law

Apply these laws whenever creating or editing LeeWay application code.

1. No active code without a LeeWay ID.
2. No pipeline without a named LeeWay owner.
3. No command without an emitted and handled route.
4. No event without source, consumer, and receipt policy.
5. No file without classification.
6. No runtime path without a single source of truth.
7. No fallback without explicit fallback classification.
8. No generated artifact in production unless classified and verified.
9. No patch over duplicate code when one path should be removed or quarantined.
10. No feature is complete until the LeeWay gate passes.

## Working Rule

When asked to build something new, start by asking:

- What LeeWay node owns this?
- What pipeline does it belong to?
- What file becomes source of truth?
- What command or event routes change?
- What verification proves it?
- What receipt preserves the evidence?

If any answer is missing, the work is not ready for implementation.
