# Leeway System Hardening Specification

**Version**: 1.0.0  
**Status**: ENTERPRISE_PRODUCTION_READY  
**Classification**: CRITICAL_INFRASTRUCTURE

## Purpose

This document defines the complete hardening requirements for the Leeway ecosystem to achieve enterprise-grade production readiness. Every service, endpoint, configuration, and data path must meet these standards.

## Security Hardening

### 1. Authentication & Authorization

#### API Authentication
```javascript
// All API endpoints MUST require authentication
const REQUIRED_AUTH_METHODS = {
  'api-key': {
    header: 'X-Leeway-API-Key',
    validation: 'sha256-hash',
    rotation: '90-days',
    storage: 'encrypted-env'
  },
  'jwt': {
    algorithm: 'RS256',
    expiry: '1-hour',
    refresh: '7-days',
    issuer: 'leeway-auth-service'
  },
  'mutual-tls': {
    required: 'production',
    ca: 'leeway-ca',
    cert-rotation: '365-days'
  }
};
```

#### Service-to-Service Authentication
- **Mutual TLS** for all inter-service communication
- **Service accounts** with minimal permissions
- **API keys** rotated every 90 days
- **JWT tokens** for user sessions (1 hour expiry)

#### User Authentication
- **Multi-factor authentication** (MFA) required for admin accounts
- **Password policy**: 16+ chars, complexity requirements
- **Account lockout**: 5 failed attempts, 30-minute lockout
- **Session timeout**: 1 hour idle, 8 hours absolute

### 2. Network Security

#### Port Binding
```yaml
# Production binding rules
services:
  agent-lee-code-mode:
    bind: "127.0.0.1:8080"  # Local only
    public: false
    
  runtime-fabric:
    bind: "127.0.0.1:4001"  # Local only
    public: false
    
  execution-broker:
    bind: "127.0.0.1:5200"  # Local only
    public: false
    
  desktop-runtime:
    bind: "127.0.0.1:8091"  # Local only
    public: false
    
  media-ingestion:
    bind: "127.0.0.1:5300"  # Local only
    public: false
    
  agent-lee-os2:
    bind: "0.0.0.0:5100"    # Public with auth
    public: true
    auth: required
    
  seafile:
    bind: "0.0.0.0:8082"    # Public with auth
    public: true
    auth: required
```

#### Firewall Rules
```powershell
# Windows Firewall rules
New-NetFirewallRule -DisplayName "Leeway-Agent-Lee" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow -LocalAddress 127.0.0.1
New-NetFirewallRule -DisplayName "Leeway-Runtime-Fabric" -Direction Inbound -LocalPort 4001 -Protocol TCP -Action Allow -LocalAddress 127.0.0.1
New-NetFirewallRule -DisplayName "Leeway-Execution-Broker" -Direction Inbound -LocalPort 5200 -Protocol TCP -Action Allow -LocalAddress 127.0.0.1
New-NetFirewallRule -DisplayName "Leeway-Desktop-Runtime" -Direction Inbound -LocalPort 8091 -Protocol TCP -Action Allow -LocalAddress 127.0.0.1
New-NetFirewallRule -DisplayName "Leeway-Media-Ingestion" -Direction Inbound -LocalPort 5300 -Protocol TCP -Action Allow -LocalAddress 127.0.0.1
New-NetFirewallRule -DisplayName "Leeway-OS2" -Direction Inbound -LocalPort 5100 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Leeway-Seafile" -Direction Inbound -LocalPort 8082 -Protocol TCP -Action Allow
```

#### TLS/SSL Configuration
```yaml
# Minimum TLS 1.3
tls:
  min_version: "1.3"
  ciphers:
    - TLS_AES_256_GCM_SHA384
    - TLS_CHACHA20_POLY1305_SHA256
    - TLS_AES_128_GCM_SHA256
  cert_rotation: 365-days
  hsts: enabled
  hsts_max_age: 31536000
```

### 3. Input Validation

#### Request Validation
```javascript
// All inputs MUST be validated
const VALIDATION_RULES = {
  'file-upload': {
    max_size: 'per-type',
    allowed_extensions: 'whitelist',
    mime_type_check: 'magic-bytes',
    virus_scan: 'required',
    content_inspection: 'enabled'
  },
  'api-parameters': {
    type_checking: 'strict',
    range_validation: 'required',
    sql_injection: 'blocked',
    xss_prevention: 'enabled',
    command_injection: 'blocked'
  },
  'file-paths': {
    path_traversal: 'blocked',
    absolute_paths_only: true,
    whitelist_directories: true,
    symlink_following: 'disabled'
  }
};
```

#### Output Encoding
- **HTML encoding** for web output
- **JSON encoding** for API responses
- **SQL parameterization** for database queries
- **Command escaping** for shell execution

### 4. Data Protection

#### Encryption at Rest
```yaml
encryption:
  database:
    algorithm: AES-256-GCM
    key_rotation: 90-days
    key_storage: hardware-security-module
    
  files:
    algorithm: AES-256-GCM
    per_file_keys: true
    key_derivation: PBKDF2-SHA256
    iterations: 100000
    
  backups:
    algorithm: AES-256-GCM
    compression: before-encryption
    integrity: HMAC-SHA256
```

#### Encryption in Transit
- **TLS 1.3** for all network communication
- **Certificate pinning** for critical services
- **Perfect forward secrecy** (PFS) required
- **HSTS** enabled with preload

#### Secrets Management
```yaml
secrets:
  storage: encrypted-vault
  access: role-based
  rotation: automatic
  audit: all-access-logged
  
  vault:
    backend: hashicorp-vault
    unsealing: shamir-secret-sharing
    audit_log: enabled
    
  environment:
    no_plaintext: true
    injection: runtime-only
    exposure: never-logged
```

### 5. Access Control

#### Role-Based Access Control (RBAC)
```yaml
roles:
  system-admin:
    permissions:
      - service:start
      - service:stop
      - service:restart
      - config:read
      - config:write
      - logs:read
      - receipts:read
      - receipts:write
      
  operator:
    permissions:
      - service:restart
      - config:read
      - logs:read
      - receipts:read
      
  auditor:
    permissions:
      - logs:read
      - receipts:read
      - metrics:read
      
  user:
    permissions:
      - api:read
      - api:write-own
      - files:read-own
      - files:write-own
```

#### Principle of Least Privilege
- Services run with **minimal permissions**
- **No root/admin** execution unless absolutely required
- **Separate service accounts** for each component
- **Read-only mounts** where possible

## Operational Hardening

### 1. Logging & Monitoring

#### Structured Logging
```javascript
// All logs MUST be structured JSON
const LOG_SCHEMA = {
  timestamp: 'ISO8601',
  level: 'ERROR|WARN|INFO|DEBUG',
  service: 'service-name',
  component: 'component-name',
  event: 'event-type',
  user: 'user-id',
  session: 'session-id',
  request_id: 'uuid',
  message: 'string',
  context: 'object',
  stack_trace: 'string-if-error'
};
```

#### Security Event Logging
```yaml
security_events:
  authentication:
    - login-success
    - login-failure
    - logout
    - session-timeout
    - mfa-challenge
    - mfa-success
    - mfa-failure
    
  authorization:
    - access-granted
    - access-denied
    - permission-escalation-attempt
    - role-change
    
  data_access:
    - file-read
    - file-write
    - file-delete
    - database-query
    - api-call
    
  system:
    - service-start
    - service-stop
    - config-change
    - secret-access
    - certificate-rotation
```

#### Log Retention
```yaml
retention:
  security_logs: 7-years
  audit_logs: 7-years
  operational_logs: 1-year
  debug_logs: 30-days
  
storage:
  location: Archive/logs/
  format: json-lines
  compression: gzip
  encryption: AES-256-GCM
  integrity: HMAC-SHA256
```

### 2. Health Monitoring

#### Health Check Requirements
```javascript
// All services MUST implement health checks
const HEALTH_CHECK_SPEC = {
  endpoint: '/health',
  method: 'GET',
  timeout: 5000,
  interval: 30000,
  retries: 3,
  
  response: {
    status: 'healthy|degraded|unhealthy',
    timestamp: 'ISO8601',
    uptime: 'seconds',
    version: 'semver',
    dependencies: [
      {
        name: 'string',
        status: 'healthy|degraded|unhealthy',
        latency: 'milliseconds'
      }
    ],
    metrics: {
      cpu: 'percentage',
      memory: 'bytes',
      disk: 'bytes',
      connections: 'count'
    }
  }
};
```

#### Alerting Thresholds
```yaml
alerts:
  critical:
    - service-down
    - authentication-failure-spike
    - disk-space-critical
    - memory-exhaustion
    - certificate-expiring-7-days
    
  warning:
    - service-degraded
    - high-error-rate
    - disk-space-low
    - memory-high
    - certificate-expiring-30-days
    
  info:
    - service-restart
    - config-change
    - backup-completed
    - certificate-rotated
```

### 3. Backup & Recovery

#### Backup Strategy
```yaml
backups:
  frequency:
    full: daily-2am
    incremental: hourly
    continuous: seafile-sync
    
  retention:
    daily: 30-days
    weekly: 12-weeks
    monthly: 12-months
    yearly: 7-years
    
  verification:
    integrity: every-backup
    restore-test: weekly
    disaster-recovery-drill: quarterly
    
  storage:
    primary: local-seafile
    secondary: external-drive
    tertiary: cloud-backup
```

#### Recovery Time Objectives (RTO)
```yaml
rto:
  critical_services: 15-minutes
  standard_services: 1-hour
  non_critical: 4-hours
  
rpo:
  critical_data: 1-hour
  standard_data: 4-hours
  non_critical: 24-hours
```

### 4. Error Handling

#### Error Response Format
```javascript
// Never expose internal details
const ERROR_RESPONSE = {
  ok: false,
  error: 'ERROR_CODE',
  message: 'User-friendly message',
  request_id: 'uuid',
  timestamp: 'ISO8601',
  // NO stack traces
  // NO internal paths
  // NO database errors
  // NO sensitive data
};
```

#### Error Categories
```yaml
errors:
  client_errors:
    - INVALID_INPUT
    - UNAUTHORIZED
    - FORBIDDEN
    - NOT_FOUND
    - RATE_LIMIT_EXCEEDED
    
  server_errors:
    - INTERNAL_ERROR
    - SERVICE_UNAVAILABLE
    - TIMEOUT
    - DEPENDENCY_FAILURE
    
  security_errors:
    - AUTHENTICATION_FAILED
    - AUTHORIZATION_FAILED
    - TOKEN_EXPIRED
    - INVALID_SIGNATURE
```

## Infrastructure Hardening

### 1. Container Security

#### Docker Hardening
```yaml
docker:
  user: non-root
  read_only_root: true
  no_new_privileges: true
  capabilities: drop-all
  seccomp: default-profile
  apparmor: enabled
  
  resource_limits:
    memory: defined
    cpu: defined
    pids: limited
    
  network:
    user_defined: true
    internal: true
    no_host_network: true
```

#### Image Security
```yaml
images:
  source: official-only
  scanning: trivy-scan
  signing: cosign-verify
  updates: automated-weekly
  
  base_images:
    - alpine:latest
    - node:18-alpine
    - python:3.11-alpine
```

### 2. Database Hardening

#### MariaDB/MySQL Hardening
```sql
-- Remove test databases
DROP DATABASE IF EXISTS test;

-- Remove anonymous users
DELETE FROM mysql.user WHERE User='';

-- Disable remote root
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- Set strong password policy
SET GLOBAL validate_password.policy = STRONG;
SET GLOBAL validate_password.length = 16;

-- Enable audit logging
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'FILE';

-- Limit connections
SET GLOBAL max_connections = 100;
SET GLOBAL max_user_connections = 50;

FLUSH PRIVILEGES;
```

#### Connection Security
```yaml
database:
  ssl: required
  cert_verify: true
  connection_timeout: 10
  query_timeout: 30
  max_connections: 100
  connection_pooling: enabled
```

### 3. File System Hardening

#### Directory Permissions
```powershell
# Restrict permissions
icacls "Archive" /inheritance:r /grant:r "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" "LeewayService:(OI)(CI)M"
icacls "seafile" /inheritance:r /grant:r "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" "LeewayService:(OI)(CI)M"
icacls "media-ingestion-layer" /inheritance:r /grant:r "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" "LeewayService:(OI)(CI)M"
```

#### File Integrity Monitoring
```yaml
fim:
  directories:
    - Archive/receipts/
    - Archive/ledgers/
    - Archive/manifests/
    - Archive/runtime-state/
    
  actions:
    - create
    - modify
    - delete
    - permissions
    
  alerts:
    - unauthorized-modification
    - unexpected-deletion
    - permission-change
```

## Compliance Hardening

### 1. Audit Trail

#### Audit Requirements
```yaml
audit:
  events:
    - all-authentication
    - all-authorization
    - all-data-access
    - all-config-changes
    - all-secret-access
    - all-admin-actions
    
  format: json-structured
  storage: immutable
  retention: 7-years
  encryption: AES-256-GCM
  integrity: blockchain-hash-chain
```

#### Receipt Requirements
```yaml
receipts:
  mandatory_for:
    - all-service-actions
    - all-data-mutations
    - all-system-changes
    - all-backup-operations
    - all-restore-operations
    
  schema: leeway-receipt-v1
  storage: Archive/receipts/
  retention: forever
  integrity: HMAC-SHA256
```

### 2. Data Governance

#### Data Classification
```yaml
classification:
  public:
    encryption: optional
    access: unrestricted
    retention: business-need
    
  internal:
    encryption: required
    access: authenticated-users
    retention: 7-years
    
  confidential:
    encryption: required
    access: role-based
    retention: 7-years
    audit: all-access
    
  restricted:
    encryption: required
    access: explicit-approval
    retention: 7-years
    audit: all-access
    mfa: required
```

#### Data Retention
```yaml
retention:
  receipts: forever
  ledgers: forever
  manifests: forever
  logs: 1-7-years
  backups: 7-years
  user_data: user-controlled
  temp_files: 24-hours
```

## Deployment Hardening

### 1. Pre-Deployment Checklist

```yaml
pre_deployment:
  security:
    - [ ] All secrets rotated
    - [ ] TLS certificates valid
    - [ ] Firewall rules configured
    - [ ] Authentication enabled
    - [ ] Authorization configured
    - [ ] Encryption enabled
    
  configuration:
    - [ ] Environment variables set
    - [ ] Resource limits defined
    - [ ] Health checks configured
    - [ ] Logging configured
    - [ ] Monitoring configured
    - [ ] Alerting configured
    
  testing:
    - [ ] Security scan passed
    - [ ] Penetration test passed
    - [ ] Load test passed
    - [ ] Failover test passed
    - [ ] Backup/restore test passed
    - [ ] Disaster recovery drill passed
```

### 2. Post-Deployment Validation

```yaml
post_deployment:
  immediate:
    - [ ] All services healthy
    - [ ] Authentication working
    - [ ] Authorization working
    - [ ] Logging working
    - [ ] Monitoring working
    - [ ] Backups running
    
  24_hours:
    - [ ] No critical alerts
    - [ ] Performance acceptable
    - [ ] Error rate acceptable
    - [ ] Backup completed
    - [ ] Logs reviewed
    
  7_days:
    - [ ] Security scan clean
    - [ ] Audit log review
    - [ ] Performance tuning
    - [ ] Capacity planning
```

## Incident Response

### 1. Security Incident Response

```yaml
incident_response:
  detection:
    - automated-alerts
    - log-analysis
    - anomaly-detection
    - user-reports
    
  containment:
    - isolate-affected-systems
    - revoke-compromised-credentials
    - block-malicious-ips
    - preserve-evidence
    
  eradication:
    - remove-malware
    - patch-vulnerabilities
    - rotate-secrets
    - update-firewall-rules
    
  recovery:
    - restore-from-backup
    - verify-integrity
    - monitor-closely
    - document-lessons-learned
```

### 2. Disaster Recovery

```yaml
disaster_recovery:
  scenarios:
    - hardware-failure
    - data-corruption
    - ransomware-attack
    - natural-disaster
    - human-error
    
  procedures:
    - assess-damage
    - activate-dr-plan
    - restore-from-backup
    - verify-integrity
    - resume-operations
    - post-mortem-analysis
```

## Non-Negotiables

1. **Authentication required** for all API endpoints
2. **TLS 1.3** for all network communication
3. **Encryption at rest** for all sensitive data
4. **Structured logging** for all events
5. **Health checks** for all services
6. **Receipts** for all operations
7. **Backups** tested weekly
8. **Security scans** automated
9. **Secrets** never in code or logs
10. **Least privilege** always enforced

## Hardening Validation

### Security Audit Checklist
```yaml
audit:
  authentication:
    - [ ] MFA enabled for admins
    - [ ] Password policy enforced
    - [ ] Session timeout configured
    - [ ] Account lockout enabled
    
  network:
    - [ ] TLS 1.3 enforced
    - [ ] Firewall rules active
    - [ ] Port binding correct
    - [ ] Certificate valid
    
  data:
    - [ ] Encryption at rest enabled
    - [ ] Encryption in transit enabled
    - [ ] Backups encrypted
    - [ ] Secrets in vault
    
  monitoring:
    - [ ] Logging enabled
    - [ ] Alerting configured
    - [ ] Health checks active
    - [ ] Metrics collected
    
  compliance:
    - [ ] Audit trail complete
    - [ ] Receipts generated
    - [ ] Retention enforced
    - [ ] Access logged
```

## Conclusion

This hardening specification defines the minimum security, operational, and compliance requirements for enterprise-grade production deployment of the Leeway ecosystem. Every service must meet these standards before being marked PRODUCTION_READY.