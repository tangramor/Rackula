# Persistent Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable self-hosted Rackula deployments to persist layouts to Docker volumes via an optional API sidecar, while maintaining the zero-config static deployment model for SaaS.

**Architecture:** Filesystem-based persistence with a tiny API sidecar. The SPA communicates with `/api/layouts/*` endpoints when persistence is enabled. nginx proxies API requests to the sidecar container. When `RACKULA_PERSIST_ENABLED=false` (default), the app behaves exactly as today.

**Tech Stack:** Bun (API sidecar), YAML files on disk, Docker Compose profiles, Zod validation

---

## Phase 1: API Sidecar Implementation

### Task 1: Create API Sidecar Package Structure

**Files:**

- Create: `api/package.json`
- Create: `api/tsconfig.json`
- Create: `api/.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "@rackula/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "test": "bun test",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "zod": "^3.24.1",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/bun": "^1.1.14",
    "@types/js-yaml": "^4.0.9",
    "typescript": "^5.7.3"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create .gitignore**

```
node_modules/
*.log
```

**Step 4: Commit**

```bash
git add api/
git commit -m "chore: scaffold API sidecar package structure"
```

---

### Task 2: Implement Layout Schema for API

**Files:**

- Create: `api/src/schemas/layout.ts`

**Step 1: Create the schema file**

```typescript
/**
 * Layout validation schemas for API
 * Mirrors src/lib/schemas/index.ts from main app
 */
import { z } from "zod";

// Minimal schema for layout metadata (we don't need full validation here)
// The full schema validation happens in the SPA
export const LayoutMetadataSchema = z.object({
  version: z.string(),
  name: z.string().min(1, "Layout name is required"),
});

// Schema for layout ID (filename without extension)
export const LayoutIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
    "Layout ID must be lowercase alphanumeric with hyphens, not starting/ending with hyphen",
  );

// Layout list item returned by GET /api/layouts
export const LayoutListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  updatedAt: z.string().datetime(),
});

export type LayoutMetadata = z.infer<typeof LayoutMetadataSchema>;
export type LayoutListItem = z.infer<typeof LayoutListItemSchema>;
```

**Step 2: Commit**

```bash
git add api/src/schemas/layout.ts
git commit -m "feat(api): add layout validation schemas"
```

---

### Task 3: Implement File System Storage Layer

**Files:**

- Create: `api/src/storage/filesystem.ts`

**Step 1: Create the storage layer**

```typescript
/**
 * Filesystem storage layer for layouts
 * Reads/writes YAML files to DATA_DIR
 */
import {
  readdir,
  readFile,
  writeFile,
  unlink,
  stat,
  mkdir,
} from "node:fs/promises";
import { join, basename } from "node:path";
import * as yaml from "js-yaml";
import { LayoutMetadataSchema, type LayoutListItem } from "../schemas/layout";

const DATA_DIR = process.env.DATA_DIR ?? "/data";
const ASSETS_DIR = "assets";

/**
 * Ensure data directory exists
 */
export async function ensureDataDir(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await mkdir(join(DATA_DIR, ASSETS_DIR), { recursive: true });
  } catch (error) {
    // Directory already exists, ignore
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

/**
 * Slugify a layout name to create a safe filename
 */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "untitled"
  );
}

/**
 * List all layouts in the data directory
 */
export async function listLayouts(): Promise<LayoutListItem[]> {
  await ensureDataDir();

  const files = await readdir(DATA_DIR);
  const yamlFiles = files.filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
  );

  const layouts: LayoutListItem[] = [];

  for (const file of yamlFiles) {
    try {
      const filePath = join(DATA_DIR, file);
      const content = await readFile(filePath, "utf-8");
      const parsed = yaml.load(content) as unknown;
      const metadata = LayoutMetadataSchema.safeParse(parsed);

      if (metadata.success) {
        const stats = await stat(filePath);
        layouts.push({
          id: basename(file, ".yaml").replace(".yml", ""),
          name: metadata.data.name,
          version: metadata.data.version,
          updatedAt: stats.mtime.toISOString(),
        });
      }
    } catch {
      // Skip files that can't be parsed
      console.warn(`Skipping invalid layout file: ${file}`);
    }
  }

  // Sort by most recently updated
  return layouts.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/**
 * Get a single layout by ID
 */
export async function getLayout(id: string): Promise<string | null> {
  await ensureDataDir();

  // Try .yaml first, then .yml
  for (const ext of [".yaml", ".yml"]) {
    const filePath = join(DATA_DIR, `${id}${ext}`);
    try {
      const content = await readFile(filePath, "utf-8");
      return content;
    } catch {
      // File doesn't exist with this extension
    }
  }

  return null;
}

/**
 * Save a layout (create or update)
 * Returns the layout ID (may differ from input if name changed)
 */
export async function saveLayout(
  yamlContent: string,
  existingId?: string,
): Promise<{ id: string; isNew: boolean }> {
  await ensureDataDir();

  // Parse to get the name for the filename
  const parsed = yaml.load(yamlContent) as unknown;
  const metadata = LayoutMetadataSchema.parse(parsed);
  const newId = slugify(metadata.name);

  // If updating and the ID changed (name changed), delete the old file
  if (existingId && existingId !== newId) {
    await deleteLayout(existingId);
  }

  const filePath = join(DATA_DIR, `${newId}.yaml`);

  // Check if this is a new layout
  let isNew = true;
  try {
    await stat(filePath);
    isNew = false;
  } catch {
    // File doesn't exist, it's new
  }

  await writeFile(filePath, yamlContent, "utf-8");

  return { id: newId, isNew };
}

/**
 * Delete a layout by ID
 */
export async function deleteLayout(id: string): Promise<boolean> {
  for (const ext of [".yaml", ".yml"]) {
    const filePath = join(DATA_DIR, `${id}${ext}`);
    try {
      await unlink(filePath);
      return true;
    } catch {
      // File doesn't exist with this extension
    }
  }
  return false;
}

/**
 * Get assets directory path for a layout
 */
export function getAssetsPath(layoutId: string): string {
  return join(DATA_DIR, ASSETS_DIR, layoutId);
}
```

**Step 2: Commit**

```bash
git add api/src/storage/filesystem.ts
git commit -m "feat(api): implement filesystem storage layer"
```

---

### Task 4: Implement Hono API Routes

**Files:**

- Create: `api/src/routes/layouts.ts`
- Create: `api/src/index.ts`

**Step 1: Create the layouts routes**

```typescript
/**
 * Layout API routes
 * GET    /api/layouts     - List all layouts
 * GET    /api/layouts/:id - Get layout by ID
 * PUT    /api/layouts/:id - Create or update layout
 * DELETE /api/layouts/:id - Delete layout
 */
import { Hono } from "hono";
import { LayoutIdSchema } from "../schemas/layout";
import {
  listLayouts,
  getLayout,
  saveLayout,
  deleteLayout,
} from "../storage/filesystem";

const layouts = new Hono();

// List all layouts
layouts.get("/", async (c) => {
  try {
    const items = await listLayouts();
    return c.json({ layouts: items });
  } catch (error) {
    console.error("Failed to list layouts:", error);
    return c.json({ error: "Failed to list layouts" }, 500);
  }
});

// Get a single layout
layouts.get("/:id", async (c) => {
  const id = c.req.param("id");

  // Validate ID format
  const idResult = LayoutIdSchema.safeParse(id);
  if (!idResult.success) {
    return c.json({ error: "Invalid layout ID format" }, 400);
  }

  try {
    const content = await getLayout(id);
    if (!content) {
      return c.json({ error: "Layout not found" }, 404);
    }

    // Return raw YAML with appropriate content type
    return c.text(content, 200, {
      "Content-Type": "text/yaml",
    });
  } catch (error) {
    console.error(`Failed to get layout ${id}:`, error);
    return c.json({ error: "Failed to get layout" }, 500);
  }
});

// Create or update a layout
layouts.put("/:id", async (c) => {
  const id = c.req.param("id");

  // Validate ID format
  const idResult = LayoutIdSchema.safeParse(id);
  if (!idResult.success) {
    return c.json({ error: "Invalid layout ID format" }, 400);
  }

  try {
    const yamlContent = await c.req.text();

    if (!yamlContent.trim()) {
      return c.json({ error: "Request body is empty" }, 400);
    }

    const result = await saveLayout(yamlContent, id);

    return c.json(
      {
        id: result.id,
        message: result.isNew ? "Layout created" : "Layout updated",
      },
      result.isNew ? 201 : 200,
    );
  } catch (error) {
    console.error(`Failed to save layout ${id}:`, error);

    // Check for validation errors
    if (error instanceof Error && error.message.includes("required")) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ error: "Failed to save layout" }, 500);
  }
});

// Delete a layout
layouts.delete("/:id", async (c) => {
  const id = c.req.param("id");

  // Validate ID format
  const idResult = LayoutIdSchema.safeParse(id);
  if (!idResult.success) {
    return c.json({ error: "Invalid layout ID format" }, 400);
  }

  try {
    const deleted = await deleteLayout(id);
    if (!deleted) {
      return c.json({ error: "Layout not found" }, 404);
    }

    return c.json({ message: "Layout deleted" }, 200);
  } catch (error) {
    console.error(`Failed to delete layout ${id}:`, error);
    return c.json({ error: "Failed to delete layout" }, 500);
  }
});

export default layouts;
```

**Step 2: Create the main entry point**

```typescript
/**
 * Rackula API Sidecar
 * Provides persistence layer for self-hosted deployments
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import layouts from "./routes/layouts";
import { ensureDataDir } from "./storage/filesystem";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*", // nginx handles CORS in production
    allowMethods: ["GET", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

// Health check
app.get("/health", (c) => c.text("OK"));

// Mount routes
app.route("/api/layouts", layouts);

// 404 handler
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

// Startup
const port = parseInt(process.env.PORT ?? "3001", 10);

// Ensure data directory exists before starting
await ensureDataDir();

console.log(`Rackula API listening on port ${port}`);
console.log(`Data directory: ${process.env.DATA_DIR ?? "/data"}`);

export default {
  port,
  fetch: app.fetch,
};
```

**Step 3: Commit**

```bash
git add api/src/
git commit -m "feat(api): implement Hono API routes for layout CRUD"
```

---

### Task 5: Add API Tests

**Files:**

- Create: `api/src/routes/layouts.test.ts`
- Create: `api/src/storage/filesystem.test.ts`

**Step 1: Create storage tests**

```typescript
/**
 * Filesystem storage tests
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Override DATA_DIR before importing storage module
const testDir = await mkdtemp(join(tmpdir(), "rackula-test-"));
process.env.DATA_DIR = testDir;

// Now import storage functions
const { listLayouts, getLayout, saveLayout, deleteLayout, slugify } =
  await import("./filesystem");

describe("slugify", () => {
  it("converts name to lowercase slug", () => {
    expect(slugify("My Home Lab")).toBe("my-home-lab");
  });

  it("handles special characters", () => {
    expect(slugify("Rack #1 (Main)")).toBe("rack-1-main");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("untitled");
  });

  it("truncates long names", () => {
    const longName = "a".repeat(200);
    expect(slugify(longName).length).toBeLessThanOrEqual(100);
  });
});

describe("listLayouts", () => {
  beforeEach(async () => {
    // Clean test directory
    const files = await Bun.file(testDir).exists();
  });

  it("returns empty array when no layouts exist", async () => {
    const layouts = await listLayouts();
    expect(layouts).toEqual([]);
  });

  it("lists valid YAML files", async () => {
    await writeFile(
      join(testDir, "test-layout.yaml"),
      'version: "1.0.0"\nname: Test Layout\nracks: []',
    );

    const layouts = await listLayouts();
    expect(layouts.length).toBe(1);
    expect(layouts[0].id).toBe("test-layout");
    expect(layouts[0].name).toBe("Test Layout");
  });

  afterEach(async () => {
    // Clean up test files
    try {
      const files = await Bun.file(testDir).exists();
    } catch {
      // Ignore
    }
  });
});

describe("saveLayout and getLayout", () => {
  it("saves and retrieves layout", async () => {
    const yamlContent = 'version: "1.0.0"\nname: My Layout\nracks: []';
    const result = await saveLayout(yamlContent, "my-layout");

    expect(result.id).toBe("my-layout");
    expect(result.isNew).toBe(true);

    const retrieved = await getLayout("my-layout");
    expect(retrieved).toBe(yamlContent);
  });

  it("returns null for non-existent layout", async () => {
    const result = await getLayout("does-not-exist");
    expect(result).toBeNull();
  });
});

describe("deleteLayout", () => {
  it("deletes existing layout", async () => {
    await writeFile(
      join(testDir, "to-delete.yaml"),
      'version: "1.0.0"\nname: To Delete\nracks: []',
    );

    const deleted = await deleteLayout("to-delete");
    expect(deleted).toBe(true);

    const result = await getLayout("to-delete");
    expect(result).toBeNull();
  });

  it("returns false for non-existent layout", async () => {
    const deleted = await deleteLayout("does-not-exist");
    expect(deleted).toBe(false);
  });
});

// Cleanup after all tests
afterEach(async () => {
  try {
    await rm(testDir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
});
```

**Step 2: Create API route tests**

```typescript
/**
 * Layout API route tests
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Setup test directory
const testDir = await mkdtemp(join(tmpdir(), "rackula-api-test-"));
process.env.DATA_DIR = testDir;

// Import app after setting DATA_DIR
const { default: app } = await import("../index");

const testYaml = `version: "1.0.0"
name: Test Layout
racks: []
device_types: []
settings:
  displayMode: label
`;

describe("GET /api/layouts", () => {
  it("returns empty list initially", async () => {
    const res = await app.fetch(new Request("http://localhost/api/layouts"));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.layouts).toEqual([]);
  });
});

describe("PUT /api/layouts/:id", () => {
  it("creates new layout", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/layouts/test-layout", {
        method: "PUT",
        body: testYaml,
        headers: { "Content-Type": "text/yaml" },
      }),
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe("test-layout");
  });

  it("rejects empty body", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/layouts/empty", {
        method: "PUT",
        body: "",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("rejects invalid ID format", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/layouts/../etc/passwd", {
        method: "PUT",
        body: testYaml,
      }),
    );

    expect(res.status).toBe(400);
  });
});

describe("GET /api/layouts/:id", () => {
  it("returns layout content", async () => {
    // First create a layout
    await app.fetch(
      new Request("http://localhost/api/layouts/get-test", {
        method: "PUT",
        body: testYaml,
      }),
    );

    const res = await app.fetch(
      new Request("http://localhost/api/layouts/get-test"),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/yaml");

    const content = await res.text();
    expect(content).toContain("Test Layout");
  });

  it("returns 404 for non-existent layout", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/layouts/does-not-exist"),
    );

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/layouts/:id", () => {
  it("deletes existing layout", async () => {
    // First create a layout
    await app.fetch(
      new Request("http://localhost/api/layouts/delete-test", {
        method: "PUT",
        body: testYaml,
      }),
    );

    const res = await app.fetch(
      new Request("http://localhost/api/layouts/delete-test", {
        method: "DELETE",
      }),
    );

    expect(res.status).toBe(200);

    // Verify it's gone
    const getRes = await app.fetch(
      new Request("http://localhost/api/layouts/delete-test"),
    );
    expect(getRes.status).toBe(404);
  });
});

describe("GET /health", () => {
  it("returns OK", async () => {
    const res = await app.fetch(new Request("http://localhost/health"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("OK");
  });
});

// Cleanup
afterAll(async () => {
  await rm(testDir, { recursive: true });
});
```

**Step 3: Run tests**

Run: `cd api && bun test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add api/src/*.test.ts
git commit -m "test(api): add storage and route tests"
```

---

### Task 6: Create API Dockerfile

**Files:**

- Create: `api/Dockerfile`

**Step 1: Create the Dockerfile**

```dockerfile
# Rackula API Sidecar
# Tiny Bun-based API for layout persistence
FROM oven/bun:1-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 rackula && \
    adduser --system --uid 1001 rackula

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/

# Create data directory
RUN mkdir -p /data && chown rackula:rackula /data

# OCI labels
LABEL org.opencontainers.image.source="https://github.com/RackulaLives/Rackula"
LABEL org.opencontainers.image.description="Rackula API Sidecar for persistent storage"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="Rackula API"

USER rackula

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3001/health || exit 1

CMD ["bun", "src/index.ts"]
```

**Step 2: Build and test locally**

Run: `cd api && docker build -t rackula-api:test .`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add api/Dockerfile
git commit -m "build(api): add Dockerfile for API sidecar"
```

---

## Phase 2: SPA Client Integration

### Task 7: Add Persistence Configuration

**Files:**

- Create: `src/lib/utils/persistence-config.ts`

**Step 1: Create the configuration module**

```typescript
/**
 * Persistence Configuration
 * Reads environment variables to determine persistence mode
 */

/**
 * Whether persistence is enabled
 * Set via VITE_PERSIST_ENABLED at build time
 */
export const PERSIST_ENABLED: boolean =
  import.meta.env.VITE_PERSIST_ENABLED === "true";

/**
 * API base URL for persistence endpoints
 * Defaults to /api (proxied by nginx in Docker)
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "/api";

/**
 * Check if persistence features should be shown
 */
export function isPersistenceAvailable(): boolean {
  return PERSIST_ENABLED;
}
```

**Step 2: Commit**

```bash
git add src/lib/utils/persistence-config.ts
git commit -m "feat: add persistence configuration module"
```

---

### Task 8: Implement Persistence API Client

**Files:**

- Create: `src/lib/utils/persistence-api.ts`

**Step 1: Create the API client**

```typescript
/**
 * Persistence API Client
 * Communicates with the API sidecar for layout CRUD
 */
import { API_BASE_URL, isPersistenceAvailable } from "./persistence-config";
import type { Layout } from "$lib/types";
import { serializeLayoutToYaml, parseLayoutYaml } from "./yaml";
import { slugify } from "./slug";

/**
 * Layout list item from API
 */
export interface SavedLayoutItem {
  id: string;
  name: string;
  version: string;
  updatedAt: string;
}

/**
 * API response types
 */
interface ListResponse {
  layouts: SavedLayoutItem[];
}

interface SaveResponse {
  id: string;
  message: string;
}

interface ErrorResponse {
  error: string;
}

/**
 * Custom error for API failures
 */
export class PersistenceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "PersistenceError";
  }
}

/**
 * Check if API is reachable
 */
export async function checkApiHealth(): Promise<boolean> {
  if (!isPersistenceAvailable()) return false;

  try {
    const response = await fetch(`${API_BASE_URL.replace("/api", "")}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * List all saved layouts
 */
export async function listSavedLayouts(): Promise<SavedLayoutItem[]> {
  if (!isPersistenceAvailable()) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/layouts`);

  if (!response.ok) {
    const error = (await response.json()) as ErrorResponse;
    throw new PersistenceError(
      error.error ?? "Failed to list layouts",
      response.status,
    );
  }

  const data = (await response.json()) as ListResponse;
  return data.layouts;
}

/**
 * Load a layout by ID
 */
export async function loadSavedLayout(id: string): Promise<Layout> {
  if (!isPersistenceAvailable()) {
    throw new PersistenceError("Persistence not available");
  }

  const response = await fetch(
    `${API_BASE_URL}/layouts/${encodeURIComponent(id)}`,
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new PersistenceError("Layout not found", 404);
    }
    const error = (await response.json()) as ErrorResponse;
    throw new PersistenceError(
      error.error ?? "Failed to load layout",
      response.status,
    );
  }

  const yamlContent = await response.text();
  return parseLayoutYaml(yamlContent);
}

/**
 * Save a layout (create or update)
 * @returns The saved layout ID
 */
export async function saveLayoutToServer(layout: Layout): Promise<string> {
  if (!isPersistenceAvailable()) {
    throw new PersistenceError("Persistence not available");
  }

  const id = slugify(layout.name) || "untitled";
  const yamlContent = await serializeLayoutToYaml(layout);

  const response = await fetch(
    `${API_BASE_URL}/layouts/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "text/yaml",
      },
      body: yamlContent,
    },
  );

  if (!response.ok) {
    const error = (await response.json()) as ErrorResponse;
    throw new PersistenceError(
      error.error ?? "Failed to save layout",
      response.status,
    );
  }

  const data = (await response.json()) as SaveResponse;
  return data.id;
}

/**
 * Delete a saved layout
 */
export async function deleteSavedLayout(id: string): Promise<void> {
  if (!isPersistenceAvailable()) {
    throw new PersistenceError("Persistence not available");
  }

  const response = await fetch(
    `${API_BASE_URL}/layouts/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new PersistenceError("Layout not found", 404);
    }
    const error = (await response.json()) as ErrorResponse;
    throw new PersistenceError(
      error.error ?? "Failed to delete layout",
      response.status,
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/utils/persistence-api.ts
git commit -m "feat: implement persistence API client"
```

---

### Task 9: Create Start Screen Component

**Files:**

- Create: `src/lib/components/StartScreen.svelte`

**Step 1: Create the component**

```svelte
<!--
  StartScreen - Layout selection and creation
  Shown on app launch when persistence is enabled
-->
<script lang="ts">
  import { onMount } from "svelte";
  import {
    listSavedLayouts,
    loadSavedLayout,
    deleteSavedLayout,
    type SavedLayoutItem,
    PersistenceError,
  } from "$lib/utils/persistence-api";
  import { getLayoutStore } from "$lib/stores/layout.svelte";
  import { getToastStore } from "$lib/stores/toast.svelte";
  import { dialogStore } from "$lib/stores/dialogs.svelte";
  import IconPlus from "$lib/components/icons/IconPlus.svelte";
  import IconTrash from "$lib/components/icons/IconTrash.svelte";
  import IconFolderOpen from "$lib/components/icons/IconFolderOpen.svelte";

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  const layoutStore = getLayoutStore();
  const toastStore = getToastStore();

  let layouts = $state<SavedLayoutItem[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let deletingId = $state<string | null>(null);

  onMount(async () => {
    await loadLayouts();
  });

  async function loadLayouts() {
    loading = true;
    error = null;

    try {
      layouts = await listSavedLayouts();
    } catch (e) {
      error =
        e instanceof PersistenceError ? e.message : "Failed to load layouts";
      console.error("Failed to load layouts:", e);
    } finally {
      loading = false;
    }
  }

  async function handleOpenLayout(item: SavedLayoutItem) {
    try {
      const layout = await loadSavedLayout(item.id);
      layoutStore.loadLayout(layout);
      toastStore.info(`Opened "${item.name}"`);
      onClose();
    } catch (e) {
      const message =
        e instanceof PersistenceError ? e.message : "Failed to open layout";
      toastStore.error(message);
    }
  }

  async function handleDeleteLayout(item: SavedLayoutItem, event: MouseEvent) {
    event.stopPropagation();

    if (deletingId) return; // Prevent double-delete

    deletingId = item.id;

    try {
      await deleteSavedLayout(item.id);
      layouts = layouts.filter((l) => l.id !== item.id);
      toastStore.info(`Deleted "${item.name}"`);
    } catch (e) {
      const message =
        e instanceof PersistenceError ? e.message : "Failed to delete layout";
      toastStore.error(message);
    } finally {
      deletingId = null;
    }
  }

  function handleNewLayout() {
    layoutStore.resetLayout();
    dialogStore.open("newRack");
    onClose();
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="start-screen">
  <div class="start-screen-content">
    <header class="start-header">
      <h1>Rackula</h1>
      <p class="subtitle">Rack Layout Designer for Homelabbers</p>
    </header>

    <div class="actions">
      <button class="action-btn primary" onclick={handleNewLayout}>
        <IconPlus size={20} />
        <span>New Layout</span>
      </button>
    </div>

    <section class="saved-layouts">
      <h2>
        <IconFolderOpen size={18} />
        Saved Layouts
      </h2>

      {#if loading}
        <div class="loading">Loading...</div>
      {:else if error}
        <div class="error">{error}</div>
      {:else if layouts.length === 0}
        <div class="empty">
          <p>No saved layouts yet.</p>
          <p>Create a new layout to get started!</p>
        </div>
      {:else}
        <ul class="layout-list">
          {#each layouts as item (item.id)}
            <li>
              <button
                class="layout-item"
                onclick={() => handleOpenLayout(item)}
                disabled={deletingId === item.id}
              >
                <div class="layout-info">
                  <span class="layout-name">{item.name}</span>
                  <span class="layout-date">{formatDate(item.updatedAt)}</span>
                </div>
                <button
                  class="delete-btn"
                  onclick={(e) => handleDeleteLayout(item, e)}
                  disabled={deletingId === item.id}
                  title="Delete layout"
                >
                  <IconTrash size={16} />
                </button>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
</div>

<style>
  .start-screen {
    position: fixed;
    inset: 0;
    background: var(--color-background);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .start-screen-content {
    max-width: 480px;
    width: 100%;
    padding: var(--spacing-lg);
  }

  .start-header {
    text-align: center;
    margin-bottom: var(--spacing-xl);
  }

  .start-header h1 {
    font-size: 2.5rem;
    color: var(--color-primary);
    margin: 0;
  }

  .subtitle {
    color: var(--color-text-muted);
    margin-top: var(--spacing-xs);
  }

  .actions {
    display: flex;
    justify-content: center;
    margin-bottom: var(--spacing-xl);
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: background-color 0.15s;
  }

  .action-btn.primary {
    background: var(--color-primary);
    color: white;
  }

  .action-btn.primary:hover {
    background: var(--color-primary-hover);
  }

  .saved-layouts h2 {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 1rem;
    color: var(--color-text-muted);
    margin-bottom: var(--spacing-md);
  }

  .layout-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .layout-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--spacing-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-sm);
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s;
  }

  .layout-item:hover {
    border-color: var(--color-primary);
  }

  .layout-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .layout-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .layout-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .layout-date {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .delete-btn {
    padding: var(--spacing-sm);
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition:
      color 0.15s,
      background-color 0.15s;
  }

  .delete-btn:hover {
    color: var(--color-error);
    background: var(--color-error-bg);
  }

  .loading,
  .error,
  .empty {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text-muted);
  }

  .error {
    color: var(--color-error);
  }
</style>
```

**Step 2: Commit**

```bash
git add src/lib/components/StartScreen.svelte
git commit -m "feat: add StartScreen component for layout selection"
```

---

### Task 10: Integrate Start Screen into App

**Files:**

- Modify: `src/App.svelte`

**Step 1: Add imports and state**

Add these imports near the top of the script section (after existing imports):

```typescript
import StartScreen from "$lib/components/StartScreen.svelte";
import { isPersistenceAvailable } from "$lib/utils/persistence-config";
import {
  saveLayoutToServer,
  PersistenceError,
} from "$lib/utils/persistence-api";
```

Add state variable after existing state declarations:

```typescript
// Start screen state (only when persistence enabled)
let showStartScreen = $state(isPersistenceAvailable());
```

**Step 2: Add auto-save effect**

Add after existing `$effect` blocks:

```typescript
// Auto-save to server when persistence enabled
$effect(() => {
  if (!isPersistenceAvailable()) return;
  if (showStartScreen) return; // Don't save while on start screen

  const layout = layoutStore.layout;
  if (!layout.name) return; // Don't save unnamed layouts

  // Debounced save
  const timeoutId = setTimeout(async () => {
    try {
      await saveLayoutToServer(layout);
    } catch (e) {
      // Silent fail for auto-save, user can manually save
      console.warn("Auto-save failed:", e);
    }
  }, 2000);

  return () => clearTimeout(timeoutId);
});
```

**Step 3: Add StartScreen to template**

Add at the very beginning of the template (before `<AnimationDefs />`):

```svelte
{#if showStartScreen}
  <StartScreen onClose={() => (showStartScreen = false)} />
{:else}
  <!-- Existing app content -->
  <AnimationDefs />
  <!-- ... rest of template ... -->
{/if}
```

**Step 4: Commit**

```bash
git add src/App.svelte
git commit -m "feat: integrate StartScreen with persistence auto-save"
```

---

## Phase 3: Docker Configuration

### Task 11: Update nginx Configuration

**Files:**

- Modify: `deploy/nginx.conf`

**Step 1: Add API proxy location**

Add this location block before the SPA fallback (`location /`):

```nginx
    # API proxy (when sidecar is running)
    # Falls back gracefully if API is unavailable
    location /api/ {
        proxy_pass http://rackula-api:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Handle API unavailable gracefully
        proxy_intercept_errors on;
        error_page 502 503 504 = @api_unavailable;
    }

    # API unavailable fallback
    location @api_unavailable {
        default_type application/json;
        return 503 '{"error": "Persistence API unavailable"}';
    }
```

**Step 2: Update CSP header for API**

Update the `connect-src` directive to include API:

```nginx
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://t.racku.la https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://t.racku.la https://static.cloudflareinsights.com /api/; frame-ancestors 'self';" always;
```

**Step 3: Commit**

```bash
git add deploy/nginx.conf
git commit -m "feat: add API proxy configuration to nginx"
```

---

### Task 12: Create Persistence Docker Compose Override

**Files:**

- Create: `docker-compose.persist.yml`

**Step 1: Create the override file**

```yaml
# Docker Compose override for persistent storage
# Usage: docker compose -f docker-compose.yml -f docker-compose.persist.yml up -d
#
# This adds the API sidecar container for layout persistence.
# Layouts are stored as YAML files in the ./data volume.

services:
  rackula:
    # Rebuild with persistence enabled
    build:
      context: .
      dockerfile: deploy/Dockerfile
      args:
        VITE_PERSIST_ENABLED: "true"
    depends_on:
      rackula-api:
        condition: service_healthy

  rackula-api:
    image: ghcr.io/rackulalives/rackula-api:latest
    # Or build locally:
    # build:
    #   context: ./api
    #   dockerfile: Dockerfile
    container_name: rackula-api
    restart: unless-stopped
    stop_grace_period: 10s

    volumes:
      - ./data:/data

    environment:
      - DATA_DIR=/data
      - PORT=3001

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 64M
        reservations:
          cpus: "0.05"
          memory: 16M

    # Security hardening
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
    tmpfs:
      - /tmp:size=5M

    # Healthcheck
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1:3001/health"]
      interval: 30s
      timeout: 3s
      start_period: 5s
      retries: 3

    # Logging
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"

    # Internal network only (nginx proxies)
    expose:
      - "3001"
```

**Step 2: Commit**

```bash
git add docker-compose.persist.yml
git commit -m "feat: add Docker Compose override for persistence"
```

---

### Task 13: Update Vite Config for Persistence Flag

**Files:**

- Modify: `vite.config.ts`

**Step 1: Add persistence environment variable**

Find the `define` section and add:

```typescript
define: {
  __BUILD_ENV__: JSON.stringify(mode),
  // Persistence flag (default false for SaaS)
  'import.meta.env.VITE_PERSIST_ENABLED': JSON.stringify(
    process.env.VITE_PERSIST_ENABLED ?? 'false'
  ),
},
```

**Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "build: add VITE_PERSIST_ENABLED to vite config"
```

---

### Task 14: Update Dockerfile Build Args

**Files:**

- Modify: `deploy/Dockerfile`

**Step 1: Add persistence build arg**

Add after the existing build args:

```dockerfile
# Persistence configuration (default: disabled for SaaS)
ARG VITE_PERSIST_ENABLED=false
```

**Step 2: Commit**

```bash
git add deploy/Dockerfile
git commit -m "build: add VITE_PERSIST_ENABLED build arg to Dockerfile"
```

---

## Phase 4: Documentation

### Task 15: Add Self-Hosting Documentation

**Files:**

- Create: `docs/guides/SELF-HOSTING.md`

**Step 1: Create the documentation**

````markdown
# Self-Hosting Rackula with Persistent Storage

This guide explains how to run Rackula with persistent layout storage using Docker.

## Quick Start (Without Persistence)

The default deployment is a lightweight static site with no server-side storage:

```bash
docker compose up -d
```
````

Layouts are saved to browser localStorage and can be exported/imported as `.Rackula.zip` files.

## With Persistent Storage

For layouts that persist across browser sessions and devices:

```bash
# Create data directory
mkdir -p data

# Start with persistence enabled
docker compose -f docker-compose.yml -f docker-compose.persist.yml up -d
```

This adds an API sidecar that stores layouts as YAML files in the `./data` directory.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Browser SPA   │────▶│     nginx       │
└─────────────────┘     │  (port 8080)    │
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              Static Files              /api/* proxy
                    │                         │
                    ▼                         ▼
           /usr/share/nginx/html    ┌─────────────────┐
                                    │  rackula-api    │
                                    │  (port 3001)    │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │   ./data/       │
                                    │  (YAML files)   │
                                    └─────────────────┘
```

## Data Directory Structure

```
data/
├── my-homelab.yaml
├── datacenter-rack-a.yaml
└── assets/
    └── my-homelab/
        └── custom-device-123/
            └── front.png
```

Layouts are stored as human-readable YAML files. You can:

- Edit them directly with any text editor
- Version control them with git
- Back them up with standard tools

## Environment Variables

| Variable               | Default | Description                       |
| ---------------------- | ------- | --------------------------------- |
| `RACKULA_PORT`         | `8080`  | Port for the web interface        |
| `VITE_PERSIST_ENABLED` | `false` | Enable persistence features       |
| `DATA_DIR`             | `/data` | Storage directory (API container) |

## Security Considerations

- The API container runs as non-root
- Read-only filesystem except for `/data` volume
- No external network access required
- All capabilities dropped

## Troubleshooting

### "Persistence API unavailable"

Check if the API container is running:

```bash
docker compose -f docker-compose.yml -f docker-compose.persist.yml ps
docker compose -f docker-compose.yml -f docker-compose.persist.yml logs rackula-api
```

### Data not persisting

Ensure the data directory has correct permissions:

```bash
ls -la data/
# Should be writable by UID 1001
```

### Layout not appearing in list

Check if the YAML file is valid:

```bash
cat data/your-layout.yaml | head -5
# Should show: version, name, racks fields
```

````

**Step 2: Commit**

```bash
git add docs/guides/SELF-HOSTING.md
git commit -m "docs: add self-hosting guide with persistence"
````

---

### Task 16: Update Main README

**Files:**

- Modify: `README.md`

**Step 1: Add persistence section**

Add after the existing Docker section:

````markdown
### Persistent Storage (Self-Hosted)

For layouts that persist across sessions:

```bash
mkdir -p data
docker compose -f docker-compose.yml -f docker-compose.persist.yml up -d
```
````

See [Self-Hosting Guide](docs/guides/SELF-HOSTING.md) for details.

````

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add persistent storage section to README"
````

---

## Phase 5: CI/CD Updates

### Task 17: Add API Image Build to CI

**Files:**

- Modify: `.github/workflows/deploy-prod.yml` (or relevant workflow)

**Step 1: Add API build job**

Add a job to build and push the API image:

```yaml
build-api:
  runs-on: ubuntu-latest
  permissions:
    contents: read
    packages: write
  steps:
    - uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to GHCR
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build and push API image
      uses: docker/build-push-action@v6
      with:
        context: ./api
        push: true
        tags: |
          ghcr.io/rackulalives/rackula-api:latest
          ghcr.io/rackulalives/rackula-api:${{ github.ref_name }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

**Step 2: Commit**

```bash
git add .github/workflows/
git commit -m "ci: add API image build to deployment workflow"
```

---

## Summary

This plan implements persistent storage for self-hosted Rackula deployments with:

1. **API Sidecar** - Tiny Bun-based API (~20MB image) for CRUD operations
2. **Filesystem Storage** - YAML files on disk, version-control friendly
3. **Docker Compose Profiles** - Easy opt-in via compose override file
4. **Start Screen** - Layout list and selection on app launch
5. **Auto-save** - Debounced saves when layouts change
6. **Graceful Degradation** - Works without API (falls back to localStorage)
7. **Security Hardening** - Non-root, read-only, capability-dropped containers

**Deployment modes:**

- `docker compose up` → Static SPA only (SaaS mode)
- `docker compose -f ... -f docker-compose.persist.yml up` → With persistence

---

Plan complete and saved to `docs/plans/2026-01-20-persistent-storage-design.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
