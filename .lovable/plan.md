
# Real-Time Alert Feed for Critical Mentions

## What will be added

A live-updating alert feed widget on the Radar page that shows critical and warning alerts in real time, with auto-scroll to the newest entry. It leverages the existing `useRealtimeAlerts` hook (already subscribed to `alertes` table via Postgres realtime) and the `AlertNotificationProvider` context.

## Component: `RealtimeAlertFeed`

**Location**: `src/components/radar/RealtimeAlertFeed.tsx`

A card containing:
- Header with unread count badge and "Marquer tout lu" button
- A `ScrollArea` (max-height ~320px) showing the latest alerts
- Each alert row displays: level icon (color-coded), title, message excerpt, relative timestamp, and read/unread indicator
- Auto-scroll: a `useEffect` + `useRef` on the scroll container that scrolls to top whenever `recentAlerts` changes (newest first)
- Empty state when no alerts exist

**Alert level styling**:
| Level | Icon | Color |
|-------|------|-------|
| critical | ShieldAlert | Red (destructive) |
| warning | AlertTriangle | Orange/Amber |
| info | Info | Blue |

**Interactions**:
- Click an alert row to mark it as read (via `markAsRead` from context)
- "Marquer tout lu" button calls `markAllAsRead`

## Technical approach

### 1. Create `src/components/radar/RealtimeAlertFeed.tsx`
- Import `useAlertNotifications` from `AlertNotificationProvider` (already wraps the app)
- Use `ScrollArea` for the feed container
- `useRef` + `useEffect` to auto-scroll to top on new alerts
- Typed props: none needed (self-contained, reads from context)

### 2. Update `src/components/radar/index.ts`
- Add `RealtimeAlertFeed` export

### 3. Update `src/pages/RadarPage.tsx`
- Import and place `RealtimeAlertFeed` between `CriticalAlertBanner` and `SocialPulseWidget`

### Files changed
- **Create**: `src/components/radar/RealtimeAlertFeed.tsx`
- **Edit**: `src/components/radar/index.ts` (add export)
- **Edit**: `src/pages/RadarPage.tsx` (add import + JSX)

No database or migration changes needed -- the `alertes` table already has realtime enabled and the subscription hook is already active.
