# Epic #150 Multi-Rack Support Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete epic #150 by implementing the remaining 6 open issues to deliver full multi-rack support with bayed/touring view.

**Architecture:** Bottom-up approach - fix small store validation issues first (#559, #560, #563, #564), then implement group management UI (#476), and finally the bayed view rendering (#449).

**Tech Stack:** Svelte 5 (runes), TypeScript, Vitest

---

## Issue Dependencies

```
#564 (remove 'custom') ─┐
#563 (single-group)   ──┼─► #476 (group management) ─► #449 (bayed view)
#560 (height changes) ──┤
#559 (undo/redo)      ──┘
#578 (audit) - standalone spike, parallel
```

---

## Task 1: Remove 'custom' Layout Preset (#564)

**Files:**

- Modify: `src/lib/types/index.ts:615`
- Modify: `src/lib/stores/layout.svelte.ts:625` (default preset)
- Modify: `src/lib/components/wizard/NewRackWizard.svelte` (if referenced)

**Step 1.1: Update type definition**

```typescript
// src/lib/types/index.ts:615
// Before:
export type RackGroupLayoutPreset = "bayed" | "row" | "custom";

// After:
export type RackGroupLayoutPreset = "bayed" | "row";
```

**Step 1.2: Update LayoutPreset alias if exists**

Search for any `LayoutPreset` type alias and update accordingly.

**Step 1.3: Run type check**

```bash
npm run build 2>&1 | head -50
```

Expected: No TypeScript errors related to 'custom' preset.

**Step 1.4: Commit**

```bash
git add -A && git commit -m "refactor(types): remove 'custom' layout preset (#564)

- Remove 'custom' from RackGroupLayoutPreset union type
- Only 'bayed' and 'row' presets are now valid
- 'custom' was undefined and unused; can be added back when needed

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Enforce Single-Group Membership (#563)

**Files:**

- Modify: `src/lib/stores/layout.svelte.ts:607-656` (createRackGroup)
- Modify: `src/lib/stores/layout.svelte.ts:738-768` (addRackToGroup)
- Test: `src/tests/rack-group-store.test.ts`

**Step 2.1: Write failing test for createRackGroup**

```typescript
// src/tests/rack-group-store.test.ts
// Add to existing test file:

it("rejects creating group with rack already in another group", () => {
  // Create first group with rack1
  const store = getLayoutStore();
  store.addRack("Rack 1", 42);
  store.addRack("Rack 2", 42);
  store.addRack("Rack 3", 42);
  const rack1Id = store.racks[0]!.id;
  const rack2Id = store.racks[1]!.id;
  const rack3Id = store.racks[2]!.id;

  // Create first group
  const result1 = store.createRackGroup("Group A", [rack1Id, rack2Id], "row");
  expect(result1.group).toBeDefined();

  // Try to create second group with rack1 (already in Group A)
  const result2 = store.createRackGroup("Group B", [rack1Id, rack3Id], "row");
  expect(result2.error).toContain("already in");
  expect(result2.error).toContain("Group A");
});
```

**Step 2.2: Run test to verify it fails**

```bash
npm run test:run -- --reporter=verbose src/tests/rack-group-store.test.ts
```

Expected: FAIL - currently no validation for existing group membership.

**Step 2.3: Add validation to createRackGroup**

```typescript
// src/lib/stores/layout.svelte.ts - in createRackGroup function
// Add after "Validate all rack IDs exist" block (~line 622):

// Validate no rack is already in another group
for (const rackId of rackIds) {
  const existingGroup = getRackGroupForRack(rackId);
  if (existingGroup) {
    const rackName = layout.racks.find((r) => r.id === rackId)?.name ?? rackId;
    return {
      error: `Rack "${rackName}" is already in group "${existingGroup.name ?? existingGroup.id}". Remove it first.`,
    };
  }
}
```

**Step 2.4: Write failing test for addRackToGroup**

```typescript
it("rejects adding rack already in another group", () => {
  const store = getLayoutStore();
  store.addRack("Rack 1", 42);
  store.addRack("Rack 2", 42);
  store.addRack("Rack 3", 42);
  const rack1Id = store.racks[0]!.id;
  const rack2Id = store.racks[1]!.id;
  const rack3Id = store.racks[2]!.id;

  // Create two groups
  const result1 = store.createRackGroup("Group A", [rack1Id], "row");
  const result2 = store.createRackGroup("Group B", [rack2Id], "row");
  const groupBId = result2.group!.id;

  // Try to add rack1 (in Group A) to Group B
  const addResult = store.addRackToGroup(groupBId, rack1Id);
  expect(addResult.error).toContain("already in");
  expect(addResult.error).toContain("Group A");
});
```

**Step 2.5: Add validation to addRackToGroup**

```typescript
// src/lib/stores/layout.svelte.ts - in addRackToGroup function
// Add after "Check rack not already in group" block (~line 751):

// Check rack not in ANY other group
const existingGroup = getRackGroupForRack(rackId);
if (existingGroup && existingGroup.id !== groupId) {
  const rackName = rack.name ?? rackId;
  return {
    error: `Rack "${rackName}" is already in group "${existingGroup.name ?? existingGroup.id}". Remove it first.`,
  };
}
```

**Step 2.6: Run tests to verify they pass**

```bash
npm run test:run -- --reporter=verbose src/tests/rack-group-store.test.ts
```

Expected: All tests PASS.

**Step 2.7: Commit**

```bash
git add -A && git commit -m "feat(store): enforce single-group membership for racks (#563)

- createRackGroup rejects racks already in another group
- addRackToGroup rejects racks already in another group
- Error messages name the existing group for clarity
- Defense-in-depth: UI already enforced this, now store does too

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Prevent Height Changes on Bayed Racks (#560)

**Files:**

- Modify: `src/lib/stores/layout.svelte.ts:503-523` (updateRack)
- Test: `src/tests/rack-group-store.test.ts`

**Step 3.1: Write failing test**

```typescript
it("rejects height changes for racks in bayed groups", () => {
  const store = getLayoutStore();
  // Create bayed group (same heights required)
  const result = store.addBayedRackGroup("Touring Bay", 2, 20, 19);
  expect(result).not.toBeNull();
  const rack1Id = result!.racks[0]!.id;

  // Try to change height
  store.updateRack(rack1Id, { height: 12 });

  // Height should be unchanged (still 20)
  expect(store.getRackById(rack1Id)?.height).toBe(20);
});
```

**Step 3.2: Run test to verify it fails**

```bash
npm run test:run -- --reporter=verbose src/tests/rack-group-store.test.ts
```

Expected: FAIL - height change currently allowed.

**Step 3.3: Add validation to updateRack**

```typescript
// src/lib/stores/layout.svelte.ts - in updateRack function
// Add after finding rackIndex (~line 505):

// Check if height change on bayed rack
if (updates.height !== undefined) {
  const group = getRackGroupForRack(id);
  if (group?.layout_preset === "bayed") {
    layoutDebug.state(
      "updateRack: rejected height change for bayed rack %s",
      id,
    );
    // Silently reject - UI should show toast
    return;
  }
}
```

**Step 3.4: Run tests to verify they pass**

```bash
npm run test:run -- --reporter=verbose src/tests/rack-group-store.test.ts
```

Expected: All tests PASS.

**Step 3.5: Commit**

```bash
git add -A && git commit -m "feat(store): prevent height changes on racks in bayed groups (#560)

- updateRack silently rejects height changes for bayed group members
- Enforces physical constraint: bayed racks are bolted together
- UI should show toast explaining the constraint

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Make Rack Add/Delete Undoable (#559)

**Files:**

- Modify: `src/lib/stores/layout.svelte.ts:359-401` (addRack)
- Modify: `src/lib/stores/layout.svelte.ts:539-566` (deleteRack)
- Create: `src/lib/stores/commands/rack.ts`
- Modify: `src/lib/stores/commands/index.ts`
- Test: `src/tests/rack-undo.test.ts` (new)

**Step 4.1: Create rack command types**

```typescript
// src/lib/stores/commands/rack.ts
import type { Command } from "./types";
import type { Rack, RackGroup } from "$lib/types";

export interface RackCommandStore {
  addRackRaw(rack: Rack): void;
  deleteRackRaw(id: string): { rack: Rack; groups: RackGroup[] } | undefined;
  restoreRackRaw(rack: Rack, groups: RackGroup[]): void;
}

export function createAddRackCommand(
  rack: Rack,
  store: RackCommandStore,
): Command {
  return {
    type: "ADD_RACK",
    description: `Add rack "${rack.name}"`,
    timestamp: Date.now(),
    execute() {
      store.addRackRaw(rack);
    },
    undo() {
      store.deleteRackRaw(rack.id);
    },
  };
}

export function createDeleteRackCommand(
  rack: Rack,
  affectedGroups: RackGroup[],
  store: RackCommandStore,
): Command {
  // Deep copy for undo
  const rackSnapshot = JSON.parse(JSON.stringify(rack)) as Rack;
  const groupSnapshots = JSON.parse(
    JSON.stringify(affectedGroups),
  ) as RackGroup[];

  return {
    type: "DELETE_RACK",
    description: `Delete rack "${rack.name}"`,
    timestamp: Date.now(),
    execute() {
      store.deleteRackRaw(rack.id);
    },
    undo() {
      store.restoreRackRaw(rackSnapshot, groupSnapshots);
    },
  };
}
```

**Step 4.2: Add raw functions to layout store**

```typescript
// src/lib/stores/layout.svelte.ts - add near other raw functions

/**
 * Add a rack directly (raw, for undo/redo)
 */
function addRackRaw(rack: Rack): void {
  layout = {
    ...layout,
    racks: [...layout.racks, rack],
  };
}

/**
 * Delete a rack directly (raw, for undo/redo)
 * Returns the deleted rack and affected groups for undo
 */
function deleteRackRaw(
  id: string,
): { rack: Rack; groups: RackGroup[] } | undefined {
  const rack = layout.racks.find((r) => r.id === id);
  if (!rack) return undefined;

  // Capture affected groups before deletion
  const affectedGroups = (layout.rack_groups ?? []).filter((g) =>
    g.rack_ids.includes(id),
  );

  // Remove rack and update groups
  const newRacks = layout.racks.filter((r) => r.id !== id);
  const newGroups = (layout.rack_groups ?? [])
    .map((group) => ({
      ...group,
      rack_ids: group.rack_ids.filter((rackId) => rackId !== id),
    }))
    .filter((group) => group.rack_ids.length > 0);

  layout = {
    ...layout,
    racks: newRacks,
    rack_groups: newGroups.length > 0 ? newGroups : undefined,
  };

  // Update active rack if needed
  if (activeRackId === id) {
    activeRackId = newRacks[0]?.id ?? null;
  }

  return { rack, groups: affectedGroups };
}

/**
 * Restore a rack and its group memberships (for undo)
 */
function restoreRackRaw(rack: Rack, groups: RackGroup[]): void {
  // Add rack back
  layout = {
    ...layout,
    racks: [...layout.racks, rack],
  };

  // Restore group memberships
  for (const group of groups) {
    const existingGroup = layout.rack_groups?.find((g) => g.id === group.id);
    if (existingGroup) {
      // Group still exists, add rack back
      updateRackGroupRaw(group.id, {
        rack_ids: [...existingGroup.rack_ids, rack.id],
      });
    } else {
      // Group was deleted (was last rack), restore it
      createRackGroupRaw(group);
    }
  }

  // Set as active
  activeRackId = rack.id;
}
```

**Step 4.3: Update addRack to use command pattern**

```typescript
// Modify addRack function to use history
function addRack(
  name: string,
  height: number,
  width?: number,
  form_factor?: FormFactor,
  desc_units?: boolean,
  starting_unit?: number,
): (Rack & { id: string }) | null {
  if (layout.racks.length >= MAX_RACKS) {
    return null;
  }

  const newRack = createDefaultRack(
    name,
    height,
    (width as 10 | 19) ?? 19,
    form_factor ?? "4-post-cabinet",
    desc_units ?? false,
    starting_unit ?? 1,
    true,
    generateRackId(),
  );

  const isFirstRack = layout.racks.length === 0;

  // Use command pattern for undo/redo
  const history = getHistoryStore();
  const adapter = getRackCreateDeleteAdapter();
  const command = createAddRackCommand(newRack, adapter);
  history.execute(command);

  // Sync layout name if first rack
  if (isFirstRack) {
    layout = { ...layout, name };
  }

  isDirty = true;
  activeRackId = newRack.id;
  hasStarted = true;
  saveHasStarted(true);

  return newRack;
}
```

**Step 4.4: Update deleteRack to use command pattern**

```typescript
function deleteRack(id: string): void {
  const rack = layout.racks.find((r) => r.id === id);
  if (!rack) return;

  // Capture affected groups for undo
  const affectedGroups = (layout.rack_groups ?? []).filter((g) =>
    g.rack_ids.includes(id),
  );

  // Use command pattern
  const history = getHistoryStore();
  const adapter = getRackCreateDeleteAdapter();
  const command = createDeleteRackCommand(rack, affectedGroups, adapter);
  history.execute(command);

  isDirty = true;
}
```

**Step 4.5: Write tests**

```typescript
// src/tests/rack-undo.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { getLayoutStore, resetLayoutStore } from "$lib/stores/layout.svelte";

describe("Rack add/delete undo/redo", () => {
  beforeEach(() => {
    resetLayoutStore();
  });

  it("undoes rack creation", () => {
    const store = getLayoutStore();
    expect(store.racks.length).toBe(0);

    store.addRack("Test Rack", 42);
    expect(store.racks.length).toBe(1);

    store.undo();
    expect(store.racks.length).toBe(0);
  });

  it("redoes rack creation after undo", () => {
    const store = getLayoutStore();
    store.addRack("Test Rack", 42);
    store.undo();
    expect(store.racks.length).toBe(0);

    store.redo();
    expect(store.racks.length).toBe(1);
    expect(store.racks[0]?.name).toBe("Test Rack");
  });

  it("undoes rack deletion", () => {
    const store = getLayoutStore();
    store.addRack("Test Rack", 42);
    const rackId = store.racks[0]!.id;
    store.clearHistory(); // Clear add from history

    store.deleteRack(rackId);
    expect(store.racks.length).toBe(0);

    store.undo();
    expect(store.racks.length).toBe(1);
    expect(store.racks[0]?.name).toBe("Test Rack");
  });

  it("restores group membership on undo delete", () => {
    const store = getLayoutStore();
    store.addRack("Rack 1", 42);
    store.addRack("Rack 2", 42);
    const rack1Id = store.racks[0]!.id;
    const rack2Id = store.racks[1]!.id;

    store.createRackGroup("Test Group", [rack1Id, rack2Id], "row");
    store.clearHistory();

    // Delete rack1
    store.deleteRack(rack1Id);
    expect(store.rack_groups.length).toBe(1);
    expect(store.rack_groups[0]?.rack_ids).not.toContain(rack1Id);

    // Undo - rack1 should be back in group
    store.undo();
    expect(store.rack_groups[0]?.rack_ids).toContain(rack1Id);
  });
});
```

**Step 4.6: Run tests**

```bash
npm run test:run -- --reporter=verbose src/tests/rack-undo.test.ts
```

**Step 4.7: Commit**

```bash
git add -A && git commit -m "feat(store): make rack add/delete undoable (#559)

- addRack uses command pattern with history
- deleteRack uses command pattern with history
- Undo restores rack and its group memberships
- Cascade operations are now atomic

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Group Management UI (#476)

**Files:**

- Create: `src/lib/components/RackGroupPanel.svelte`
- Modify: `src/lib/components/Sidebar.svelte` (add Groups section)
- Modify: `src/lib/components/Canvas.svelte` (group visual indicator)

### Step 5.1: Create RackGroupPanel component

```svelte
<!-- src/lib/components/RackGroupPanel.svelte -->
<script lang="ts">
  import { getLayoutStore } from "$lib/stores/layout.svelte";
  import type { RackGroup } from "$lib/types";

  const layoutStore = getLayoutStore();

  const groups = $derived(layoutStore.rack_groups);

  function getRackNames(group: RackGroup): string[] {
    return group.rack_ids
      .map((id) => layoutStore.getRackById(id)?.name ?? id)
      .slice(0, 3); // Show max 3
  }

  function handleDeleteGroup(groupId: string) {
    layoutStore.deleteRackGroup(groupId);
  }

  function handlePresetChange(groupId: string, preset: "bayed" | "row") {
    const result = layoutStore.updateRackGroup(groupId, {
      layout_preset: preset,
    });
    if (result.error) {
      // TODO: Show toast
      console.warn(result.error);
    }
  }
</script>

{#if groups.length > 0}
  <div class="groups-panel">
    <h3 class="panel-heading">Groups</h3>
    {#each groups as group (group.id)}
      <div class="group-card">
        <div class="group-header">
          <span class="group-name">{group.name ?? "Unnamed Group"}</span>
          <button
            class="delete-btn"
            onclick={() => handleDeleteGroup(group.id)}
            aria-label="Delete group"
          >
            ×
          </button>
        </div>
        <div class="group-racks">
          {#each getRackNames(group) as name}
            <span class="rack-chip">{name}</span>
          {/each}
          {#if group.rack_ids.length > 3}
            <span class="rack-chip more">+{group.rack_ids.length - 3}</span>
          {/if}
        </div>
        <div class="group-preset">
          <label>
            <input
              type="radio"
              name="preset-{group.id}"
              value="row"
              checked={group.layout_preset !== "bayed"}
              onchange={() => handlePresetChange(group.id, "row")}
            />
            Row
          </label>
          <label>
            <input
              type="radio"
              name="preset-{group.id}"
              value="bayed"
              checked={group.layout_preset === "bayed"}
              onchange={() => handlePresetChange(group.id, "bayed")}
            />
            Bayed
          </label>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .groups-panel {
    padding: var(--space-3);
  }

  .panel-heading {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: var(--space-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .group-card {
    background: var(--surface-secondary);
    border-radius: var(--radius-md);
    padding: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-1);
  }

  .group-name {
    font-weight: 500;
    color: var(--text-primary);
  }

  .delete-btn {
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
    padding: 0;
  }

  .delete-btn:hover {
    color: var(--colour-error);
  }

  .group-racks {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }

  .rack-chip {
    background: var(--surface-tertiary);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .rack-chip.more {
    color: var(--text-tertiary);
  }

  .group-preset {
    display: flex;
    gap: var(--space-3);
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .group-preset label {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    cursor: pointer;
  }
</style>
```

### Step 5.2: Add to Sidebar

Add `<RackGroupPanel />` to the sidebar, after racks list.

### Step 5.3: Add visual group indicator to Canvas

In `Canvas.svelte`, wrap grouped racks with a visual container:

```svelte
<!-- In racks-wrapper, replace simple each loop -->
{@const groupedRackIds = new Set(
  layoutStore.rack_groups.flatMap((g) => g.rack_ids),
)}

{#each layoutStore.rack_groups as group (group.id)}
  <div class="rack-group" data-preset={group.layout_preset}>
    {#if group.name}
      <span class="group-label">{group.name}</span>
    {/if}
    <div class="group-racks">
      {#each group.rack_ids as rackId (rackId)}
        {@const rack = layoutStore.getRackById(rackId)}
        {#if rack}
          <!-- RackDualView here -->
        {/if}
      {/each}
    </div>
  </div>
{/each}

<!-- Ungrouped racks -->
{#each racks.filter((r) => !groupedRackIds.has(r.id)) as rack (rack.id)}
  <!-- RackDualView here -->
{/each}
```

### Step 5.4: Commit

```bash
git add -A && git commit -m "feat(ui): add rack group management panel (#476)

- RackGroupPanel shows all groups with member racks
- Delete group button removes group (keeps racks)
- Radio buttons to switch between row/bayed preset
- Visual grouping indicator on canvas
- Group name label above grouped racks

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Bayed/Touring View Rendering (#449)

**Files:**

- Create: `src/lib/components/BayedRackView.svelte`
- Modify: `src/lib/components/Canvas.svelte` (use BayedRackView for bayed groups)

### Step 6.1: Create BayedRackView component

```svelte
<!-- src/lib/components/BayedRackView.svelte -->
<script lang="ts">
  import type {
    Rack,
    RackGroup,
    DeviceType,
    DisplayMode,
    AnnotationField,
  } from "$lib/types";
  import Rack from "./Rack.svelte";

  interface Props {
    group: RackGroup;
    racks: Rack[];
    deviceLibrary: DeviceType[];
    activeRackId: string | null;
    displayMode: DisplayMode;
    showLabelsOnImages: boolean;
    showAnnotations: boolean;
    annotationField: AnnotationField;
    // ... other props from RackDualView
  }

  let {
    group,
    racks,
    deviceLibrary,
    activeRackId,
    displayMode,
    showLabelsOnImages,
    showAnnotations,
    annotationField,
  }: Props = $props();

  // Front row: racks in order (left to right)
  const frontRacks = $derived(racks);

  // Rear row: racks in reverse order (mirrored)
  const rearRacks = $derived([...racks].reverse());

  // All bayed racks must have same height (validated at creation)
  const rackHeight = $derived(racks[0]?.height ?? 42);
</script>

<div class="bayed-view">
  {#if group.name}
    <div class="bayed-header">{group.name}</div>
  {/if}

  <!-- Front row -->
  <div class="bayed-row front-row">
    <div class="row-label">FRONT</div>
    <div class="row-racks">
      {#each frontRacks as rack, index (rack.id)}
        <div class="bay-container">
          <div class="bay-number">Bay {index + 1}</div>
          <Rack
            {rack}
            {deviceLibrary}
            face="front"
            {displayMode}
            {showLabelsOnImages}
            showAnnotations={false}
          />
        </div>
      {/each}
    </div>
  </div>

  <!-- Shared U labels column -->
  <div class="u-labels">
    {#each Array.from({ length: rackHeight }, (_, i) => rackHeight - i) as u}
      <div class="u-label">{u}</div>
    {/each}
  </div>

  <!-- Rear row (mirrored order) -->
  <div class="bayed-row rear-row">
    <div class="row-label">REAR</div>
    <div class="row-racks">
      {#each rearRacks as rack, index (rack.id)}
        <div class="bay-container">
          <div class="bay-number">Bay {racks.length - index}</div>
          <Rack
            {rack}
            {deviceLibrary}
            face="rear"
            {displayMode}
            {showLabelsOnImages}
            showAnnotations={false}
          />
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .bayed-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-3);
    background: var(--surface-secondary);
    border-radius: var(--radius-lg);
  }

  .bayed-header {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--border-subtle);
  }

  .bayed-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .row-label {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: var(--space-2);
  }

  .row-racks {
    display: flex;
    gap: 0; /* Bayed racks touch each other */
  }

  .bay-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .bay-number {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    margin-bottom: var(--space-1);
  }

  .u-labels {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 0 var(--space-2);
  }

  .u-label {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    height: var(--rack-u-height, 18px);
    display: flex;
    align-items: center;
  }
</style>
```

### Step 6.2: Use BayedRackView in Canvas

```svelte
<!-- In Canvas.svelte, modify the racks rendering section -->
{#each layoutStore.rack_groups as group (group.id)}
  {#if group.layout_preset === "bayed"}
    {@const groupRacks = group.rack_ids
      .map((id) => layoutStore.getRackById(id))
      .filter(Boolean)}
    <BayedRackView
      {group}
      racks={groupRacks}
      deviceLibrary={layoutStore.device_types}
      {activeRackId}
      displayMode={uiStore.displayMode}
      showLabelsOnImages={uiStore.showLabelsOnImages}
      showAnnotations={uiStore.showAnnotations}
      annotationField={uiStore.annotationField}
    />
  {:else}
    <!-- Row layout: render side by side -->
    <div class="rack-group row-layout">
      {#each group.rack_ids as rackId (rackId)}
        <!-- RackDualView -->
      {/each}
    </div>
  {/if}
{/each}
```

### Step 6.3: Commit

```bash
git add -A && git commit -m "feat(canvas): bayed/touring rack view preset (#449)

- BayedRackView component renders front row over rear row
- Rear row is mirrored (rightmost rack = bay 1)
- Shared U-label column between rows
- Bay numbers shown above each rack
- Group name header above the entire bayed view

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Dev Build Audit (#578)

This is a spike task - use the dev environment at https://d.racku.la/ to identify issues.

**Deliverables:**

- List of bugs found
- List of UX improvements needed
- New issues created for each actionable item

**Note:** This task should be done in a separate session after the above features are implemented and deployed to dev.

---

## Summary

| Task | Issue | Effort  | Files                                     |
| ---- | ----- | ------- | ----------------------------------------- |
| 1    | #564  | 5 min   | types/index.ts                            |
| 2    | #563  | 15 min  | layout.svelte.ts, tests                   |
| 3    | #560  | 10 min  | layout.svelte.ts, tests                   |
| 4    | #559  | 30 min  | layout.svelte.ts, commands/rack.ts, tests |
| 5    | #476  | 1 hr    | RackGroupPanel.svelte, Sidebar, Canvas    |
| 6    | #449  | 1 hr    | BayedRackView.svelte, Canvas              |
| 7    | #578  | 2-4 hrs | Spike - separate session                  |

**Total estimated effort:** ~3-4 hours for implementation, plus audit spike.
