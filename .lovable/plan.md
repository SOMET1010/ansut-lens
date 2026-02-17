

## Spotlight Quick Search (Cmd+K)

Replace the static search input in the global header with a Spotlight-style command palette that searches across four data domains in real time.

### What it does

- Pressing `Ctrl+K` (or `Cmd+K` on Mac), or clicking the search bar in the header, opens a full-screen command dialog
- As the user types, it queries four tables in parallel: Actualites, Personnalites, Sources Media, and Dossiers
- Results are grouped by category with icons, and clicking a result navigates to the relevant page
- Debounced search (300ms) to avoid excessive queries
- Keyboard navigation built-in (provided by cmdk library already installed)

### Navigation targets

| Category | Table | Display | Navigate to |
|---|---|---|---|
| Actualites | `actualites` | titre + source_nom | `/actualites` |
| Personnalites | `personnalites` | nom + fonction + organisation | `/acteurs` |
| Sources Media | `sources_media` | nom + type | `/admin/sources` |
| Dossiers | `dossiers` | titre + categorie | `/dossiers` |

### Quick actions (no search needed)

Static items always visible when the search is empty:
- Centre de Veille -> `/radar`
- Actualites -> `/actualites`
- Acteurs & Influence -> `/acteurs`
- Dossiers -> `/dossiers`
- Assistant IA -> `/assistant`

### Files to create/modify

1. **New: `src/components/layout/SpotlightSearch.tsx`**
   - Uses `CommandDialog`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandEmpty` from the existing `cmdk`-based UI component
   - Registers a global `keydown` listener for Ctrl/Cmd+K
   - On input change (debounced 300ms), runs 4 parallel Supabase queries with `.ilike` text search, limited to 5 results each
   - Each result item calls `useNavigate()` on click and closes the dialog
   - Shows loading skeleton while fetching

2. **Modified: `src/components/layout/AppHeader.tsx`**
   - Remove the static `Input` search field
   - Replace with a clickable button styled like a search bar that shows the `Ctrl+K` shortcut hint
   - Clicking it opens the `SpotlightSearch` dialog
   - Import and render `SpotlightSearch`

### Technical details

**Search query approach** (inside SpotlightSearch):
```typescript
// Parallel queries with Promise.all
const [actualites, personnalites, sources, dossiers] = await Promise.all([
  supabase.from('actualites').select('id, titre, source_nom').ilike('titre', `%${query}%`).limit(5),
  supabase.from('personnalites').select('id, nom, prenom, fonction, organisation').or(`nom.ilike.%${query}%,fonction.ilike.%${query}%,organisation.ilike.%${query}%`).limit(5),
  supabase.from('sources_media').select('id, nom, type').ilike('nom', `%${query}%`).limit(5),
  supabase.from('dossiers').select('id, titre, categorie').ilike('titre', `%${query}%`).limit(5),
]);
```

**Keyboard shortcut**: `useEffect` with `keydown` event for `k` key + metaKey/ctrlKey.

**No database changes needed.** All tables already have `SELECT` policies for authenticated users.

**No new dependencies.** Uses the existing `cmdk` package (already installed) via the shadcn Command component.
