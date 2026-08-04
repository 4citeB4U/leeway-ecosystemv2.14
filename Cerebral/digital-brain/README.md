# Digital Brain (Next.js)

This folder contains a standalone Next.js app used for experimental UI work.
It is not wired to the Cerebral daemon by default.

Run locally

```powershell
npm install
npm run dev
```

Default URL: http://localhost:3000

Notes

- This app is independent of `agent-lee-os2`.
- Integrations with Cerebral should be added explicitly via API calls to `http://127.0.0.1:8765`.
