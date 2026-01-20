# Docker Compose Hardening Design

**Date:** 2026-01-19
**Status:** Approved
**Issue:** #808
**Epic:** #196 (Self-hosted persistent storage)

## Overview

Refactor `docker-compose.yml`, `deploy/Dockerfile`, and `deploy/nginx.conf` with production best practices for self-hosters and VPS deployments.

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

### Non-root Execution

**Decision:** Switch from `nginx:alpine` to `nginxinc/nginx-unprivileged:alpine`.

This official nginx image runs as UID 101 (non-root) from startup, eliminating the need for any Linux capabilities. Benefits:

- No root process at any point
- Drop ALL capabilities (no CHOWN/SETGID/SETUID needed)
- Smaller attack surface
- Maintained upstream by nginx team

Requires nginx to listen on port 8080 internally (unprivileged port).

### Healthcheck: Dockerfile Only

The Dockerfile has a healthcheck using `/health` endpoint (defined in nginx.conf). Updated for port 8080:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/health || exit 1
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

With non-root nginx, we can lock down maximally:

| Setting             | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `no-new-privileges` | Prevents privilege escalation via setuid/setgid |
| `cap_drop: ALL`     | Drops all Linux capabilities                    |
| `read_only: true`   | Immutable root filesystem                       |
| `tmpfs` mounts      | Writable space for nginx cache/pid without disk |

**Note:** No `cap_add` needed with nginx-unprivileged.

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

### OCI Labels

Add standard container metadata:

```dockerfile
LABEL org.opencontainers.image.source="https://github.com/RackulaLives/Rackula"
LABEL org.opencontainers.image.description="Rack Layout Designer for Homelabbers"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="Rackula"
```

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
      - "${RACKULA_PORT:-8197}:8080"
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

    # Security hardening (no cap_add needed with non-root nginx)
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
    tmpfs:
      - /var/cache/nginx:size=10M
      - /var/run:size=1M
      - /tmp:size=5M

    # Logging
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### Dockerfile

```dockerfile
# Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Build configuration
ARG VITE_ENV=production

# Umami analytics configuration (passed as build args)
ARG VITE_UMAMI_ENABLED=false
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_UMAMI_SCRIPT_URL

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install -g npm@11
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage - non-root nginx
FROM nginxinc/nginx-unprivileged:alpine

# OCI labels
LABEL org.opencontainers.image.source="https://github.com/RackulaLives/Rackula"
LABEL org.opencontainers.image.description="Rack Layout Designer for Homelabbers"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="Rackula"

# Copy nginx config and built assets
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Health check (port 8080 for unprivileged nginx)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/health || exit 1

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf (port change only)

```nginx
server {
    listen 8080;  # Changed from 80 for non-root nginx
    # ... rest unchanged
}
```

### .env.example

```bash
# Port to expose Rackula on (default: 8197, a nod to Dracula's 1897 publication)
RACKULA_PORT=8197
```

## Changes Summary

| Aspect          | Before              | After                                |
| --------------- | ------------------- | ------------------------------------ |
| Base image      | `nginx:alpine`      | `nginxinc/nginx-unprivileged:alpine` |
| Container user  | root (master)       | UID 101 (non-root)                   |
| Internal port   | 80                  | 8080                                 |
| Service name    | `Rackula`           | `rackula` (lowercase convention)     |
| Container name  | (auto-generated)    | `rackula`                            |
| Default port    | 8080                | 8197                                 |
| Port config     | Hardcoded           | Env var with default                 |
| Resource limits | None                | 128M/0.5 CPU                         |
| Capabilities    | Default (many)      | None (drop ALL)                      |
| Filesystem      | Read-write          | Read-only + tmpfs                    |
| Logging         | Default (unlimited) | 30MB rotated                         |
| OCI labels      | None                | Source, description, license, title  |

## Implementation Notes

- Requires `docker compose` (v2), not legacy `docker-compose`
- VPS deployment scripts may need port updates (8080 → 8197, internal 80 → 8080)
- Create `.env.example` for documentation
- Test container startup and healthcheck after changes
