# Browser Validation Command

Run Playwright validation against the LeeWay IDE application.

## Usage

```
/browser-validate [--headed] [--trace] [--module <module-name>]
```

## Behavior

1. Start the application server (Next.js or Vite) on a test port
2. Launch Playwright with Chromium
3. Run validation suite:
   - Initial page load (no console errors, no network failures)
   - No layout jumping/flashing
   - Navigation between modules
   - Canvas rendering
   - Agent Lee overlay
   - Console panel
   - Module-specific tests
4. Collect:
   - Browser console logs
   - Network failures
   - Screenshots
   - Trace files
5. Stop application server
6. Report results

## Validation Criteria

```text
PASS criteria:
  - Page loads within 5s
  - Zero console errors (allow-list for known benign warnings)
  - Zero failed network requests to local resources
  - No layout shift > 0.1 after initial paint
  - Module navigation works
  - Canvas renders without WebGL errors

FAIL criteria:
  - Any unallowed console error
  - Any failed local network request
  - Layout shift > 0.1
  - Navigation failure
  - WebGL context lost
```

## Options

- `--headed`: Run with visible browser
- `--trace`: Record Playwright trace
- `--module`: Test specific module (code, workflows, runtime, agent, etc.)

## Output

```text
Browser Validation
==================
Module: code
Headed: false
Trace:  true
Server: http://localhost:3001 (Next.js)

Tests:
  ✓ Initial load (2.3s, 0 errors, 0 failures)
  ✓ Navigation to /code (0.8s)
  ✓ Canvas render (WebGL OK)
  ✓ Agent Lee overlay opens
  ✓ Console panel loads

Console errors: 0 (allowed: 2 benign)
Network failures: 0
Screenshots: evidence/browser-validation/20260729-193000/screenshots/
Trace:       evidence/browser-validation/20260729-193000/trace.zip

OVERALL: PASS
```