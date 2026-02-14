
# KPI Tiles Dashboard for Radar Center

## What will be added

A prominent KPI tiles section at the top of the Radar page (below the header/period selector, above the Daily Briefing). It displays key metrics as visual cards that respond to the selected period filter.

## KPI Tiles (4 cards in a grid)

| Tile | Data Source | Icon | Color |
|------|-----------|------|-------|
| **Mentions** | `mentions` count for period | MessageSquare | Blue/Primary |
| **Articles collectes** | `actualites` count for period | Newspaper | Emerald |
| **Alertes actives** | `alertes` where `traitee=false` | ShieldAlert | Red/Critical |
| **Score d'influence** | Average `score_influence` from mentions | TrendingUp | Amber |

Each card shows:
- Large value number
- Label
- Subtext (e.g. period context)
- Skeleton loading state

## Technical approach

### 1. New component: `src/components/radar/RadarKpiTiles.tsx`
- Reuses the same `KpiCard` pattern already established in `SecurityKpiCards`
- Accepts data from the existing `useRadarKPIs` hook (already returns `mentions`, `articles`, `scoreInfluence`, `alertesActives`)
- Typed props, skeleton loading, responsive grid (2 cols mobile, 4 cols desktop)

### 2. Update `RadarPage.tsx`
- Import and place `RadarKpiTiles` between the period selector and `DailyBriefing`
- Pass `kpis` data and `kpisLoading` state (already available)

### 3. Update barrel export `src/components/radar/index.ts`
- Add `RadarKpiTiles` export

### Files changed
- **Create**: `src/components/radar/RadarKpiTiles.tsx`
- **Edit**: `src/pages/RadarPage.tsx` (add import + JSX)
- **Edit**: `src/components/radar/index.ts` (add export)

No database changes needed -- all data already available via `useRadarKPIs`.
