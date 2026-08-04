# Migration Run Command

Execute a single approved migration using its PowerShell script.

## Usage

```
/migration-run <migration-id>
```

## Behavior

1. Validate that `scripts/<NN>-MIG-XXX-*.ps1` exists
2. Verify prerequisite receipts exist and are PASS
3. Parser-validate the PowerShell script before execution
4. Execute the migration script with the project root parameter
5. Capture exit code and verify receipt status is PASS
6. Report evidence location and receipt path

## Prerequisites

- Migration script must exist at `scripts/<NN>-MIG-XXX-*.ps1`
- All prerequisite migrations must have PASS receipts
- Parser validation must pass

## Output

Print:
- Migration ID
- Script SHA-256
- Evidence session path
- Receipt path
- PASS/FAIL status