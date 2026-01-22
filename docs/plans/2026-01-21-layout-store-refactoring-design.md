# Layout Store Refactoring Design

**Issue:** #910
**Status:** Planned (future sprint)
**Date:** 2026-01-21

## Problem

`src/lib/stores/layout.svelte.ts` is ~3,300 lines with ~100 functions. It handles:

- Rack CRUD
- Device placement
- Rack groups/bays
- Device type library
- Settings
- Undo/redo orchestration

This makes it difficult to navigate, test in isolation, and reason about.

## Chosen Approach: Domain Modules with Injected State

After evaluating three approaches, we chose **Domain Modules with Injected State** for ~60-70% line reduction while preserving Svelte 5 reactivity.

### Module Structure

```
src/lib/stores/
├── layout.svelte.ts          # Slim orchestrator (~300-400 lines)
├── layout-helpers.ts         # Keep as-is (pure functions)
├── layout/
│   ├── state.svelte.ts       # Central reactive state container
│   ├── rack-module.ts        # Rack CRUD operations
│   ├── device-module.ts      # Device placement operations
│   ├── rack-group-module.ts  # Rack group/bay management
│   ├── device-type-module.ts # Device type library management
│   └── settings-module.ts    # Layout settings
└── commands/
    ├── rack.ts               # Unchanged
    └── device.ts             # Unchanged
```

### Key Design Decisions

1. **Central State Container:** All `$state` and `$derived` runes live in `state.svelte.ts`. Domain modules receive this state object and mutate it directly.

2. **Commands Unchanged:** The existing command pattern (`RackCommandStore`, `DeviceCommandStore` interfaces) continues working. Domain modules implement the `*Raw` methods that commands call.

3. **No Wrapper Objects:** To avoid Svelte 5 reactivity issues, domain modules don't wrap state in new objects. They operate directly on the state reference.

4. **Orchestrator Pattern:** `layout.svelte.ts` becomes a thin orchestrator that:
   - Creates the state container
   - Wires up domain modules
   - Exposes the public API (delegating to modules)
   - Manages undo/redo history

### Risks Acknowledged

- **Svelte 5 Reactivity:** Object identity matters. Careful not to break reactivity by creating intermediate objects.
- **Cross-Module Dependencies:** Some operations span modules (e.g., deleting device type removes devices). Need clear ownership.
- **Two-Layer API:** Orchestrator delegates to modules - ensure this doesn't create confusion.

### Implementation Order (When Ready)

1. Extract `state.svelte.ts` with all reactive state
2. Extract `settings-module.ts` (simplest, fewest dependencies)
3. Extract `device-type-module.ts`
4. Extract `rack-module.ts`
5. Extract `device-module.ts`
6. Extract `rack-group-module.ts` (most complex due to bay logic)
7. Verify all tests pass at each step

### Success Criteria

- `layout.svelte.ts` reduced to ~300-400 lines
- All existing tests pass without modification
- No regression in undo/redo functionality
- Each module independently testable

## Alternatives Considered

### Approach 1: Pure Functions Only

- Extract stateless helpers only
- ~15-18% reduction (~500-600 lines)
- Rejected: Insufficient improvement for the effort

### Approach 3: Multiple Stores

- Split into separate Svelte stores
- Would require major architectural changes
- Rejected: Too risky, breaks existing patterns
