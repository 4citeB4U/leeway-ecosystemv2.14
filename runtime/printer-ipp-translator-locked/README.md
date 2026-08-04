# LeeWay Printer IPP Translator Locked Stub

This folder contains a locked GET-only translator stub for the HP OfficeJet Pro 8020 printer lane.

## Current Authority

- GET-only stub files exist.
- The service is not started by this script.
- No Docker container is created by this script.
- No IPP request is sent by this script.
- No print job is submitted by this script.
- No queue mutation is performed by this script.
- No physical action lane is created by this script.

## Allowed Future GET Routes

- GET /health
- GET /policy
- GET /capabilities
- GET /target-printer

## Blocked Until Separate Approval

- IPP validate-job
- IPP create-job
- IPP send-document
- IPP print-job
- printer test page
- queue pause/resume/purge
- any physical print action