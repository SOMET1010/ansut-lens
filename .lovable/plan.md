

## Radar Center Map with Draggable Quadrant Filters

Replace the existing `CompactRadar` (a flat text-based grid) with a visual, interactive radar map that displays signals as positioned dots across four quadrants, with draggable filter chips to toggle quadrants on/off.

### What it does

- A circular SVG radar visualization with concentric rings (impact zones) and four labeled quadrants: Tech, Regulation, Market, Reputation
- Signals are plotted as colored dots based on their quadrant position and severity level (critical = red, warning = amber, info = blue)
- Four draggable filter chips sit above the radar -- users can drag them to reorder priority or click to toggle visibility of each quadrant
- Clicking a signal dot shows a tooltip with signal details (title, impact score, trend)
- Replaces the current `CompactRadar` on the Radar page; also updates the barrel export

### Visual layout

```text
+---------------------------------------------+
|  Radar Strategique       [12 signaux actifs] |
+---------------------------------------------+
|  [TECH] [REGUL.] [MARCHE] [REPUT.]  filters |
|                                              |
|              Regulation                      |
|                 .  .                         |
|           .         .                        |
|   Tech  .    (center)   .  Market            |
|           .         .                        |
|                 .  .                         |
|              Reputation                      |
|                                              |
+---------------------------------------------+
```

### Files to create/modify

1. **New: `src/components/radar/RadarCenterMap.tsx`**
   - SVG-based circular radar with 3 concentric rings and cross-hair axes dividing 4 quadrants
   - Signals positioned using quadrant angle + impact score for radial distance (higher impact = closer to center)
   - Each signal is a colored circle with tooltip (using shadcn Tooltip)
   - Quadrant labels at the edges (TECH top-left, REGUL. top-right, MARCHE bottom-right, REPUT. bottom-left)
   - Accepts `activeQuadrants` filter state to show/hide quadrants
   - Loading skeleton state

2. **New: `src/components/radar/QuadrantFilterBar.tsx`**
   - Row of 4 filter chips using `@dnd-kit/sortable` (already installed) for drag-to-reorder
   - Each chip is colored by quadrant and toggleable (click to enable/disable)
   - Manages `activeQuadrants: Set<QuadrantType>` and `quadrantOrder: QuadrantType[]`
   - Emits `onFilterChange(activeQuadrants)` and `onOrderChange(order)` callbacks

3. **Modified: `src/components/radar/CompactRadar.tsx`**
   - Refactor to compose `QuadrantFilterBar` + `RadarCenterMap` internally
   - Same props interface (`signaux`, `isLoading`) so RadarPage needs no changes
   - Filters signals by active quadrants before passing to the map

4. **Modified: `src/components/radar/index.ts`**
   - Add exports for `RadarCenterMap` and `QuadrantFilterBar`

### Technical details

**Signal positioning algorithm** (inside RadarCenterMap):
```typescript
// Each quadrant occupies a 90-degree sector
const quadrantAngles = { tech: -135, regulation: -45, market: 45, reputation: 135 };

function getSignalPosition(signal: Signal, index: number, total: number) {
  const baseAngle = quadrantAngles[signal.quadrant];
  // Spread signals within the 90-degree sector
  const spread = (index / Math.max(total - 1, 1) - 0.5) * 70;
  const angle = (baseAngle + spread) * (Math.PI / 180);
  // Higher impact = closer to center (inverted radius)
  const radius = 15 + (100 - signal.score_impact) * 0.3;
  return {
    x: 50 + radius * Math.cos(angle),
    y: 50 + radius * Math.sin(angle),
  };
}
```

**Drag-and-drop** uses `@dnd-kit/core` + `@dnd-kit/sortable` (both already installed):
- `DndContext` + `SortableContext` wrapping the 4 filter chips
- `useSortable` hook on each chip
- `onDragEnd` updates the order array

**Color mapping** for quadrants:
- Tech: blue (#3B82F6)
- Regulation: amber (#F59E0B)
- Market: green (#22C55E)
- Reputation: purple (#A855F7)

**Signal dot colors** by severity level (reusing existing theme tokens):
- critical: `signal-critical` (red)
- warning: `signal-warning` (amber)
- info: `primary` (blue)

**No database changes needed.** Uses existing `signaux` table data via `useRadarSignaux` hook.

**No new dependencies.** Uses `@dnd-kit/*` (installed), shadcn Tooltip (installed), and native SVG.
