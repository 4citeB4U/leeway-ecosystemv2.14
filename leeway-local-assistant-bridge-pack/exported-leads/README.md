Exported Leads
===============

This folder contains JSON lead files exported by local tools for manual import into the GitHub Pages CRM UI.

Why export?
- The GitHub Pages CRM currently runs entirely in the browser and uses LocalStorage for persistence. There is no backend API available by default.
- Exported JSON lets you move leads between systems or import them into the CRM UI via the Import / Export tab.

How to import manually
1. Open the LeeWay Outreach CRM in your browser (the GitHub Pages site).
2. Go to the `Import / Export` or `Settings` tab.
3. Choose `Import JSON` (or `Upload`) and select the exported JSON file in this folder.

Automated push
- A helper script `scripts/push-lead-to-crm.ps1` is included. It supports three modes:
  - `Manual`: validate and print a summary, then instruct you to import the JSON file manually.
  - `Bridge`: POST the JSON to a running LeeWay Local Assistant Bridge (`/assistant`) for model-driven cleaning and preparation.
  - `Api`: POST directly to a real CRM API endpoint (if/when you have one). Supports `Authorization: Bearer <token>`.

Important
- Do not use Leonard Lee's phone, fax, or email as the business lead's contact information. Leonard's contact information is only for outbound signature blocks and should not be stored as the lead's contact data.

Contact
- If you need help importing or automating the flow, run the `scripts/push-lead-to-crm.ps1` with `-Mode Manual` to validate one lead, then switch to Bridge or Api mode when your endpoint is available.
