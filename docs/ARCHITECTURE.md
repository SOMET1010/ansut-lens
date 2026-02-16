# Architecture Technique

## Vue d'ensemble

ANSUT RADAR est une Single Page Application (SPA) React avec un backend serverless via Lovable Cloud.

```
┌─────────────────────────────────────────────────────────────┐
│                      NAVIGATEUR                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              React SPA (Vite + TypeScript)          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │    │
│  │  │  Pages   │ │Components│ │   TanStack Query │    │    │
│  │  └──────────┘ └──────────┘ └──────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LOVABLE CLOUD                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  PostgreSQL  │  │Edge Functions│  │     Storage      │   │
│  │ (30+ tables) │  │ (23 funcs)   │  │    (avatars)     │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │     Auth     │  │   Realtime   │  │   CRON Jobs      │   │
│  │  (4 rôles)   │  │ (WebSocket)  │  │  (pg_cron)       │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    APIs EXTERNES                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Perplexity  │  │Google Gemini │  │     Resend       │   │
│  │  (recherche) │  │ (Lovable AI) │  │    (emails)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Stack Technique

### Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18.3 | Framework UI |
| TypeScript | 5.x | Typage statique |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling utility-first |
| shadcn/ui | - | Composants UI (50+) |
| TanStack Query | 5.x | Cache & data fetching |
| React Router | 6.x | Routing SPA |
| Recharts | 2.x | Graphiques & visualisations |
| @dnd-kit | - | Drag & drop (Studio Newsletter) |

### Backend (Lovable Cloud)

| Service | Usage |
|---------|-------|
| PostgreSQL | Base de données (30+ tables) |
| Edge Functions | API serverless (23 fonctions) |
| Auth | Authentification (4 rôles + permissions granulaires) |
| Storage | Stockage fichiers (avatars) |
| Realtime | WebSocket temps réel |
| pg_cron | Tâches planifiées |

### APIs Externes

| API | Usage | Secret |
|-----|-------|--------|
| Perplexity | Recherche web IA | `PERPLEXITY_API_KEY` |
| Google Gemini | Analyse et génération IA (via Lovable AI) | Géré automatiquement |
| Resend | Envoi d'emails | `RESEND_API_KEY` |
| SMS API | Envoi d'alertes SMS | `SMS_API_KEY` |

## Patterns & Conventions

### Architecture des Composants

```
src/components/
├── ui/                 # shadcn/ui primitives (NE PAS MODIFIER)
├── auth/               # Composants d'authentification
├── layout/             # AppHeader, AppSidebar, AppLayout
├── personnalites/      # Composants métier Personnalités
├── actualites/         # Composants métier Actualités (clusters, sidebar, search)
├── dossiers/           # Composants métier Dossiers & Newsletter widget
├── flux/               # Composants métier Flux de veille
├── spdi/               # Composants SPDI (15 composants : Gauge, Radar, Evolution, Benchmark, etc.)
├── radar/              # Composants Centre de Veille (Briefing, Intelligence, Social, Alertes)
├── assistant/          # Composants Assistant IA (Chat, Context, Document, Mode)
├── newsletter/         # Composants Newsletter (Editor, Preview, Scheduler, Destinataires)
│   └── studio/         # Studio WYSIWYG (Canvas, Blocks, Toolbar, Properties)
│       └── blocks/     # Blocs individuels (Header, Article, Edito, Tech, etc.)
├── formation/          # Composants Formation (GuideViewer, GuidePDFLayout)
├── presentation/       # Composants Présentation (SlideLayout, 12 slides)
├── import-acteurs/     # Import CSV acteurs (EditableCell, StatsPanel, SourceBadge)
├── admin/              # Composants Administration (UserCard, RolePermissions, Audit, etc.)
├── documentation/      # Composants Doc Technique (TechDocContent, PDFLayout)
├── notifications/      # Système d'alertes (NotificationCenter, AlertNotificationProvider)
└── profile/            # Gestion profil utilisateur (AvatarUpload, ChangePassword, ProfileForm)
```

### Hooks Personnalisés (20+)

| Hook | Fichier | Description |
|------|---------|-------------|
| `useAuth` | `contexts/AuthContext.tsx` | Authentification et rôles |
| `useActualites` | `hooks/useActualites.ts` | CRUD actualités |
| `usePersonnalites` | `hooks/usePersonnalites.ts` | CRUD personnalités |
| `useDossiers` | `hooks/useDossiers.ts` | CRUD dossiers analytiques |
| `useFluxVeille` | `hooks/useFluxVeille.ts` | Gestion flux de veille |
| `useConversationsIA` | `hooks/useConversationsIA.ts` | Historique conversations IA |
| `usePresenceDigitale` | `hooks/usePresenceDigitale.ts` | Métriques SPDI |
| `useActeurDigitalDashboard` | `hooks/useActeurDigitalDashboard.ts` | Dashboard influence par acteur |
| `useBenchmarkData` | `hooks/useBenchmarkData.ts` | Comparaison Benchmark SPDI |
| `useSocialInsights` | `hooks/useSocialInsights.ts` | Données réseaux sociaux |
| `useSpdiStatus` | `hooks/useSpdiStatus.ts` | Status calculs SPDI |
| `useRadarData` | `hooks/useRadarData.ts` | KPIs du radar |
| `useDailyBriefing` | `hooks/useDailyBriefing.ts` | Briefing quotidien IA |
| `useArticleClusters` | `hooks/useArticleClusters.ts` | Clustering d'actualités |
| `useNewsletters` | `hooks/useNewsletters.ts` | CRUD newsletters |
| `useNewsletterScheduler` | `hooks/useNewsletterScheduler.ts` | Programmation envois |
| `useDiffusionScheduler` | `hooks/useDiffusionScheduler.ts` | Diffusion automatisée |
| `useSourcesMedia` | `hooks/useSourcesMedia.ts` | Gestion sources média |
| `useCronJobs` | `hooks/useCronJobs.ts` | Gestion CRON (admin) |
| `useUserProfile` | `hooks/useUserProfile.ts` | Profil utilisateur |
| `useUserPermissions` | `hooks/useUserPermissions.ts` | Permissions granulaires |
| `useRolePermissions` | `hooks/useRolePermissions.ts` | Config permissions par rôle |
| `useRealtimeAlerts` | `hooks/useRealtimeAlerts.ts` | Alertes temps réel |
| `useRealtimeCronAlerts` | `hooks/useRealtimeCronAlerts.ts` | Alertes CRON temps réel |
| `useAlertesHistory` | `hooks/useAlertesHistory.ts` | Historique alertes |
| `useMotsClesVeille` | `hooks/useMotsClesVeille.ts` | Mots-clés de veille |
| `useAdminStats` | `hooks/useAdminStats.ts` | Statistiques admin |
| `useSidebarAnalytics` | `hooks/useSidebarAnalytics.ts` | Analytics sidebar |

### Gestion d'État

```typescript
// TanStack Query pour les données serveur
const { data, isLoading, error } = useQuery({
  queryKey: ['personnalites'],
  queryFn: fetchPersonnalites,
});

// Context API pour l'état global
const { user, isAdmin, signOut } = useAuth();

// useState pour l'état local UI
const [isOpen, setIsOpen] = useState(false);
```

### Conventions de Nommage

| Type | Convention | Exemple |
|------|------------|---------|
| Composants | PascalCase | `ActeurCard.tsx` |
| Hooks | camelCase avec `use` | `usePersonnalites.ts` |
| Pages | PascalCase + `Page` | `PersonnalitesPage.tsx` |
| Types | PascalCase | `Personnalite` |
| Constantes | SCREAMING_SNAKE | `API_BASE_URL` |
| Fichiers CSS | kebab-case | `index.css` |

## Flux de Données

### Lecture (Query)

```
Component → useQuery → supabase.from().select() → PostgreSQL
     ↑                                                  │
     └──────────── Cache TanStack Query ←───────────────┘
```

### Écriture (Mutation)

```
Component → useMutation → supabase.from().insert/update/delete()
     │                                      │
     └── invalidateQueries ←── onSuccess ←──┘
```

### Temps Réel (Realtime)

```
PostgreSQL ──► supabase.channel().on('postgres_changes') ──► Component
                                                               │
                                                         setState/refetch
```

## Sécurité

### Row Level Security (RLS)

Toutes les tables ont RLS activé avec des politiques basées sur :
- `auth.uid()` pour les données utilisateur
- `has_role(auth.uid(), 'admin')` pour les données admin
- `has_permission(auth.uid(), 'code')` pour les permissions granulaires

### Protection des Routes

```typescript
// Route protégée standard
<ProtectedRoute><Page /></ProtectedRoute>

// Route basée sur les permissions
<PermissionRoute permission="view_personnalites">
  <ActeursInfluencePage />
</PermissionRoute>
```

### Edge Functions

Toutes les Edge Functions vérifient :
1. Token JWT valide
2. Rôle approprié via `has_role()`
3. Permissions spécifiques via `has_permission()`

---

Voir aussi : [Database](./DATABASE.md) | [Authentication](./AUTHENTICATION.md) | [Edge Functions](./EDGE-FUNCTIONS.md)
