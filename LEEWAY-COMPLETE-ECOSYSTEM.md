# Leeway Complete Ecosystem Management

## Overview

This is the **master docker-compose file** that manages the entire Leeway ecosystem as one integrated system.

## Services Included

### Core Services
1. **Runtime Fabric** (`runtime-fabric`) - Port 4001
   - Service orchestration and registry
   - Central coordination point

2. **Agent Lee Router** (`agent-lee`) - Port 8081
   - Main orchestration and routing
   - Connects all services together

### Voice Services
3. **Voice Kernel** (`voice-kernel`) - Port 8092
   - XTTS-v2 voice synthesis
   - Agent Lee voice identity
   - NEW: Just added to ecosystem

4. **Voice Kernel Enforcer** (`voice-kernel-enforcer`)
   - Policy enforcement
   - Ensures only XTTS-v2 is used

### Model Runtime
5. **Ollama** (`ollama`) - Port 11434
   - Local model runtime
   - Hosts qwen3, qwen2.5-coder, deepseek-coder, qwen2.5vl

### Document Management
6. **Seafile** (`seafile`) - Port 8082
   - Document management system
   - Web interface

7. **Seafile Database** (`seafile-db`)
   - MariaDB 10.11
   - Seafile data storage

8. **Seafile Cache** (`seafile-cache`)
   - Memcached 1.6
   - Performance optimization

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Leeway Network                           │
│                    (Docker Bridge)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Runtime Fabric (4001)                             │   │
│  │  Central orchestration and service registry        │   │
│  └──────────────────┬─────────────────────────────────┘   │
│                     │                                       │
│                     ▼                                       │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Agent Lee Router (8081)                           │   │
│  │  Main coordination hub                             │   │
│  └───┬────────┬────────┬────────┬──────────────────────┘   │
│      │        │        │        │                           │
│      ▼        ▼        ▼        ▼                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐                  │
│  │Voice │ │Ollama│ │Seafile│ │Desktop   │                  │
│  │Kernel│ │11434 │ │8082  │ │Runtime   │                  │
│  │8092  │ │      │ │      │ │8091      │                  │
│  └──────┘ └──────┘ └──────┘ └──────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Start Everything
```bash
docker-compose -f docker-compose.leeway-complete.yml up -d
```

### Stop Everything
```bash
docker-compose -f docker-compose.leeway-complete.yml down
```

### View All Services
```bash
docker-compose -f docker-compose.leeway-complete.yml ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.leeway-complete.yml logs -f

# Specific service
docker-compose -f docker-compose.leeway-complete.yml logs -f voice-kernel
docker-compose -f docker-compose.leeway-complete.yml logs -f agent-lee
```

## Service Management

### Start Individual Services
```bash
# Start just Voice Kernel
docker-compose -f docker-compose.leeway-complete.yml up -d voice-kernel

# Start just Agent Lee
docker-compose -f docker-compose.leeway-complete.yml up -d agent-lee

# Start just Ollama
docker-compose -f docker-compose.leeway-complete.yml up -d ollama
```

### Stop Individual Services
```bash
docker-compose -f docker-compose.leeway-complete.yml stop voice-kernel
docker-compose -f docker-compose.leeway-complete.yml stop agent-lee
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.leeway-complete.yml restart

# Restart specific service
docker-compose -f docker-compose.leeway-complete.yml restart voice-kernel
```

### Rebuild Services
```bash
# Rebuild Voice Kernel
docker-compose -f docker-compose.leeway-complete.yml build --no-cache voice-kernel

# Rebuild and restart
docker-compose -f docker-compose.leeway-complete.yml up -d --build voice-kernel
```

## Health Checks

### Check All Services
```bash
docker-compose -f docker-compose.leeway-complete.yml ps
```

### Individual Health Checks
```bash
# Runtime Fabric
curl http://localhost:4001/health

# Agent Lee
curl http://localhost:8081/health

# Voice Kernel
curl http://localhost:8092/health

# Ollama
curl http://localhost:11434/api/tags

# Seafile
curl http://localhost:8082
```

## Service URLs

| Service | Internal URL | External URL | Purpose |
|---------|-------------|--------------|---------|
| Runtime Fabric | http://runtime-fabric:4001 | http://localhost:4001 | Service registry |
| Agent Lee | http://agent-lee:8080 | http://localhost:8081 | Main router |
| Voice Kernel | http://voice-kernel:8092 | http://localhost:8092 | Voice synthesis |
| Ollama | http://ollama:11434 | http://localhost:11434 | Model runtime |
| Seafile | http://seafile:80 | http://localhost:8082 | Document management |

## Volumes

### Voice Kernel Volumes
- `voice-kernel-cache` - Model cache (persistent)
- `voice-kernel-output` - Generated audio files
- `voice-kernel-logs` - Application logs

### Seafile Volumes
- `seafile-data` - Document storage
- `seafile-db` - Database files
- `seafile-cache` - Cache data

### Ollama Volumes
- `ollama-data` - Model storage

## Environment Variables

### Agent Lee
- `VOICE_KERNEL_URL=http://voice-kernel:8092` - Voice Kernel endpoint
- `VOICE_KERNEL_ENABLED=true` - Enable voice features
- `OLLAMA_URL=http://ollama:11434` - Ollama endpoint
- `RUNTIME_FABRIC_URL=http://runtime-fabric:4001` - Runtime Fabric endpoint

### Voice Kernel
- `VOICE_KERNEL_PORT=8092` - API port
- `RUNTIME_FABRIC_URL=http://runtime-fabric:4001` - Runtime Fabric endpoint
- `AGENT_LEE_ROUTER_URL=http://agent-lee:8080` - Agent Lee endpoint
- `DESKTOP_RUNTIME_URL=http://host.docker.internal:8091` - Desktop Runtime endpoint

## Startup Order

The docker-compose file ensures services start in the correct order:

1. **Infrastructure**: seafile-db, seafile-cache, voice-kernel-enforcer
2. **Core Services**: runtime-fabric, ollama
3. **Main Services**: agent-lee, voice-kernel, seafile

Dependencies are managed automatically by docker-compose.

## Testing the Complete System

### 1. Verify All Services Running
```bash
docker-compose -f docker-compose.leeway-complete.yml ps
```

Expected output: All services should show "Up" status.

### 2. Test Voice Kernel Integration
```bash
# From Agent Lee container
docker exec leeway-ecosystemv214-agent-lee curl http://voice-kernel:8092/health

# From host
curl http://localhost:8092/health
```

### 3. Test Voice Generation
```bash
curl -X POST http://localhost:8092/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"System online. Agent Lee runtime initialized.","voice":"agent-lee"}'
```

### 4. Test Ollama
```bash
curl http://localhost:11434/api/tags
```

### 5. Test Seafile
```bash
curl http://localhost:8082
```

## Troubleshooting

### Service Won't Start

1. Check logs:
```bash
docker-compose -f docker-compose.leeway-complete.yml logs service-name
```

2. Check if port is already in use:
```bash
netstat -ano | findstr :8092  # Windows
lsof -i :8092                 # Linux/Mac
```

3. Restart the service:
```bash
docker-compose -f docker-compose.leeway-complete.yml restart service-name
```

### Voice Kernel Issues

**Problem**: Voice Kernel not starting
```bash
# Check logs
docker logs agent-lee-voice-kernel --tail 50

# Verify voice sample is mounted
docker exec agent-lee-voice-kernel ls -l /app/voice-samples/

# Rebuild if needed
docker-compose -f docker-compose.leeway-complete.yml build --no-cache voice-kernel
docker-compose -f docker-compose.leeway-complete.yml up -d voice-kernel
```

**Problem**: Agent Lee can't reach Voice Kernel
```bash
# Test connectivity
docker exec leeway-ecosystemv214-agent-lee ping voice-kernel
docker exec leeway-ecosystemv214-agent-lee curl http://voice-kernel:8092/health
```

### Network Issues

**Problem**: Services can't communicate
```bash
# Verify network exists
docker network inspect leeway-network

# Recreate network if needed
docker network rm leeway-network
docker network create leeway-network

# Restart services
docker-compose -f docker-compose.leeway-complete.yml down
docker-compose -f docker-compose.leeway-complete.yml up -d
```

## Backup and Recovery

### Backup All Data
```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup volumes
docker run --rm -v voice-kernel-cache:/data -v $(pwd)/backups:/backup alpine tar czf /backup/voice-kernel-cache.tar.gz -C /data .
docker run --rm -v seafile-data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/seafile-data.tar.gz -C /data .
docker run --rm -v ollama-data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/ollama-data.tar.gz -C /data .
```

### Restore Data
```bash
# Restore voice-kernel-cache
docker run --rm -v voice-kernel-cache:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/voice-kernel-cache.tar.gz -C /data

# Restart services
docker-compose -f docker-compose.leeway-complete.yml restart voice-kernel
```

## Upgrading Services

### Upgrade Voice Kernel
```bash
# Stop service
docker-compose -f docker-compose.leeway-complete.yml stop voice-kernel

# Rebuild with latest code
docker-compose -f docker-compose.leeway-complete.yml build --no-cache voice-kernel

# Start with new image
docker-compose -f docker-compose.leeway-complete.yml up -d voice-kernel

# Verify
docker logs agent-lee-voice-kernel --tail 20
```

### Upgrade All Services
```bash
# Pull latest images
docker-compose -f docker-compose.leeway-complete.yml pull

# Rebuild custom images
docker-compose -f docker-compose.leeway-complete.yml build --no-cache

# Restart with new images
docker-compose -f docker-compose.leeway-complete.yml up -d
```

## Resource Management

### View Resource Usage
```bash
docker stats
```

### Set Resource Limits

Edit `docker-compose.leeway-complete.yml` and add:
```yaml
services:
  voice-kernel:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          cpus: '2.0'
          memory: 4G
```

## Monitoring

### Real-time Logs
```bash
# All services
docker-compose -f docker-compose.leeway-complete.yml logs -f

# Specific services
docker-compose -f docker-compose.leeway-complete.yml logs -f voice-kernel agent-lee
```

### Service Status
```bash
# Detailed status
docker-compose -f docker-compose.leeway-complete.yml ps -a

# Health check status
docker inspect agent-lee-voice-kernel --format='{{.State.Health.Status}}'
```

## Complete Shutdown

### Graceful Shutdown
```bash
# Stop all services
docker-compose -f docker-compose.leeway-complete.yml down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.leeway-complete.yml down -v
```

### Emergency Shutdown
```bash
# Force stop all containers
docker stop $(docker ps -q --filter network=leeway-network)

# Remove all containers
docker rm $(docker ps -aq --filter network=leeway-network)
```

## Production Deployment

### Recommended Settings

1. **Enable restart policies** (already configured)
2. **Set resource limits** (see Resource Management)
3. **Configure logging**:
```yaml
services:
  voice-kernel:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

4. **Use secrets for passwords** (instead of environment variables)
5. **Enable TLS/SSL** for external access
6. **Set up monitoring** (Prometheus, Grafana)

## Summary

This docker-compose file provides:

✅ **Unified Management**: All services in one file
✅ **Proper Dependencies**: Services start in correct order
✅ **Health Checks**: Automatic monitoring
✅ **Persistent Storage**: Data survives restarts
✅ **Network Isolation**: Secure internal communication
✅ **Easy Scaling**: Add/remove services easily

## Quick Reference

```bash
# Start everything
docker-compose -f docker-compose.leeway-complete.yml up -d

# Stop everything
docker-compose -f docker-compose.leeway-complete.yml down

# View status
docker-compose -f docker-compose.leeway-complete.yml ps

# View logs
docker-compose -f docker-compose.leeway-complete.yml logs -f

# Restart service
docker-compose -f docker-compose.leeway-complete.yml restart voice-kernel

# Rebuild service
docker-compose -f docker-compose.leeway-complete.yml build --no-cache voice-kernel
docker-compose -f docker-compose.leeway-complete.yml up -d voice-kernel
```

## Support

For issues:
1. Check logs: `docker-compose -f docker-compose.leeway-complete.yml logs service-name`
2. Verify health: `curl http://localhost:PORT/health`
3. Check network: `docker network inspect leeway-network`
4. Review receipts: `Archive/receipts/`