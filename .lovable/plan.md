

# Nettoyage Total Anti-Vibecoding -- ANSUT RADAR

## Phase 0 -- Inventaire et Diagnostic

### Fichiers morts (dead code)

| Fichier | Raison |
|---------|--------|
| `src/pages/Index.tsx` | Page "Welcome to Your Blank App" -- jamais affichee (route `/` redirige vers `/radar`) |
| `src/App.css` | CSS Vite par defaut (logo spin, .card, .read-the-docs) -- jamais utilise |
| `src/components/NavLink.tsx` | Wrapper NavLink custom -- zero import dans tout le projet |
| `src/components/personnalites/ActeurFilters.tsx` | Remplace par `UnifiedFilterBar` -- zero import |
| `src/components/personnalites/StatsBar.tsx` | Remplace par `CompactStats` -- zero import |
| `src/components/personnalites/ActeurCard.tsx` | Remplace par `SmartActeurCard` -- zero import |

### Duplication de logique

| Code duplique | Occurrences | Centralise dans |
|---------------|-------------|-----------------|
| `getInitials()` | 4 copies (AppSidebar, AvatarUpload, AuditLogsPage, activity-status.ts) | `src/utils/activity-status.ts` (deja present) |

### Usages de `any` a eliminer

| Fichier | Ligne | Correction |
|---------|-------|------------|
| `src/pages/admin/DiffusionPage.tsx` | L131-133, L139, L236 | Typer `ChannelCardProps` avec les vrais types |
| `src/hooks/useDiffusionScheduler.ts` | L12, L28, L67 | Typer `destinataires` et `details` avec interfaces |
| `src/contexts/AuthContext.tsx` | L47 | Cast vers le type `profiles` correct |
| `src/pages/ResetPasswordPage.tsx` | L315 | Idem |
| `src/pages/admin/UsersPage.tsx` | L674 | Cast `role as AppRole` au lieu de `as any` |

### `console.log` a retirer

| Fichier | Details |
|---------|---------|
| `src/pages/RadarPage.tsx` L89 | `console.log('View signal details:')` -- placeholder |
| `src/hooks/useRealtimeAlerts.ts` L52 | `console.log('SMS critique envoye')` -- a remplacer par rien ou log conditionnel |

Les `console.log` dans `AuthContext.tsx`, `ResetPasswordPage.tsx`, et `App.tsx` sont des logs systeme utiles prefixes `[Auth]` / `[HashRedirect]` -- a conserver.

### `AdminStatBadge` -- Exporte dans le barrel mais jamais importe ailleurs

Ce composant est exporte via `src/components/admin/index.ts` mais aucun fichier ne l'importe. A verifier si utilise dans `UserCard` ou similaire, sinon supprimer l'export.

---

## Phase 1 -- Nettoyage immediat

### 1.1 Supprimer les fichiers morts
- Supprimer `src/pages/Index.tsx`
- Supprimer `src/App.css`
- Supprimer `src/components/NavLink.tsx`
- Supprimer `src/components/personnalites/ActeurFilters.tsx`
- Supprimer `src/components/personnalites/StatsBar.tsx`
- Supprimer `src/components/personnalites/ActeurCard.tsx`

### 1.2 Retirer les imports d'App.css
- Dans `src/main.tsx` ou `src/App.tsx` : retirer `import "./App.css"` si present

### 1.3 Retirer les `console.log` inutiles
- `RadarPage.tsx` L89 : remplacer le callback par un vrai handler ou un noop
- `useRealtimeAlerts.ts` L52 : supprimer

### 1.4 Nettoyer les imports inutiles
- Verifier chaque page pour les imports non utilises (ex: `Users`, `Sparkles` dans certaines pages si non references)

---

## Phase 2 -- Elimination des `any` et typage strict

### 2.1 Creer des interfaces pour la diffusion

```typescript
// Dans src/types/diffusion.ts
export interface Destinataire {
  nom: string;
  numero?: string;
  chat_id?: string;
  email?: string;
}

export type CanalDiffusion = 'sms' | 'telegram' | 'email' | 'whatsapp';

export interface DiffusionProgrammation {
  id: string;
  canal: CanalDiffusion;
  actif: boolean;
  frequence: string;
  heure_envoi: string;
  jours_envoi: number[] | null;
  destinataires: Destinataire[];
  contenu_type: string;
  dernier_envoi: string | null;
  prochain_envoi: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiffusionLog {
  id: string;
  canal: CanalDiffusion;
  contenu_type: string;
  message: string | null;
  destinataires_count: number;
  succes_count: number;
  echec_count: number;
  details: Record<string, unknown> | null;
  created_at: string;
}
```

### 2.2 Typer `ChannelCardProps` dans DiffusionPage
- Remplacer `config: any`, `meta: any`, `Icon: any` par les vrais types
- Remplacer `(d: any, i: number)` par `(d: Destinataire, i: number)`

### 2.3 Eliminer `as any` dans AuthContext et ResetPasswordPage
- Creer un type partiel pour les updates profil compatible avec le schema genere

---

## Phase 3 -- Deduplication `getInitials`

### 3.1 Centraliser
- `src/utils/activity-status.ts` contient deja une version canonique
- Modifier la signature pour accepter `(name: string | null | undefined, fallbackEmail?: string): string`

### 3.2 Remplacer les copies locales
- `AppSidebar.tsx` : supprimer la fonction locale, importer depuis `@/utils/activity-status`
- `AvatarUpload.tsx` : idem
- `AuditLogsPage.tsx` : idem

---

## Phase 4 -- Coherence UI/UX

### 4.1 Pattern Loading/Empty/Error uniforme
Les pages suivent deja un pattern assez coherent (Skeleton + empty states). Points a unifier :

- `RadarPage.tsx` L89 : le `onViewDetails` est un `console.log` -- implementer ou supprimer le bouton
- `DiffusionPage.tsx` : le empty state de l'historique utilise un `<p>` simple -- utiliser le meme pattern que les autres pages

### 4.2 Pas de restructuration feature-first
Le projet utilise deja une organisation coherente par domaine (`components/radar/`, `components/admin/`, `hooks/useRadarData.ts`, etc.). Une migration vers `/features/*` serait un refactor massif avec risque de regression pour un gain minimal. **Decision : conserver la structure actuelle** qui est deja bien organisee.

---

## Phase 5 -- Stabilite

### 5.1 Deja en place
- ErrorBoundary global : present dans `App.tsx`
- Page 404 : `NotFound.tsx` en place
- Page Access Denied : `AccessDeniedPage.tsx` en place
- Auth guard : `ProtectedRoute` + `PermissionRoute` en place
- Validation Zod : deja utilise dans `AuthPage.tsx`, `json-schemas.ts`

### 5.2 Manquant
- Aucun test unitaire ou smoke test -- a ajouter dans une phase ulterieure (P1)

---

## Resume des changements

| Action | Fichiers | Risque |
|--------|----------|--------|
| Supprimer 6 fichiers morts | Index.tsx, App.css, NavLink.tsx, ActeurFilters.tsx, StatsBar.tsx, ActeurCard.tsx | Zero -- aucun import |
| Retirer import App.css | App.tsx | Zero |
| Retirer 2 console.log | RadarPage, useRealtimeAlerts | Zero fonctionnel |
| Creer types diffusion | Nouveau fichier | Zero |
| Typer DiffusionPage + hook | 2 fichiers | Faible -- meme logique |
| Deduplication getInitials | 3 fichiers modifies | Faible -- meme comportement |
| Typer `as any` AuthContext/ResetPassword | 2 fichiers | Faible |

### Risques de regression
- **Aucun fichier fonctionnel n'est supprime** -- uniquement du dead code
- **Les types remplacent des `any`** -- meme comportement runtime, meilleure securite compile
- **La deduplication `getInitials`** preservera les deux signatures (avec/sans email fallback)

### TODO final

| Priorite | Tache |
|----------|-------|
| P0 | Supprimer dead code + App.css (cette phase) |
| P0 | Eliminer les `any` dans DiffusionPage/hook (cette phase) |
| P0 | Dedupliquer `getInitials` (cette phase) |
| P1 | Ajouter des tests smoke (routes principales chargent) |
| P1 | Verifier `AdminStatBadge` -- supprimer si non utilise |
| P2 | Implementer le `onViewDetails` du CriticalAlertBanner dans RadarPage |
| P2 | Unifier les empty states avec un composant partage `EmptyState` |

