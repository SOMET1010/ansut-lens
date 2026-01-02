# ANSUT RADAR

**Plateforme de veille stratégique** pour l'Agence Nationale du Service Universel des Télécommunications (ANSUT) de Côte d'Ivoire.

## Périmètre fonctionnel

- 📡 **Radar stratégique** — Signaux classés par quadrant (tech, régulation, marché, réputation)
- 👥 **Suivi des acteurs télécoms** — Personnalités avec Score de Présence Digitale Institutionnelle (SPDI)
- 📰 **Collecte automatisée d'actualités** — Via Perplexity API avec enrichissement IA
- 🔔 **Système d'alertes en temps réel** — Notifications push et historique
- 🤖 **Assistant IA contextuel** — Chatbot stratégique avec streaming
- 📋 **Dossiers analytiques** — Rédaction collaborative en Markdown
- 📊 **Tableaux de bord SPDI** — Métriques, évolution, recommandations

---

## Stack Technique

| Catégorie | Technologies |
|-----------|-------------|
| Frontend | React 18.3, Vite, TypeScript |
| UI | shadcn/ui (Radix UI), Tailwind CSS, Lucide Icons |
| Charts | Recharts |
| Backend | Lovable Cloud (Supabase) |
| Edge Functions | Deno |
| APIs externes | Perplexity API, Lovable AI Gateway (Gemini 2.5 Flash) |
| État | TanStack Query v5, React Context |
| Auth | Supabase Auth + Row-Level Security (RLS) |

---

## Installation Locale

```bash
# Cloner le dépôt
git clone <REPO_URL>
cd ansut-radar

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

### Variables d'environnement

Le fichier `.env` est auto-généré par Lovable Cloud :

```env
VITE_SUPABASE_URL=https://lpkfwxisranmetbtgxrv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx...
VITE_SUPABASE_PROJECT_ID=lpkfwxisranmetbtgxrv
```

### Secrets Edge Functions

Configurés dans Lovable Cloud (Settings > Secrets) :

| Secret | Description |
|--------|-------------|
| `PERPLEXITY_API_KEY` | API Perplexity pour collecte veille |
| `LOVABLE_API_KEY` | Gateway IA (auto-provisionné) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin (auto-provisionné) |

---

## Architecture Dossier

```
src/
├── pages/                        # 12 pages principales
│   ├── Index.tsx                 # Redirection vers /radar
│   ├── RadarPage.tsx             # Dashboard radar stratégique
│   ├── ActualitesPage.tsx        # Fil d'actualités
│   ├── PersonnalitesPage.tsx     # Acteurs + SPDI
│   ├── DossiersPage.tsx          # Dossiers analytiques
│   ├── AssistantPage.tsx         # Chatbot IA
│   ├── AlertesHistoryPage.tsx    # Historique alertes
│   ├── ProfilePage.tsx           # Profil utilisateur
│   ├── AuthPage.tsx              # Authentification
│   ├── ResetPasswordPage.tsx     # Reset mot de passe
│   └── admin/                    # Pages administration
│       ├── UsersPage.tsx         # Gestion utilisateurs
│       ├── MotsClesPage.tsx      # Mots-clés veille
│       ├── ImportActeursPage.tsx # Import acteurs
│       └── AuditLogsPage.tsx     # Logs d'audit
│
├── components/
│   ├── ui/                       # 50+ composants shadcn/ui
│   ├── auth/                     # ProtectedRoute, AdminRoute, LoadingScreen
│   ├── layout/                   # AppLayout, AppSidebar, AppHeader
│   ├── personnalites/            # ActeurCard, ActeurDetail, ActeurFilters
│   ├── actualites/               # FreshnessIndicator
│   ├── spdi/                     # SPDIGaugeCard, SPDIEvolutionChart, etc.
│   ├── assistant/                # ContextSelector, ConversationHistory
│   ├── dossiers/                 # DossierFormDialog, MarkdownEditor
│   ├── notifications/            # AlertNotificationProvider, NotificationCenter
│   └── profile/                  # AvatarUpload, ProfileForm
│
├── hooks/                        # 13 hooks custom
│   ├── usePersonnalites.ts       # CRUD personnalités
│   ├── useActualites.ts          # Liste actualités
│   ├── useAlertesHistory.ts      # Historique alertes
│   ├── useConversationsIA.ts     # Conversations assistant
│   ├── useDossiers.ts            # CRUD dossiers
│   ├── useMotsClesVeille.ts      # Mots-clés admin
│   ├── usePresenceDigitale.ts    # Métriques SPDI
│   ├── useRadarData.ts           # Données radar
│   ├── useRealtimeAlerts.ts      # Alertes temps réel
│   ├── useUserProfile.ts         # Profil utilisateur
│   └── useDeduplicationActeurs.ts# Déduplication import
│
├── contexts/
│   ├── AuthContext.tsx           # Authentification + rôles
│   └── ViewModeContext.tsx       # Mode vue (grid/list)
│
├── types/
│   ├── index.ts                  # Types principaux (Signal, Actualite, etc.)
│   └── json-schemas.ts           # Schémas Zod pour colonnes JSONB
│
└── integrations/supabase/        # Auto-généré (NE PAS MODIFIER)
    ├── client.ts                 # Client Supabase
    └── types.ts                  # Types base de données

supabase/
├── functions/                    # 7 Edge Functions
│   ├── assistant-ia/             # Chatbot IA (streaming SSE)
│   ├── collecte-veille/          # Collecte actualités Perplexity
│   ├── enrichir-actualite/       # Enrichissement tags/importance
│   ├── generer-acteurs/          # Génération acteurs par catégorie
│   ├── invite-user/              # Invitation utilisateur email
│   ├── manage-user/              # Activation/désactivation comptes
│   └── update-user-role/         # Changement rôles
├── migrations/                   # Migrations SQL versionnées
└── config.toml                   # Configuration Supabase
```

---

## Authentification et Rôles

### 4 rôles disponibles

L'enum `app_role` définit les rôles utilisateurs :

| Rôle | Description | Accès |
|------|-------------|-------|
| `admin` | Administrateur | Tout + gestion utilisateurs + audit |
| `user` | Utilisateur standard | Lecture + écriture limitée |
| `council_user` | Membre conseil | Lecture avancée |
| `guest` | Invité | Lecture seule |

### Implémentation sécurisée

```sql
-- Table séparée pour éviter l'escalade de privilèges
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);

-- Fonction SECURITY DEFINER pour vérification sans récursion RLS
CREATE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### Routes et protection

```typescript
// Routes publiques
/auth                    // Login / Signup
/auth/reset-password     // Réinitialisation mot de passe

// Routes authentifiées (ProtectedRoute)
/radar                   // Dashboard principal
/actualites              // Fil d'actualités
/personnalites           // Acteurs et SPDI
/dossiers                // Dossiers analytiques
/assistant               // Chatbot IA
/alertes                 // Historique alertes
/profile                 // Profil utilisateur

// Routes admin (AdminRoute - requiert role='admin')
/admin                   // Dashboard admin
/admin/users             // Gestion utilisateurs
/admin/mots-cles         // Configuration mots-clés veille
/admin/import-acteurs    // Import batch acteurs
/admin/audit-logs        // Logs d'audit
```

---

## Schéma des Données

### 17 tables avec RLS activé

#### Tables principales

| Table | Description | Colonnes clés |
|-------|-------------|---------------|
| `personnalites` | Acteurs stratégiques | `cercle` (1-4), `score_spdi`, `categorie`, `niveau_alerte` |
| `actualites` | Articles collectés | `importance` (0-100), `sentiment`, `tags[]`, `analyse_ia` |
| `signaux` | Signaux radar | `quadrant`, `niveau`, `score_impact`, `tendance` |
| `alertes` | Alertes système | `niveau`, `type`, `reference_id`, `lue`, `traitee` |
| `dossiers` | Dossiers analytiques | `statut`, `categorie`, `auteur_id`, `contenu` (Markdown) |
| `mentions` | Mentions détectées | `sentiment`, `est_critique`, `score_influence` |
| `personnalites_mentions` | Liaison N:N | `personnalite_id`, `mention_id` |

#### Tables SPDI

| Table | Description |
|-------|-------------|
| `presence_digitale_metrics` | Métriques journalières (visibilité, qualité, autorité, présence) |
| `presence_digitale_recommandations` | Recommandations IA avec priorité et canal |

#### Tables système

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs (full_name, avatar_url, department) |
| `user_roles` | Rôles séparés (sécurité anti-escalade) |
| `admin_audit_logs` | Actions administrateur |
| `audit_consultations` | Consultations ressources |
| `collectes_log` | Logs de collecte veille |
| `mots_cles_veille` | Mots-clés de veille avec variantes |
| `categories_veille` | Catégories de veille |
| `sources_media` | Sources médiatiques |
| `config_seuils` | Configuration seuils (JSONB) |

### 12 contraintes CHECK actives

```sql
-- Personnalités
personnalites_cercle_check           -- cercle BETWEEN 1 AND 4
personnalites_niveau_alerte_check    -- IN ('normal', 'eleve', 'critique')
personnalites_tendance_spdi_check    -- IN ('up', 'down', 'stable')
personnalites_categorie_check        -- 9 valeurs enum
personnalites_score_influence_check  -- BETWEEN 0 AND 100

-- Signaux
signaux_niveau_check                 -- IN ('info', 'warning', 'critical')
signaux_quadrant_check               -- IN ('tech', 'regulation', 'market', 'reputation')

-- Alertes
alertes_niveau_check                 -- IN ('info', 'warning', 'critical')

-- Dossiers
dossiers_statut_check                -- IN ('brouillon', 'publie', 'archive')
dossiers_categorie_check             -- IN ('general', 'technique', 'strategique', 'operationnel')

-- Actualités
actualites_importance_check          -- BETWEEN 0 AND 100

-- Recommandations
recommandations_priorite_check       -- IN ('haute', 'normale', 'basse')
```

---

## Workflows Automatisés (Edge Functions)

### Vue d'ensemble

| Fonction | Déclencheur | Description |
|----------|-------------|-------------|
| `collecte-veille` | Manuel / CRON | Collecte actualités via Perplexity API |
| `enrichir-actualite` | Post-insertion | Analyse mots-clés, calcul importance |
| `assistant-ia` | Chat utilisateur | Chatbot streaming SSE via Lovable AI |
| `generer-acteurs` | Manuel admin | Génération acteurs par catégorie |
| `invite-user` | Admin | Invitation utilisateur par email |
| `manage-user` | Admin | Activation/désactivation comptes |
| `update-user-role` | Admin | Modification rôle utilisateur |

### Flux collecte-veille détaillé

```
┌─────────────────────────────────────────────────────────────┐
│  1. Récupération mots-clés actifs (mots_cles_veille)        │
│     └─> Filtre: actif = true                                │
├─────────────────────────────────────────────────────────────┤
│  2. Construction requête Perplexity                         │
│     └─> Mots-clés + variantes + date                        │
├─────────────────────────────────────────────────────────────┤
│  3. Appel Perplexity API (sonar model)                      │
│     └─> Recherche web avec citations                        │
├─────────────────────────────────────────────────────────────┤
│  4. Parsing JSON des résultats                              │
│     └─> Extraction titre, contenu, source_url               │
├─────────────────────────────────────────────────────────────┤
│  5. Insertion actualités en BDD                             │
│     └─> Table: actualites                                   │
├─────────────────────────────────────────────────────────────┤
│  6. Enrichissement IA (enrichir-actualite)                  │
│     └─> Tags, importance, sentiment, analyse_ia             │
├─────────────────────────────────────────────────────────────┤
│  7. Création alertes si mots-clés critiques                 │
│     └─> Table: alertes (si alerte_auto = true)              │
├─────────────────────────────────────────────────────────────┤
│  8. Log dans collectes_log                                  │
│     └─> Statut, durée, nb_resultats                         │
└─────────────────────────────────────────────────────────────┘
```

### Flux assistant-ia

```
Client (React)
    │
    ▼
POST /functions/v1/assistant-ia
    │ body: { messages: [...], context?: string }
    ▼
Edge Function
    │
    ├─> Injection system prompt contextuel
    │   └─> Rôle: analyste veille stratégique ANSUT
    │
    ├─> Appel Lovable AI Gateway
    │   └─> Model: google/gemini-2.5-flash
    │   └─> stream: true
    │
    ▼
SSE Stream → Client
    │
    └─> Rendu token par token (streaming)
```

---

## Logs et Audit

### 3 tables d'audit

| Table | Contenu | Écrivain |
|-------|---------|----------|
| `admin_audit_logs` | Actions admin (CRUD users, rôles, config) | Edge functions admin |
| `audit_consultations` | Consultations ressources (qui a vu quoi) | Application frontend |
| `collectes_log` | Résultats collecte veille | Edge function collecte |

### Structure commune

```sql
-- Colonnes présentes dans toutes les tables d'audit
id              UUID PRIMARY KEY
created_at      TIMESTAMP WITH TIME ZONE
user_id         UUID (nullable)
action          TEXT
metadata        JSONB (détails spécifiques)
ip_address      TEXT (nullable)
```

### Exemples d'actions loguées

```json
// admin_audit_logs
{
  "action": "user_role_updated",
  "admin_id": "uuid-admin",
  "target_user_id": "uuid-user",
  "details": { "old_role": "user", "new_role": "admin" }
}

// collectes_log
{
  "type": "veille_actualites",
  "statut": "success",
  "nb_resultats": 12,
  "duree_ms": 3450,
  "mots_cles_utilises": ["ANSUT", "5G", "régulation"]
}
```

---

## Déploiement

### Frontend

1. Ouvrir le projet dans Lovable
2. Cliquer **Share** > **Publish** > **Update**
3. (Optionnel) **Settings** > **Domains** pour domaine custom

> ⚠️ Les Edge Functions sont déployées automatiquement à chaque commit.

### Configuration production

1. **Auth** : Activer "Leaked Password Protection" dans Settings > Auth
2. **Secrets** : Vérifier `PERPLEXITY_API_KEY` configuré
3. **CRON** : Configurer job collecte-veille si désiré (via pg_cron)

---

## Checklist Pré-production

### Sécurité ✓

- [ ] Protection mots de passe compromis activée (Settings > Auth)
- [ ] RLS vérifiée sur toutes les tables (17/17)
- [ ] Contraintes CHECK actives (12/12)
- [ ] Secrets configurés : `PERPLEXITY_API_KEY`, `LOVABLE_API_KEY`
- [ ] Aucune clé API exposée côté client

### Configuration ✓

- [ ] Au moins 1 compte admin créé
- [ ] Mots-clés de veille configurés (mots_cles_veille)
- [ ] Catégories de veille définies (categories_veille)
- [ ] Sources médias renseignées (sources_media)

### Tests ✓

- [ ] Test collecte-veille exécuté avec succès
- [ ] Test assistant-ia fonctionnel
- [ ] Alertes temps réel vérifiées
- [ ] Import acteurs testé

### Monitoring ✓

- [ ] Logs Edge Functions accessibles (Lovable Cloud > Functions)
- [ ] Audit logs fonctionnels (admin_audit_logs)
- [ ] Métriques SPDI calculées (presence_digitale_metrics)

---

## Commandes utiles

```bash
# Développement
npm run dev              # Serveur local (port 8080)
npm run build            # Build production
npm run preview          # Preview build local

# Lint
npm run lint             # ESLint check
```

---

## Support

- **Documentation Lovable** : https://docs.lovable.dev
- **Supabase Docs** : https://supabase.com/docs
- **shadcn/ui** : https://ui.shadcn.com

---

*Dernière mise à jour : Janvier 2026*
