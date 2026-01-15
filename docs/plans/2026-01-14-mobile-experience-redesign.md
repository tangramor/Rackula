# Mobile Experience Redesign

**Date:** 2026-01-14
**Discussion:** [#632](https://github.com/RackulaLives/Rackula/discussions/632)
**Milestone:** v0.8.0
**Status:** Approved

## Problem

Mobile users (nearly 50% of traffic) get a broken experience:

- No toolbar buttons visible on screens < 1024px
- Cannot load, save, export, or share layouts
- Warning modal tells users to use desktop instead

Primary use case from users: Design on desktop, view/reference on mobile while at the rack.

## Solution: View-First Mobile Experience

Redesign mobile UI with a bottom navigation bar, swipe-based rack switching, and updated messaging that welcomes mobile users.

### Design Principles

1. **View-first**: Optimize for loading and viewing layouts
2. **2-tap max**: All core functions accessible in 2 taps
3. **Thumb-friendly**: Bottom navigation follows iOS/Android conventions
4. **Keep editing**: Retain current placement mode capability

## Screen Layout

```
┌────────────────────────────────────────┐
│  🧛 Rackula                       [?]  │  ← Slim toolbar (40px)
├────────────────────────────────────────┤
│            "Main Rack"                 │  ← Rack indicator strip
│              ● ○ ○                     │
├────────────────────────────────────────┤
│                                        │
│                                        │
│              Canvas                    │  ← Swipeable, zoomable
│         (pan/zoom/tap)                 │
│                                        │
│                                        │
├────────────────────────────────────────┤
│   [File]       [View]      [Devices]   │  ← Bottom nav bar
│     📁           👁           📦        │
└────────────────────────────────────────┘
```

## Bottom Navigation Bar

Three grouped actions, each opening a bottom sheet:

### File Sheet

```
┌────────────────────────────────────────┐
│  File                              ✕   │
├────────────────────────────────────────┤
│  📂  Load Layout                       │
│  💾  Save Layout                       │
│  📤  Export Image                      │
│  🔗  Share Link                        │
└────────────────────────────────────────┘
```

### View Sheet

```
┌────────────────────────────────────────┐
│  View                              ✕   │
├────────────────────────────────────────┤
│  Display Mode          [Label ▾]       │
│  Annotations           [Off/On]        │
│  Theme                 [Dark/Light]    │
│  ──────────────────────────────────    │
│  🎯  Fit All                           │
│  ↻   Reset Zoom                        │
└────────────────────────────────────────┘
```

### Devices Sheet

```
┌────────────────────────────────────────┐
│  Device Library                    ✕   │
├────────────────────────────────────────┤
│  [Search...]                           │
│  Category filters (scrollable)         │
│  Device list (tap to place)            │
│  [+ Add Custom Device]                 │
└────────────────────────────────────────┘
```

## Rack Navigation

### Swipe Gestures

- Horizontal swipe on canvas switches between racks
- Minimum 50px swipe distance (prevents accidental triggers)
- Ignored during pan/zoom operations

### Gesture Conflict Resolution

```
if (gesture.isMultiTouch) → zoom (pinch)
if (gesture.totalPanDistance > 20px) → pan
if (gesture.isHorizontalFlick && !panned) → switch rack
```

### Rack Indicator Strip

- Shows current rack name + dot indicators
- Dots are tappable for accessibility
- Hidden when only one rack exists
- Many racks (>7): Shows counter "1/12" instead of dots

## Placement Mode

When user taps a device in Devices sheet:

1. Sheet closes
2. Placement indicator (ghost device) appears on canvas
3. Rack indicator strip changes to: "Tap to place: [Device Name]" + [✕]
4. User taps valid U position → device placed
5. Mode exits, returns to normal viewing

Bottom nav is dimmed/disabled during placement mode.

## Updated Warning Modal

Positive framing instead of "desktop is better":

```
┌────────────────────────────────────────┐
│            📱                          │
│                                        │
│     Welcome to Rackula Mobile          │
│                                        │
│  View and reference your rack layouts  │
│  on the go. For full editing features, │
│  visit on a desktop browser.           │
│                                        │
│  Tip: Load a layout from the File menu │
│  or scan a Share QR code.              │
│                                        │
│         [Got it]                       │
└────────────────────────────────────────┘
```

## Breakpoint

Keep existing breakpoint: **1024px**

- < 1024px: Mobile experience (bottom nav, swipe, sheets)
- ≥ 1024px: Desktop experience (sidebar, toolbar buttons)

## Implementation Issues

1. **Bottom Navigation Bar Component** - Foundation component (Medium)
2. **File Sheet** - Load, Save, Export, Share actions (Small)
3. **View Sheet** - Display/theme toggles, zoom actions (Small)
4. **Devices Sheet Migration** - Move from FAB to bottom nav (Small)
5. **Rack Indicator Strip** - Name + navigation dots (Small)
6. **Swipe Navigation** - Horizontal gesture on canvas (Medium)
7. **Update Mobile Warning Modal** - Positive messaging (Small)
8. **Mobile Toolbar Slim Mode** - Reduce to logo + help (Small)

## Accessibility

- All touch targets minimum 44x44px
- Dots are tappable buttons with aria-labels
- Sheet headers include close buttons
- Swipe has tap-dot alternative for motor impairments

## Future Considerations

- Offline support (service worker caching)
- "Add to Home Screen" PWA prompt
- Haptic feedback for placement confirmation
