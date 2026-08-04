# Before Continuing Agent Lee 3D V13

Do not continue from the previous failed V13 run.

## What failed
- ConvertTo-Json -Depth 120 failed because PowerShell max depth is 100.
- The script continued and printed READY after JSON write failure.

## Correct rule
- Use Write-LeewaySafeJsonFile from scripts\AgentLeeSafeJsonWriter.ps1.
- Clamp JSON depth to 100 or below.
- Mark a lane READY only after receipt file exists and is non-empty.
- Do not build/run the 3D kernel until this hold script reports clean preflight.

## Live system protection
- Do not stop Voice Kernel 8092.
- Do not stop Vision Kernel 8093.
- Do not stop Creation Kernel 8094.
- Do not stop Runtime Fabric.
- Do not stop Seafile memory.
- Add 3D as a new lane only on 8095.
