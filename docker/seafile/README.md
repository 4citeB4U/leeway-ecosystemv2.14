# LeeWay Seafile recovery deployment

This recipe records the verified Seafile 11 application, MariaDB 10.11 and cache using immutable registry digests. It uses existing external data volumes and the existing network; it does not initialize a fresh empty replacement.

Copy .env.example to a private .env and restore the original protected credentials. Restore the recorded database and application volumes before starting on another machine. Never commit .env, database files or private recovery logs.

Run docker compose config --quiet, then docker compose up -d. Verify http://127.0.0.1:8082/api2/ping/ and application login. Recovery verified API ping, database authentication, both repository heads and read-only fsck; a user login/upload workflow was not exercised.

The original database volume and original recovery source volume remain preserved. The active database is the verified recovery clone. Evidence is in ../evidence/seafile-production-recovery.json. This recipe was validated against live configuration; the cutover itself used the saved PowerShell recovery script.