# LeeWay Ordered Prompt History Scope Law

Object ID: `LEEWAY_APP::GOVERNANCE::PROMPT_HISTORY::SCOPE_LAW`
Classification: `GOVERNANCE_GATE`
Source Standard: `BOOK-80-ABSOLUTE-PROOF-AND-NO-FALSE-COMPLETION-LAW`

When Leonard provides ordered prompt history, the ordered history becomes the completion scope.

Rules:

- Every prompt must be preserved as a prompt record.
- Every requirement must become a requirement record.
- Unparsed prompts must be retained as `UNPARSED_PROMPT_RECORD`.
- Later summaries do not erase earlier requirements.
- Production gate scores do not override prompt-history truth.
- Final completion is forbidden while any prompt-history requirement remains unproven or unblocked.

