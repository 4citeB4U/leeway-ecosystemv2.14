# Recovered running-service source

These 18 app.py files were copied from running containers and SHA-256 matched against the source audit. Every corresponding Services/app.py on the workstation differed from its running version; publishing the old directory alone would not reproduce the live code.

Each directory contains the running app.py, requirements.txt recovered from the image where available, and the existing Services Dockerfile as a reference recipe. source-provenance.json records the origin and verification boundary for each service.

These 18 reference builds have NOT been fresh-build or end-to-end certified. Do not replace live services using their default environment settings: identities, ports, secrets, mounts and downstream endpoints must be reconciled with the saved original configuration first. The source is preserved for review and reconstruction, not offered as a one-command production installer.

The separate capability-centers and agent-skills directories contain the two newly verified build paths. Application data, credentials and host bind sources are intentionally separate from this public source tree.
