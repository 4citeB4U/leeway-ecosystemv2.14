# Agent Lee Printer Control Contract

## Purpose

Define safe printer listing, queue checking, proof document creation, and test printing for Agent Lee.

## Rules

- Print actions are physical-world actions and require explicit approval or an explicit printer-proof script run.
- Do not claim print success without queue acceptance or another truthful printer receipt.
- Do not silently print.
- Do not claim a printer exists unless it is actually discovered locally.

## Required Capabilities

- List installed printers.
- Detect the default printer.
- Inspect queue or spooler state when available.
- Create a simple proof document.
- Submit a test print only when approved.
- Write a printer receipt.

## Proof File

- Proof content must include timestamp, computer name, default printer, receipt path, and a note that VS Code is not required.

## Blockers

- No printer found.
- Printer queue unavailable.
- Print driver missing.
- Print approval missing.
- Print job rejected.

