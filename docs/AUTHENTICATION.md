# Authentification et Autorisations

## Vue d'ensemble

L'authentification est gérée par Lovable Cloud (Supabase Auth) avec :
- Authentification email/mot de passe
- Système de rôles à 4 niveaux
- Auto-confirmation des emails activée
- Row Level Security (RLS) sur toutes les tables

## Flux d'Authentification

### Inscription (Signup)

```
Utilisateur                    Frontend                     Backend
    │                              │                            │
    ├──── Formulaire ────────────►│                            │
    │     (email, password, name)  │                            │
    │                              ├──── signUp() ─────────────►│
    │                              │                            │
    │                              │◄──── Session + User ───────│
    │                              │                            │
    │◄──── Redirection ───────────│      (auto-confirm ON)     │
    │      /radar                  │                            │
```

### Connexion (Sign In)

```
Utilisateur                    Frontend                     Backend
    │                              │                            │
    ├──── Email + Password ───────►│                            │
    │                              ├──── signIn() ─────────────►│
    │                              │                            │
    │                              │◄──── Session + JWT ────────│
    │                              │                            │
    │◄──── Redirection ───────────│      (refresh auto)        │
    │      /radar                  │                            │
```

### Invitation Utilisateur (Admin)

```
Admin                          Frontend                     Edge Function
  │                              │                              │
  ├──── Inviter user ───────────►│                              │
  │     (email, name, role)      │                              │
  │                              ├──── invoke('invite-user') ──►│
  │                              │                              │
  │                              │      ┌─────────────────────┐ │
  │                              │      │ 1. Créer user       │ │
  │                              │      │ 2. Assigner rôle    │ │
  │                              │      │ 3. Envoyer email    │ │
  │                              │      └─────────────────────┘ │
  │                              │                              │
  │◄──── Confirmation ──────────│◄──── Success ────────────────│
```

### Reset Password

```
Utilisateur                    Frontend                     Backend
    │                              │                            │
    ├──── Email ──────────────────►│                            │
    │                              ├──── resetPassword() ──────►│
    │                              │                            │
    │◄──── Email avec lien ────────────────────────────────────│
    │                              │                            │
    ├──── Clic sur lien ──────────►│ /auth/reset-password      │
    │                              │                            │
    ├──── Nouveau password ───────►│                            │
    │                              ├──── updateUser() ─────────►│
    │                              │                            │
    │◄──── Confirmation ──────────│◄──── Success ──────────────│
```

## Système de Rôles

### Enum `app_role`

```typescript
type AppRole = 'admin' | 'user' | 'council_user' | 'guest';
```

### Matrice des Permissions

| Fonctionnalité | admin | user | council_user | guest |
|----------------|:-----:|:----:|:------------:|:-----:|
| Voir le radar | ✅ | ✅ | ✅ | ✅ |
| Voir les actualités | ✅ | ✅ | ✅ | ✅ |
| Voir les personnalités | ✅ | ✅ | ✅ | ❌ |
| Créer des flux | ✅ | ✅ | ✅ | ❌ |
| Modifier des dossiers | ✅ | ✅ | ❌ | ❌ |
| Utiliser l'assistant IA | ✅ | ✅ | ✅ | ❌ |
| Gérer les utilisateurs | ✅ | ❌ | ❌ | ❌ |
| Voir les logs CRON | ✅ | ❌ | ❌ | ❌ |
| Configurer les mots-clés | ✅ | ❌ | ❌ | ❌ |
| Importer des acteurs | ✅ | ❌ | ❌ | ❌ |

### Hiérarchie des Rôles

```
admin (1) > user (2) > council_user (3) > guest (4)
```

La fonction `get_user_role()` retourne le rôle le plus élevé si un utilisateur en possède plusieurs.

## Implémentation

### AuthContext

```typescript
// src/contexts/AuthContext.tsx

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

// Utilisation
const { user, isAdmin, signOut } = useAuth();
```

### ProtectedRoute

Protège une route pour les utilisateurs authentifiés.

```tsx
// src/components/auth/ProtectedRoute.tsx

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
}

// Utilisation dans App.tsx
<Route path="/radar" element={
  <ProtectedRoute>
    <RadarPage />
  </ProtectedRoute>
} />
```

### AdminRoute

Protège une route pour les administrateurs uniquement.

```tsx
// src/components/auth/AdminRoute.tsx

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  
  if (isLoading) return <LoadingScreen />;
  if (!isAdmin) return <Navigate to="/radar" replace />;
  
  return <>{children}</>;
}

// Utilisation
<Route path="/admin/*" element={
  <AdminRoute>
    <AdminPage />
  </AdminRoute>
} />
```

## Routes Protégées

### Routes Publiques

| Route | Description |
|-------|-------------|
| `/auth` | Page de connexion/inscription |
| `/auth/reset-password` | Réinitialisation mot de passe |

### Routes Authentifiées

| Route | Composant | Rôles |
|-------|-----------|-------|
| `/` | Index (redirect) | Tous |
| `/radar` | RadarPage | Tous |
| `/actualites` | ActualitesPage | Tous |
| `/personnalites` | PersonnalitesPage | user+ |
| `/flux` | FluxPage | user+ |
| `/flux/:id` | FluxDetailPage | user+ |
| `/dossiers` | DossiersPage | user+ |
| `/assistant` | AssistantPage | user+ |
| `/alertes` | AlertesHistoryPage | user+ |
| `/profile` | ProfilePage | Tous |

### Routes Admin

| Route | Composant | Description |
|-------|-----------|-------------|
| `/admin` | AdminPage | Dashboard admin |
| `/admin/users` | UsersPage | Gestion utilisateurs |
| `/admin/cron-jobs` | CronJobsPage | Tâches CRON |
| `/admin/mots-cles` | MotsClesPage | Mots-clés veille |
| `/admin/import-acteurs` | ImportActeursPage | Import acteurs |
| `/admin/audit-logs` | AuditLogsPage | Logs d'audit |

## Vérification Côté Serveur

### Edge Functions

```typescript
// Dans une Edge Function
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
}

// Vérifier le token
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error } = await supabase.auth.getUser(token);

if (error || !user) {
  return new Response(JSON.stringify({ error: "Token invalide" }), { status: 401 });
}

// Vérifier le rôle admin
const { data: isAdmin } = await supabase.rpc('has_role', {
  _user_id: user.id,
  _role: 'admin'
});

if (!isAdmin) {
  return new Response(JSON.stringify({ error: "Droits admin requis" }), { status: 403 });
}
```

### RLS Policies

```sql
-- Exemple : Seuls les admins peuvent modifier les mots-clés
CREATE POLICY "Admins can update keywords" ON mots_cles_veille
FOR UPDATE USING (
  has_role(auth.uid(), 'admin')
);

-- Exemple : Utilisateurs peuvent voir leurs propres flux
CREATE POLICY "Users can view own flux" ON flux_veille
FOR SELECT USING (
  auth.uid() = user_id
);
```

## Bonnes Pratiques

### Côté Client

1. **Toujours utiliser `useAuth()`** pour accéder à l'état d'authentification
2. **Protéger les routes sensibles** avec `ProtectedRoute` ou `AdminRoute`
3. **Gérer les états de chargement** pour éviter les flashes de contenu
4. **Vérifier `isAdmin`** avant d'afficher les contrôles admin

### Côté Serveur

1. **Toujours vérifier le token JWT** dans les Edge Functions
2. **Utiliser `has_role()`** pour les vérifications de rôle
3. **Activer RLS** sur toutes les tables
4. **Logger les actions admin** dans `admin_audit_logs`

---

Voir aussi : [Database](./DATABASE.md) | [Edge Functions](./EDGE-FUNCTIONS.md)
