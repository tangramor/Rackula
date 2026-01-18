# Sidebar Menu Cleanup Design

**Date:** 2025-01-18
**Parent Issue:** #533
**Status:** Approved

## Problem

The DevicePalette sidebar has a cluttered lower section with three buttons:

- "Import" (device library JSON)
- "Add Device" (custom device form)
- "Import from NetBox YAML"

Issues identified:

- Too cluttered for a sidebar that should focus on browse & drag
- Confusing hierarchy between the three options
- Inconsistent styling (two inline buttons + one full-width dashed)
- Violates Geismar minimalism principles

## Solution

Move all import/add device features to the File menu, leaving the DevicePalette clean and focused on browsing.

### New File Menu Structure

```
┌─────────────────────────┐
│ Save              ⌘S    │
│ Load              ⌘O    │
├─────────────────────────┤
│ Export            ⌘E    │
│ Share                   │
├─────────────────────────┤
│ Import Devices          │
│ Import from NetBox      │
│ New Custom Device       │
└─────────────────────────┘
```

Three groups separated by dividers:

1. File operations (Save/Load)
2. Output operations (Export/Share)
3. Device library operations (Import/NetBox/Custom)

### DevicePalette After

The bottom section becomes empty — a clean edge with no action buttons.

## Implementation

### Files to Modify

1. **`FileMenu.svelte`**
   - Add props: `onimportdevices`, `onimportnetbox`, `onnewcustomdevice`
   - Add `DropdownMenu.Separator` before device group
   - Add three new `DropdownMenu.Item` entries with concise labels

2. **`DevicePalette.svelte`**
   - Remove the `palette-actions` section with all three buttons
   - Remove associated state/handlers (moved to App.svelte orchestration)
   - Clean up orphaned imports

3. **`App.svelte`**
   - Pass existing handlers to FileMenu's new props
   - Handlers already exist: `handleImportDevices`, `handleImportNetBox`, `handleAddDevice`

### No New Components

Pure consolidation — no new files needed.

## Mobile & Accessibility

- File menu already accessible on mobile via toolbar
- No new keyboard shortcuts (low-frequency actions)
- Menu items inherit existing accessibility from bits-ui DropdownMenu
- Mobile FAB remains focused on device browsing

## Discoverability Trade-off

Import/add features become less prominent (intentional). Users looking to import will naturally check the File menu. This is acceptable for low-frequency power-user features.

## Testing

Manual verification:

1. File menu shows three new items in third group
2. "Import Devices" opens JSON file picker
3. "Import from NetBox" opens NetBox dialog
4. "New Custom Device" opens AddDeviceForm dialog
5. DevicePalette bottom area is clean
6. Mobile: File menu accessible, FAB works

No new automated tests needed — handlers already exist and work.

## Risk

Low — pure UI reorganization with no logic changes.
