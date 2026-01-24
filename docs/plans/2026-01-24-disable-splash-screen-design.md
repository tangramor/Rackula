# Disable Splash Screen Behavior

**Issue:** #948
**Date:** 2026-01-24
**Status:** Design approved

## Problem

The StartScreen (splash screen) breaks the user experience:

1. **Blocks autosave load** - Users can't resume where they left off instantly
2. **Race conditions** - API health check, localStorage, and StartScreen interact poorly
3. **Broken user flow** - Users expect instant resume, not a selection screen

## Solution

Remove the StartScreen gate entirely. The app loads directly to the canvas, restoring the localStorage autosave immediately.

### Startup Flow (After Fix)

```
App mounts
    │
    ├─ Show canvas immediately
    │
    ├─ Load localStorage autosave (synchronous, instant)
    │       └─ No autosave? → Show New Rack wizard
    │
    └─ Background: Check API health, enable server auto-save if available
```

### What Changes

| Component                               | Change                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/App.svelte`                        | Remove `showStartScreen` state, remove `{#if showStartScreen}` conditional, remove `StartScreen` import |
| `src/lib/components/StartScreen.svelte` | Keep file (don't delete) - may repurpose as "Open from Server" dialog later                             |

### What Stays the Same

- localStorage autosave/restore (works immediately)
- File-based Load/Save (`.Rackula.zip` via Ctrl+O/Ctrl+S)
- Background auto-save to server when API available
- Share link handling (URL param takes priority)
- New Rack wizard for empty state

### What We Lose (Acceptable)

- Startup layout picker for server-saved layouts
- Visual indicator that server persistence is available

These can be restored in a future issue via "File → Open from Server..." menu item.

## Implementation

### Step 1: Remove splash screen gate in App.svelte

```svelte
// REMOVE these lines:
let showStartScreen = $state(true);

// REMOVE this conditional:
{#if showStartScreen}
  <StartScreen onClose={handleStartScreenClose} />
{:else}
  <!-- main app -->
{/if}

// REMOVE the import:
import StartScreen, { type StartScreenCloseOptions } from "$lib/components/StartScreen.svelte";

// REMOVE the handler:
function handleStartScreenClose(options?: StartScreenCloseOptions) { ... }
```

### Step 2: Ensure onMount loads autosave

The existing `onMount` at line 235 already has autosave loading logic, but it's bypassed when `showStartScreen` is true:

```typescript
// This check needs to be removed:
if (showStartScreen) {
  return;
}
```

After removing the splash screen, the autosave loading flows naturally.

### Step 3: Simplify server persistence initialization

Move API health check to background without blocking UI:

```typescript
onMount(() => {
  // Non-blocking: start API health check in background
  initializePersistence(); // Don't await

  // Immediate: handle share links and autosave
  // ... existing logic ...
});
```

## Edge Cases

| Scenario                  | Behavior                                            |
| ------------------------- | --------------------------------------------------- |
| Share link in URL         | Load shared layout (existing priority 1)            |
| localStorage has autosave | Load it immediately                                 |
| No autosave, no racks     | Show New Rack wizard                                |
| API available             | Background auto-save works silently                 |
| API unavailable           | localStorage-only mode (no user-visible difference) |

## Testing

1. Clear localStorage, open app → New Rack wizard appears
2. Create rack, place device, refresh → Layout restored instantly
3. With API available → No splash, but server auto-save works (check network tab)
4. Share link → Loads shared layout, no splash

## Future Enhancements

- Add "File → Open from Server..." menu item to browse server-saved layouts (#TBD)
- Add subtle status indicator showing persistence mode (server/local)
