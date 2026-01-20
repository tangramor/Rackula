# Docker Compose Hardening Design

**Date:** 2026-01-19
**Status:** Approved

## Overview

Refactor the minimal `docker-compose.yml` to include production best practices: resource limits, security hardening, and logging configuration.

## Context

The current `docker-compose.yml` is minimal:

```yaml
services:
  Rackula:
    image: ghcr.io/rackulalives/rackula:latest
    ports:
      - "8080:80"
    restart: unless-stopped
```

This serves both self-hosters and the production VPS deployment (count.racku.la). Needs to work out of the box while being configurable.

## Decisions

### Healthcheck: Dockerfile Only

The Dockerfile already has a healthcheck:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1
```

**Decision:** Keep healthcheck in Dockerfile only. This makes the image portable across docker run, compose, and orchestrators without duplication.

### Resource Limits: Based on Observed Usage

Measured production containers:

- `rackula-app`: 1.4 MiB memory, 0% CPU
- `rackula-dev`: 2.6 MiB memory, 0% CPU

Production runs behind Cloudflare which caches and absorbs traffic. Self-hosters hitting nginx directly will see higher usage.

**Decision:** 2x safety margin over what would otherwise be reasonable limits:

- Memory: 128M limit, 16M reservation
- CPU: 0.50 limit, 0.10 reservation

### Security Hardening

nginx serving static files can be locked down aggressively:

| Setting                        | Purpose                                         |
| ------------------------------ | ----------------------------------------------- |
| `no-new-privileges`            | Prevents privilege escalation via setuid/setgid |
| `cap_drop: ALL`                | Drops all Linux capabilities                    |
| `cap_add: CHOWN/SETGID/SETUID` | Only caps nginx needs to drop to nginx user     |
| `read_only: true`              | Immutable root filesystem                       |
| `tmpfs` mounts                 | Writable space for nginx cache/pid without disk |

**Future consideration:** When adding persistent storage (docker volume), it will be writable despite `read_only: true` since volumes mount after the flag applies.

### Logging

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

30MB total max, auto-rotates. Sufficient for debugging while preventing disk fill.

### Port Convention

**Decision:** Default port 8197 (embeds 1897, the year Dracula was published, while staying in the familiar 8xxx web port range). Configurable via `RACKULA_PORT` env var.

## Final Design

### docker-compose.yml

```yaml
services:
  rackula:
    image: ghcr.io/rackulalives/rackula:latest
    # To build locally instead, comment out 'image' and uncomment 'build':
    # build: ./deploy
    container_name: rackula
    ports:
      - "${RACKULA_PORT:-8197}:80"
    restart: unless-stopped

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 128M
        reservations:
          cpus: "0.10"
          memory: 16M

    # Security hardening
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    read_only: true
    tmpfs:
      - /var/cache/nginx:size=10M
      - /var/run:size=1M

    # Logging
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### .env.example

```bash
# Port to expose Rackula on (default: 8197, a nod to Dracula's 1897 publication)
RACKULA_PORT=8197
```

## Changes Summary

| Aspect          | Before              | After                            |
| --------------- | ------------------- | -------------------------------- |
| Service name    | `Rackula`           | `rackula` (lowercase convention) |
| Container name  | (auto-generated)    | `rackula`                        |
| Default port    | 8080                | 8197                             |
| Port config     | Hardcoded           | Env var with default             |
| Resource limits | None                | 128M/0.5 CPU                     |
| Security        | None                | Full hardening                   |
| Logging         | Default (unlimited) | 30MB rotated                     |
| Healthcheck     | None in compose     | Inherited from Dockerfile        |

## Implementation Notes

- Requires `docker compose` (v2), not legacy `docker-compose`
- No changes needed to Dockerfile (healthcheck already present)
- Create `.env.example` for documentation
- Update any deployment scripts that reference port 8080
