

## AI Briefing Generator Button in the Header

Add a "Briefing DG" button to the global header that opens a popover displaying an AI-generated executive briefing, powered by Google Gemini Flash (via the existing `generer-briefing` backend function).

### What it does

- A new briefing icon button (Briefcase icon) appears in the header toolbar, between the sync badge and the theme toggle
- Clicking it opens a popover panel showing the DG briefing
- The briefing is generated on-demand using the existing `generer-briefing` edge function (Google Gemini Flash)
- A "Regenerate" button lets users refresh the briefing
- Shows loading skeleton while generating, error states with fallback, and critical alerts count
- Uses the existing `useDailyBriefing` hook which already handles caching (2h TTL), error fallback, and state management

### Files to modify

1. **`src/components/layout/AppHeader.tsx`**
   - Import `Popover`, `PopoverTrigger`, `PopoverContent` from shadcn
   - Import `useDailyBriefing` hook
   - Import `Briefcase`, `RefreshCw`, `ShieldAlert`, `AlertCircle` icons
   - Import `RelativeTime` component
   - Add a popover-wrapped icon button in the header toolbar (before the theme toggle)
   - Inside the popover: render briefing title, content, generation timestamp, regenerate button, and alerts indicator
   - The popover panel will be ~400px wide with a max-height and scroll area

### No new files, no backend changes

The existing `generer-briefing` edge function and `useDailyBriefing` hook already provide all the backend logic, caching, and error handling needed. This change is purely a UI addition to the header.

### Technical details

The header button will use the existing hook directly:

```tsx
const { briefing, generatedAt, alertsCount, isLoading, isGenerating, error, regenerate } = useDailyBriefing();
```

The popover content will display:
- Title: "Briefing DG"
- Timestamp via `RelativeTime`
- Briefing text (or loading skeleton / error fallback)
- Critical alerts count badge if > 0
- Regenerate button with spinning icon during generation

The button itself will show a subtle badge dot when there are critical alerts, drawing attention to the briefing.
