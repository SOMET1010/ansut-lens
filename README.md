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

## Architecture Visuelle

### Diagramme système global

Le diagramme ci-dessous illustre les flux de données entre les composants principaux de la plateforme.

```mermaid
flowchart TB
    subgraph Frontend["Frontend React"]
        direction TB
        UI[Interface Utilisateur<br/>shadcn/ui + Tailwind]
        Pages[12 Pages<br/>Radar, Actualités, SPDI...]
        Hooks[13 Hooks Custom<br/>TanStack Query]
        Auth[AuthContext<br/>Gestion sessions]
    end

    subgraph EdgeFunctions["Edge Functions Deno"]
        direction TB
        EF1[collecte-veille<br/>Collecte actualités]
        EF2[assistant-ia<br/>Chatbot streaming]
        EF3[enrichir-actualite<br/>Tags et importance]
        EF4[generer-acteurs<br/>Génération IA]
        EF5[invite-user<br/>Invitations email]
        EF6[manage-user<br/>Activation comptes]
        EF7[update-user-role<br/>Gestion rôles]
    end

    subgraph Database["Base de Données PostgreSQL"]
        direction TB
        subgraph Core["Tables Principales"]
            T1[(personnalites)]
            T2[(actualites)]
            T3[(signaux)]
            T4[(alertes)]
            T5[(dossiers)]
        end
        subgraph SPDI["Tables SPDI"]
            T6[(presence_digitale_metrics)]
            T7[(presence_digitale_recommandations)]
        end
        subgraph Veille["Tables Veille"]
            T8[(mots_cles_veille)]
            T9[(categories_veille)]
            T10[(sources_media)]
        end
        subgraph AuthTables["Tables Auth"]
            T11[(profiles)]
            T12[(user_roles)]
            T13[(admin_audit_logs)]
        end
    end

    subgraph External["APIs Externes"]
        Perplexity[Perplexity API<br/>Recherche web]
        LovableAI[Lovable AI Gateway<br/>Gemini 2.5 Flash]
    end

    subgraph Security["Sécurité"]
        RLS[Row-Level Security<br/>17 tables protégées]
        Roles[4 Rôles<br/>admin, user, council_user, guest]
        Checks[12 Contraintes CHECK<br/>Validation données]
    end

    %% Connexions Frontend
    UI --> Pages
    Pages --> Hooks
    Hooks --> Auth
    Auth -->|JWT Token| Database

    %% Connexions Edge Functions
    EF1 -->|INSERT actualités| T2
    EF1 -->|Recherche| Perplexity
    EF1 -->|Appel| EF3
    EF2 -->|Streaming| LovableAI
    EF3 -->|UPDATE tags| T2
    EF3 -->|INSERT| T4
    EF4 -->|INSERT| T1
    EF4 -->|Génération| Perplexity
    EF5 -->|INSERT| T11
    EF5 -->|INSERT| T12
    EF6 -->|UPDATE| T11
    EF7 -->|UPDATE| T12

    %% Flux principaux
    Hooks -->|Invocation| EdgeFunctions
    EF5 -->|Audit| T13
    EF6 -->|Audit| T13
    EF7 -->|Audit| T13

    %% Sécurité
    Database --> RLS
    Database --> Checks
    RLS --> Roles

    %% Styles
    classDef frontend fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef edge fill:#8b5cf6,stroke:#5b21b6,color:#fff
    classDef db fill:#10b981,stroke:#047857,color:#fff
    classDef external fill:#f59e0b,stroke:#b45309,color:#fff
    classDef security fill:#ef4444,stroke:#b91c1c,color:#fff

    class UI,Pages,Hooks,Auth frontend
    class EF1,EF2,EF3,EF4,EF5,EF6,EF7 edge
    class T1,T2,T3,T4,T5,T6,T7,T8,T9,T10,T11,T12,T13 db
    class Perplexity,LovableAI external
    class RLS,Roles,Checks security
```

### Flux de données principaux

| Flux | Description |
|------|-------------|
| **Collecte automatisée** | `collecte-veille` interroge Perplexity, insère dans `actualites`, déclenche `enrichir-actualite` |
| **Assistant IA** | `assistant-ia` reçoit le contexte, appelle Lovable AI Gateway, stream la réponse SSE |
| **Gestion utilisateurs** | `invite-user`, `manage-user`, `update-user-role` modifient `profiles` et `user_roles` |
| **Alertes temps réel** | Insertion dans `alertes` avec broadcast Realtime vers le frontend |
| **Audit** | Toutes les actions admin sont loguées dans `admin_audit_logs` |

### Flux de collecte automatisée

Ce diagramme de séquence illustre le processus complet de collecte des actualités en 2 phases : la collecte via Perplexity API puis l'enrichissement NLP optionnel.

```mermaid
sequenceDiagram
    autonumber
    participant CRON as pg_cron + pg_net
    participant Frontend as React Frontend
    participant EF1 as collecte-veille
    participant DB as PostgreSQL
    participant Perplexity as Perplexity API
    participant EF2 as enrichir-actualite

    Note over CRON,EF2: Phase 0 - Déclenchement CRON automatique

    rect rgb(240, 240, 255)
        CRON->>CRON: Schedule atteint (6h critique / 24h quotidienne)
        CRON->>EF1: net.http_post(/collecte-veille, {type})
        Note right of CRON: Headers: Authorization Bearer ANON_KEY
    end

    Note over CRON,EF2: Phase 1 - Déclenchement manuel (alternatif)

    Frontend->>EF1: POST /collecte-veille {type, recency}
    activate EF1

    Note over CRON,EF2: Phase 2 - Récupération mots-clés

    EF1->>DB: SELECT mots_cles_veille WHERE actif = true
    Note right of EF1: Filtre: critique >= 70, quotidienne 50-69
    DB-->>EF1: Liste mots-clés (max 20, triés par score)

    Note over EF1: Construction prompt avec top 10 keywords

    Note over CRON,EF2: Phase 3 - Appel Perplexity API

    EF1->>Perplexity: POST /chat/completions model sonar-pro
    activate Perplexity
    Note right of Perplexity: search_recency_filter: week
    Note right of Perplexity: response_format: json_schema
    Perplexity-->>EF1: JSON {actualites[], citations[]}
    deactivate Perplexity

    Note over CRON,EF2: Phase 4 - Parsing multi-stratégies (4 fallbacks)

    rect rgb(255, 250, 230)
        EF1->>EF1: Stratégie 1: JSON.parse(content).actualites
        alt Succès
            Note right of EF1: Structured output valide
        else Échec
            EF1->>EF1: Stratégie 2: JSON.parse(content) si Array
            alt Succès
                Note right of EF1: Tableau direct
            else Échec
                EF1->>EF1: Stratégie 3: Regex extraction tableau
                alt Succès
                    Note right of EF1: Match /\[...\]/
                else Échec
                    EF1->>EF1: Stratégie 4: Regex extraction objet
                    Note right of EF1: Match /\{.*"actualites".*\}/
                end
            end
        end
        EF1->>EF1: Validation: filter(a => a.titre && typeof === 'string')
    end

    Note over CRON,EF2: Phase 5 - Gestion doublons et insertion

    loop Pour chaque actualité validée
        EF1->>DB: SELECT id FROM actualites WHERE titre = ?
        alt Doublon détecté
            DB-->>EF1: {id: existing_uuid}
            Note over EF1: Log: "Doublon ignoré: {titre}"
            Note over EF1: Skip iteration (continue)
        else Nouvelle actualité
            DB-->>EF1: null (maybeSingle)
            
            rect rgb(230, 255, 230)
                Note over EF1: Analyse mots-clés matchés
                EF1->>EF1: Calcul totalScore += score_criticite
                EF1->>EF1: Calcul quadrantScores[quadrant] += score
                EF1->>EF1: importance = min(100, totalScore * 0.3)
                EF1->>EF1: dominantQuadrant = max(quadrantScores)
            end
            
            EF1->>DB: INSERT actualites avec analyse_ia JSON
            Note right of DB: tags, importance, quadrant, collecte_type
            
            opt Si alerte_auto = true sur mot-clé matché
                EF1->>DB: INSERT alertes niveau warning
            end
        end
    end

    Note over CRON,EF2: Phase 6 - Logging et réponse

    EF1->>DB: INSERT collectes_log {type, statut, nb_resultats, duree_ms}
    EF1-->>Frontend: {success, nb_resultats, alertes, duree_ms, citations}
    deactivate EF1

    Note over CRON,EF2: Phase 7 - Enrichissement optionnel

    Frontend->>EF2: POST /enrichir-actualite {actualite_id}
    activate EF2
    EF2->>DB: SELECT mots_cles_veille + actualites
    DB-->>EF2: Données complètes
    Note over EF2: Analyse NLP normalisation et matching
    EF2->>DB: UPDATE actualites SET tags importance analyse_ia
    opt Si mots-clés critiques détectés
        EF2->>DB: INSERT alertes niveau critical
    end
    EF2-->>Frontend: {success, enrichment}
    deactivate EF2
```

#### Schedules CRON

| Type | Schedule CRON | Fréquence | Score min | Description |
|------|---------------|-----------|-----------|-------------|
| `critique` | `0 */6 * * *` | Toutes les 6h | 70 | Mots-clés haute priorité |
| `quotidienne` | `0 8 * * *` | 1x/jour à 8h | 50 | Mots-clés priorité moyenne |
| `hebdomadaire` | `0 6 * * 1` | Lundi 6h | 0 | Tous les mots-clés actifs |
| `manuelle` | N/A | Utilisateur | Variable | Déclenchement via UI |

#### Stratégies de parsing JSON

| Ordre | Stratégie | Pattern | Cas d'usage |
|-------|-----------|---------|-------------|
| 1 | JSON structuré | `{actualites: [...]}` | Réponse json_schema Perplexity |
| 2 | Tableau direct | `[...]` | Réponse simplifiée |
| 3 | Regex tableau | `/\[[\s\S]*?\]/` | Markdown avec JSON embedded |
| 4 | Regex objet | `/\{[\s\S]*"actualites"[\s\S]*\}/` | Texte avec JSON embedded |

#### Détection des doublons

| Critère | Méthode | Action si doublon |
|---------|---------|-------------------|
| Titre exact | `eq('titre', actu.titre)` | Skip + log console |
| Résultat | `maybeSingle()` | Retourne `null` ou `{id}` |
| Log | `console.log()` | "Doublon ignoré: {titre truncated}" |

#### Calcul d'importance

| Métrique | Formule | Plafond |
|----------|---------|---------|
| `totalScore` | Somme des `score_criticite` des mots-clés matchés | Aucun |
| `importance` | `Math.min(100, Math.round(totalScore * 0.3))` | 100 |
| `quadrantScores` | Accumulation par quadrant (tech, regulation, market, reputation) | Aucun |
| `dominantQuadrant` | `Object.entries(quadrantScores).sort((a,b) => b[1]-a[1])[0][0]` | N/A |

#### Récapitulatif des phases

| Phase | Composant | Action |
|-------|-----------|--------|
| 0 | pg_cron | Déclenchement automatique selon schedule (6h/24h) |
| 1 | Frontend | Déclenchement manuel via hook `useTriggerCollecte` |
| 2 | collecte-veille | Récupère 20 mots-clés actifs triés par criticité |
| 3 | Perplexity | Recherche web avec `sonar-pro` et filtre 7 jours |
| 4 | collecte-veille | Parse JSON avec 4 stratégies fallback |
| 5 | collecte-veille | Détection doublons par titre + calcul importance |
| 6 | collecte-veille | INSERT actualités + alertes + log |
| 7 | enrichir-actualite | Enrichissement NLP optionnel |

#### Configuration CRON (exemple SQL)

```sql
-- Collecte critique toutes les 6 heures
SELECT cron.schedule(
  'collecte-veille-critique',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/collecte-veille',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body := '{"type": "critique"}'::jsonb
  ) AS request_id;
  $$
);

-- Collecte quotidienne à 8h
SELECT cron.schedule(
  'collecte-veille-quotidienne',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/collecte-veille',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body := '{"type": "quotidienne"}'::jsonb
  ) AS request_id;
  $$
);
```

### Flux de l'assistant IA

Ce diagramme illustre le flux complet de l'assistant IA avec streaming SSE (Server-Sent Events), incluant la contextualisation dynamique des actualités et dossiers, ainsi que le parsing token-by-token côté client.

```mermaid
sequenceDiagram
    autonumber
    participant User as Utilisateur
    participant Frontend as React Frontend
    participant DB as PostgreSQL
    participant EF as assistant-ia
    participant AI as Lovable AI Gateway

    Note over User,AI: Phase 1 - Initialisation contexte

    User->>Frontend: Ouvre page Assistant
    activate Frontend
    
    Frontend->>DB: useActualites(maxAgeHours: 72)
    DB-->>Frontend: 10 actualités récentes
    
    Frontend->>DB: useDossiers() WHERE statut = publié
    DB-->>Frontend: 10 dossiers publiés
    
    Note over Frontend: Sélection auto: 5 actus + 3 dossiers
    Note over Frontend: Construction context string avec IDs

    Frontend-->>User: Interface prête avec contexte
    deactivate Frontend

    Note over User,AI: Phase 2 - Envoi message et streaming

    User->>Frontend: Saisit message + Envoyer
    activate Frontend
    
    Note over Frontend: Ajoute message utilisateur à messages[]
    Note over Frontend: Affiche loader streaming

    Frontend->>EF: POST /assistant-ia {messages, context}
    activate EF
    
    Note over EF: Enrichit SYSTEM_PROMPT avec context
    Note over EF: Format citations [[ACTU:id|titre]]
    
    EF->>AI: POST /v1/chat/completions {stream: true}
    activate AI
    Note right of AI: model: gemini-2.5-flash
    
    AI-->>EF: HTTP 200 + SSE Stream
    EF-->>Frontend: Content-Type: text/event-stream
    
    loop Streaming token par token
        AI-->>EF: data: {"choices":[{"delta":{"content":"token"}}]}
        EF-->>Frontend: SSE event forwarding
        
        Note over Frontend: Parse ligne: data: {...}
        Note over Frontend: JSON.parse + extract delta.content
        Note over Frontend: onDelta(token) -> setState
        
        Frontend-->>User: Affichage progressif réponse
    end
    
    AI-->>EF: data: [DONE]
    deactivate AI
    
    EF-->>Frontend: Stream terminé
    deactivate EF
    
    Note over Frontend: onDone() callback

    Note over User,AI: Phase 3 - Persistance conversation

    Frontend->>DB: INSERT/UPDATE conversations_ia
    DB-->>Frontend: Conversation sauvegardée
    
    Note over Frontend: setIsLoading(false)
    Frontend-->>User: Réponse complète affichée
    deactivate Frontend

    Note over User,AI: Gestion des erreurs

    rect rgb(254, 226, 226)
        Note over EF,AI: Erreurs possibles
        AI-->>EF: HTTP 429 Rate Limit
        EF-->>Frontend: {"error": "Limite atteinte"}
        Frontend-->>User: Toast erreur rouge
        
        AI-->>EF: HTTP 402 Crédits épuisés
        EF-->>Frontend: {"error": "Crédits épuisés"}
        Frontend-->>User: Toast recharge compte
    end
```

#### Récapitulatif des étapes

| Étape | Composant | Action |
|-------|-----------|--------|
| 1-4 | Frontend | Charge actualités et dossiers via hooks TanStack Query |
| 5 | Frontend | Sélection auto: 5 actualités + 3 dossiers |
| 6 | Frontend | Construction string context avec IDs pour citations |
| 7 | Frontend | POST vers edge function avec messages + context |
| 8 | assistant-ia | Enrichit SYSTEM_PROMPT avec contexte |
| 9 | assistant-ia | Appel Lovable AI Gateway stream: true |
| 10 | AI Gateway | Retourne flux SSE (Server-Sent Events) |
| 11 | assistant-ia | Forward stream SSE vers client |
| 12 | Frontend | Parse ligne par ligne: data: JSON |
| 13 | Frontend | onDelta(token) met à jour React state |
| 14 | Frontend | Affichage progressif token par token |
| 15 | Frontend | [DONE] déclenche onDone callback |
| 16 | Frontend | Sauvegarde conversation dans conversations_ia |

### Flux de gestion des utilisateurs (Admin)

Ce diagramme illustre les 4 flux de gestion administrative des utilisateurs : invitation, modification de rôle, désactivation/réactivation et suppression. Toutes les actions sont tracées dans la table `admin_audit_logs` pour garantir une traçabilité complète.

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Admin Frontend
    participant EF1 as invite-user
    participant EF2 as update-user-role
    participant EF3 as manage-user
    participant DB as PostgreSQL
    participant Auth as Supabase Auth Admin

    Note over Admin,Auth: Flux 1 - Invitation utilisateur

    Admin->>EF1: POST {email, fullName, role}
    activate EF1
    
    EF1->>DB: has_role(auth.uid(), admin)
    DB-->>EF1: true
    
    EF1->>Auth: inviteUserByEmail(email, redirectTo)
    activate Auth
    Auth-->>EF1: {user: {id, email}}
    deactivate Auth
    
    EF1->>DB: UPSERT user_roles {user_id, role}
    EF1->>DB: UPSERT profiles {id, full_name}
    EF1->>DB: INSERT admin_audit_logs action: user_invited
    
    EF1-->>Admin: {success, user}
    deactivate EF1
    
    Note right of Auth: Email envoyé avec lien reset password

    Note over Admin,Auth: Flux 2 - Modification rôle

    Admin->>EF2: POST {userId, newRole}
    activate EF2
    
    EF2->>DB: has_role(auth.uid(), admin)
    DB-->>EF2: true
    
    alt userId === currentUser.id
        EF2-->>Admin: {error: Auto-modification interdite}
    else Autre utilisateur
        EF2->>DB: SELECT role FROM user_roles WHERE user_id
        DB-->>EF2: old_role
        
        EF2->>DB: DELETE user_roles WHERE user_id
        EF2->>DB: INSERT user_roles {user_id, newRole}
        EF2->>DB: INSERT admin_audit_logs action: role_changed
        Note right of DB: details: {old_role, new_role, target_name}
        
        EF2-->>Admin: {success: true}
    end
    deactivate EF2

    Note over Admin,Auth: Flux 3 - Désactivation / Réactivation

    Admin->>EF3: POST {userId, action: disable|enable}
    activate EF3
    
    EF3->>DB: SELECT role FROM user_roles WHERE user_id = currentUser
    DB-->>EF3: admin
    
    alt action === disable
        EF3->>DB: UPDATE profiles SET disabled = true
        EF3->>Auth: updateUserById(ban_duration: 876000h)
        EF3->>DB: INSERT admin_audit_logs action: user_disabled
    else action === enable
        EF3->>DB: UPDATE profiles SET disabled = false
        EF3->>Auth: updateUserById(ban_duration: none)
        EF3->>DB: INSERT admin_audit_logs action: user_enabled
    end
    
    EF3-->>Admin: {success, message}
    deactivate EF3

    Note over Admin,Auth: Flux 4 - Suppression définitive

    Admin->>EF3: POST {userId, action: delete}
    activate EF3
    
    EF3->>DB: SELECT role FROM user_roles
    DB-->>EF3: admin
    
    EF3->>DB: INSERT admin_audit_logs action: user_deleted
    Note right of DB: Audit AVANT suppression
    
    EF3->>Auth: deleteUser(userId)
    activate Auth
    Note right of Auth: CASCADE: profiles + user_roles
    Auth-->>EF3: success
    deactivate Auth
    
    EF3-->>Admin: {success: Utilisateur supprimé}
    deactivate EF3

    Note over Admin,Auth: Sécurité et audit

    rect rgb(220, 252, 231)
        Note over EF1,DB: Toutes les actions sont tracées
        Note over EF1,DB: dans admin_audit_logs avec:
        Note over EF1,DB: admin_id, target_user_id, action, details
    end
```

#### Récapitulatif des flux

| Flux | Edge Function | Actions principales | Audit Log |
|------|---------------|---------------------|-----------|
| **Invitation** | `invite-user` | inviteUserByEmail + UPSERT profile/role | `user_invited` |
| **Modification rôle** | `update-user-role` | DELETE + INSERT user_roles | `role_changed` |
| **Désactivation** | `manage-user` | UPDATE disabled + ban auth | `user_disabled` |
| **Réactivation** | `manage-user` | UPDATE disabled + unban auth | `user_enabled` |
| **Suppression** | `manage-user` | deleteUser (CASCADE) | `user_deleted` |

#### Rôles disponibles

| Rôle | Label | Description |
|------|-------|-------------|
| `admin` | Administrateur | Accès complet, gestion utilisateurs |
| `user` | Utilisateur | Accès standard aux fonctionnalités |
| `council_user` | Membre du conseil | Accès aux rapports stratégiques |
| `guest` | Invité | Accès lecture seule limité |

#### Mesures de sécurité

- **Vérification admin** : Fonction RPC `has_role()` avec `SECURITY DEFINER`
- **Protection auto-modification** : Un admin ne peut pas modifier son propre rôle/compte
- **Audit préventif** : Logging AVANT les actions destructives (suppression)
- **Bannissement auth** : `ban_duration: 876000h` empêche la reconnexion après désactivation

### Flux SPDI - Score de Présence Digitale Institutionnelle

Le **SPDI** (Score de Présence Digitale Institutionnelle) est un scoring composite à 4 axes permettant de mesurer et suivre la présence digitale des personnalités stratégiques. Le système collecte automatiquement les mentions, calcule les métriques quotidiennement et génère des recommandations personnalisées via l'IA.

```mermaid
sequenceDiagram
    autonumber
    participant Sources as Sources Externes
    participant EF as collecte-veille
    participant DB as PostgreSQL
    participant Calc as Moteur Calcul SPDI
    participant AI as Lovable AI
    participant Frontend as React Frontend

    Note over Sources,Frontend: Phase 1 - Collecte des mentions

    EF->>Sources: Scan sources (Perplexity, RSS, LinkedIn)
    activate EF
    Sources-->>EF: Actualités et mentions brutes
    
    EF->>DB: INSERT actualites
    EF->>DB: INSERT mentions {contenu, source, sentiment}
    
    loop Pour chaque personnalité mentionnée
        EF->>DB: SELECT personnalites WHERE nom ILIKE mention
        DB-->>EF: personnalite_id
        EF->>DB: INSERT personnalites_mentions {personnalite_id, mention_id}
    end
    deactivate EF

    Note over Sources,Frontend: Phase 2 - Calcul métriques SPDI (quotidien)

    rect rgb(239, 246, 255)
        Note over Calc: Déclenchement: CRON quotidien 02:00 UTC
    end

    activate Calc
    Calc->>DB: SELECT personnalites WHERE suivi_spdi_actif = true
    DB-->>Calc: Liste acteurs suivis

    loop Pour chaque personnalité
        Calc->>DB: SELECT mentions JOIN personnalites_mentions (30 derniers jours)
        DB-->>Calc: mentions[]
        
        Note over Calc: === AXE VISIBILITÉ (30%) ===
        Note over Calc: nb_mentions, nb_sources_distinctes
        Note over Calc: regularite = écart-type dates
        
        Calc->>DB: SELECT actualites WHERE tags CONTAINS nom (30j)
        DB-->>Calc: actualites[]
        
        Note over Calc: === AXE QUALITÉ (25%) ===
        Note over Calc: sentiment_moyen = AVG(sentiment)
        Note over Calc: pct_themes_strategiques
        Note over Calc: nb_controverses = COUNT(sentiment < -0.3)
        
        Note over Calc: === AXE AUTORITÉ (25%) ===
        Note over Calc: nb_citations_directes
        Note over Calc: nb_invitations_panels
        Note over Calc: nb_references_croisees
        
        Note over Calc: === AXE PRÉSENCE (20%) ===
        Note over Calc: activite_linkedin (API)
        Note over Calc: engagement_linkedin
        Note over Calc: coherence_message
        
        Note over Calc: === SCORE FINAL ===
        Note over Calc: SPDI = 0.30×Visibilité + 0.25×Qualité
        Note over Calc: + 0.25×Autorité + 0.20×Présence
        
        Calc->>DB: INSERT presence_digitale_metrics
        Note right of DB: Tous les axes + score_spdi + interpretation
        
        Calc->>DB: UPDATE personnalites SET score_spdi_actuel, tendance_spdi
    end
    deactivate Calc

    Note over Sources,Frontend: Phase 3 - Génération recommandations IA

    activate AI
    AI->>DB: SELECT presence_digitale_metrics (dernière)
    DB-->>AI: métriques actuelles
    
    AI->>DB: SELECT presence_digitale_metrics (historique 30j)
    DB-->>AI: évolution scores
    
    Note over AI: Analyse des axes faibles
    Note over AI: Détection opportunités (axes en hausse)
    Note over AI: Identification alertes (controverses, baisse)
    
    alt Score visibilité < 40
        AI->>DB: INSERT presence_digitale_recommandations
        Note right of DB: type: canal, priorité: haute
        Note right of DB: "Augmenter présence LinkedIn"
    end
    
    alt Controverses détectées
        AI->>DB: INSERT presence_digitale_recommandations
        Note right of DB: type: alerte, priorité: haute
        Note right of DB: "Risque réputationnel détecté"
    end
    
    alt Opportunité thématique
        AI->>DB: INSERT presence_digitale_recommandations
        Note right of DB: type: opportunité, priorité: normale
        Note right of DB: "Capitaliser sur thème tendance"
    end
    deactivate AI

    Note over Sources,Frontend: Phase 4 - Affichage Frontend

    Frontend->>DB: useDerniereMetriqueSPDI(personnaliteId)
    activate Frontend
    DB-->>Frontend: MetriqueSPDI {axes, score_final, interpretation}
    
    Frontend->>DB: useEvolutionSPDI(personnaliteId, periode)
    DB-->>Frontend: EvolutionSPDI {historique[], variation, tendance}
    
    Frontend->>DB: useRecommandationsSPDI(personnaliteId)
    DB-->>Frontend: RecommandationSPDI[] actives
    
    Frontend->>DB: useComparaisonPairs(personnaliteId, cercle)
    DB-->>Frontend: {monScore, moyenne, rang, total}
    
    Note over Frontend: Rendu composants:
    Note over Frontend: SPDIGaugeCard (jauge semi-circulaire)
    Note over Frontend: SPDIAxesRadar (radar 4 axes)
    Note over Frontend: SPDIEvolutionChart (courbe historique)
    Note over Frontend: SPDIRecommandations (cards IA)
    Note over Frontend: SPDIComparaisonPairs (benchmark)
    
    Frontend-->>Frontend: Affichage fiche personnalité enrichie
    deactivate Frontend
```

#### Les 4 axes du SPDI

| Axe | Poids | Métriques clés | Description |
|-----|-------|----------------|-------------|
| **Visibilité** | 30% | `nb_mentions`, `nb_sources_distinctes`, `regularite_mentions` | Volume et fréquence des mentions dans les médias |
| **Qualité** | 25% | `sentiment_moyen`, `pct_themes_strategiques`, `nb_controverses` | Tonalité et pertinence du contenu |
| **Autorité** | 25% | `nb_citations_directes`, `nb_invitations_panels`, `nb_references_croisees` | Reconnaissance et influence institutionnelle |
| **Présence** | 20% | `activite_linkedin`, `engagement_linkedin`, `coherence_message` | Activité propre sur les réseaux sociaux |

#### Interprétation des scores

| Score | Interprétation | Badge | Action recommandée |
|-------|----------------|-------|-------------------|
| 80-100 | Présence forte | 🟢 Vert | Maintenir la dynamique |
| 60-79 | Présence solide | 🔵 Bleu | Optimiser les axes faibles |
| 40-59 | Visibilité faible | 🟠 Orange | Plan d'action prioritaire |
| < 40 | Risque invisibilité | 🔴 Rouge | Intervention urgente requise |

#### Types de recommandations IA

| Type | Icône | Couleur | Exemple |
|------|-------|---------|---------|
| `opportunite` | 💡 Lightbulb | Vert | "Thème X en tendance, opportunité de prise de parole" |
| `alerte` | ⚠️ AlertTriangle | Rouge | "Controverse détectée, risque réputationnel" |
| `canal` | 🔗 Share2 | Bleu | "Augmenter fréquence posts LinkedIn" |
| `thematique` | 🏷️ Tag | Violet | "Renforcer positionnement sur thème Y" |

#### Hooks React associés

| Hook | Description | Données retournées |
|------|-------------|-------------------|
| `useDerniereMetriqueSPDI` | Dernière mesure SPDI | `MetriqueSPDI` avec axes détaillés |
| `useMetriquesSPDI` | Historique sur période | `MetriqueSPDI[]` (7j/30j/90j) |
| `useEvolutionSPDI` | Évolution et tendance | `EvolutionSPDI` avec variation % |
| `useRecommandationsSPDI` | Recommandations actives | `RecommandationSPDI[]` |
| `useComparaisonPairs` | Benchmark cercle | Score, moyenne, rang, total |
| `useToggleSuiviSPDI` | Activer/désactiver suivi | Mutation toggle |
| `useMarquerRecommandationVue` | Marquer comme lue | Mutation update |

#### Composants SPDI

| Composant | Description |
|-----------|-------------|
| `SPDIGaugeCard` | Jauge semi-circulaire avec score, tendance et interprétation |
| `SPDIAxesRadar` | Graphique radar des 4 axes avec légende |
| `SPDIEvolutionChart` | Courbe d'évolution historique avec sélection de période |
| `SPDIRecommandations` | Liste des recommandations IA avec actions |
| `SPDIComparaisonPairs` | Benchmark vs pairs du même cercle stratégique |
| `SPDIAlerteBanner` | Bannière d'alerte pour variations critiques (≤ -15%) |

### Flux de stockage des fichiers (Storage)

Le système utilise Supabase Storage pour le stockage des fichiers utilisateurs. Actuellement implémenté pour les avatars, l'architecture est extensible pour les documents des dossiers analytiques.

```mermaid
sequenceDiagram
    autonumber
    participant User as Utilisateur
    participant UI as AvatarUpload
    participant Hook as useUserProfile
    participant Storage as Supabase Storage
    participant DB as PostgreSQL
    participant CDN as CDN Public

    Note over User,CDN: Phase 1 - Validation côté client

    User->>UI: Sélection fichier (input[type=file])
    activate UI
    
    UI->>UI: Validation type MIME
    Note right of UI: JPEG, PNG, WebP uniquement
    
    alt Type non autorisé
        UI-->>User: Toast "Format non supporté"
    else Type valide
        UI->>UI: Validation taille fichier
        Note right of UI: Maximum 2 Mo
        
        alt Fichier trop volumineux
            UI-->>User: Toast "Fichier trop volumineux"
        else Taille valide
            UI->>Hook: onUpload(file)
        end
    end
    deactivate UI

    Note over User,CDN: Phase 2 - Upload vers Storage

    activate Hook
    Hook->>Hook: Génération chemin fichier
    Note right of Hook: {user_id}/avatar.{ext}
    
    Hook->>Storage: upload(bucket: 'avatars', path, file, {upsert: true})
    activate Storage
    
    alt Erreur upload
        Storage-->>Hook: UploadError
        Hook-->>User: Toast "Impossible d'uploader l'image"
    else Upload réussi
        Storage-->>Hook: {path, id}
        Note right of Storage: Fichier stocké dans bucket public
    end
    deactivate Storage

    Note over User,CDN: Phase 3 - Récupération URL publique

    Hook->>Storage: getPublicUrl(filePath)
    activate Storage
    Storage-->>Hook: {publicUrl}
    deactivate Storage
    
    Hook->>Hook: Ajout cache buster
    Note right of Hook: publicUrl + ?t={timestamp}

    Note over User,CDN: Phase 4 - Mise à jour profil

    Hook->>DB: UPDATE profiles SET avatar_url = urlWithCacheBuster
    activate DB
    DB-->>Hook: success
    deactivate DB
    
    Hook->>Hook: invalidateQueries(['profile', userId])
    Note right of Hook: TanStack Query cache refresh
    
    Hook-->>User: Toast "Profil mis à jour"
    deactivate Hook

    Note over User,CDN: Phase 5 - Affichage avatar

    User->>UI: Visite page profil
    activate UI
    UI->>Hook: useUserProfile()
    Hook->>DB: SELECT * FROM profiles WHERE id = userId
    DB-->>Hook: profile {avatar_url, ...}
    Hook-->>UI: profile
    
    UI->>CDN: GET avatar_url
    activate CDN
    Note right of CDN: Cache CDN avec cache buster
    CDN-->>UI: Image binaire
    deactivate CDN
    
    UI-->>User: Avatar affiché (AvatarImage)
    deactivate UI
```

#### Buckets configurés

| Bucket | Public | Usage | Chemin fichiers |
|--------|--------|-------|-----------------|
| `avatars` | ✅ Oui | Photos de profil utilisateurs | `{user_id}/avatar.{ext}` |

#### Validations côté client

| Validation | Valeur | Composant | Message erreur |
|------------|--------|-----------|----------------|
| Types MIME autorisés | `image/jpeg`, `image/png`, `image/webp` | `AvatarUpload` | "Format non supporté" |
| Taille maximum | 2 Mo (2 × 1024 × 1024 bytes) | `AvatarUpload` | "Fichier trop volumineux" |
| Authentification | Utilisateur connecté requis | `useUserProfile` | "Non authentifié" |

#### Méthodes Supabase Storage

| Méthode | Description | Paramètres |
|---------|-------------|------------|
| `upload()` | Upload fichier vers bucket | `bucket`, `path`, `file`, `{upsert}` |
| `getPublicUrl()` | Récupère URL publique CDN | `filePath` |
| `remove()` | Supprime fichier(s) | `paths[]` |
| `list()` | Liste fichiers d'un dossier | `path`, `options` |

#### Composants impliqués

| Composant/Hook | Rôle | Fichier |
|----------------|------|---------|
| `AvatarUpload` | UI upload avec validation et preview | `src/components/profile/AvatarUpload.tsx` |
| `useUserProfile` | Hook avec méthode `uploadAvatar` | `src/hooks/useUserProfile.ts` |
| `ProfilePage` | Page conteneur intégrant l'upload | `src/pages/ProfilePage.tsx` |

#### Cache busting

L'ajout du paramètre `?t={timestamp}` à l'URL publique force le rafraîchissement du cache navigateur et CDN après mise à jour de l'avatar, garantissant l'affichage immédiat de la nouvelle image.

```typescript
const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;
```

### Flux d'authentification et gestion des sessions

Le système d'authentification repose sur Supabase Auth avec gestion des rôles (4 niveaux), protection des routes et persistence des sessions via localStorage.

```mermaid
sequenceDiagram
    autonumber
    participant User as Utilisateur
    participant UI as AuthPage
    participant Ctx as AuthContext
    participant Auth as Supabase Auth
    participant DB as PostgreSQL
    participant Router as React Router

    Note over User,Router: Phase 1 - Initialisation session (App mount)

    Ctx->>Auth: getSession()
    activate Ctx
    Auth-->>Ctx: session | null
    
    Ctx->>Ctx: onAuthStateChange(callback)
    Note right of Ctx: Listener actif pour toute la durée de l'app
    
    alt Session existante
        Ctx->>Ctx: setUser(session.user)
        Ctx->>Ctx: setSession(session)
        Ctx->>Ctx: setTimeout(fetchUserRole, 0)
        Note right of Ctx: Defer pour éviter deadlock
        Ctx->>DB: SELECT role FROM user_roles WHERE user_id
        DB-->>Ctx: app_role (admin|user|council_user|guest)
        Ctx->>Ctx: setRole(role)
    else Pas de session
        Ctx->>Ctx: setUser(null), setRole(null)
    end
    Ctx->>Ctx: setIsLoading(false)
    deactivate Ctx

    Note over User,Router: Phase 2 - Protection des routes

    User->>Router: Navigation vers /radar
    activate Router
    Router->>Ctx: ProtectedRoute: useAuth()
    
    alt isLoading = true
        Router-->>User: LoadingScreen
    else !user (non authentifié)
        Router->>Router: Navigate to="/auth" state={from: location}
        Router-->>User: Redirection vers /auth
    else user authentifié
        Router-->>User: Affichage page demandée
    end
    deactivate Router

    User->>Router: Navigation vers /admin/*
    activate Router
    Router->>Ctx: AdminRoute: useAuth()
    
    alt !user
        Router-->>User: Redirection vers /auth
    else !isAdmin (role != 'admin')
        Router->>User: Toast "Accès réservé aux administrateurs"
        Router-->>User: Redirection vers /radar
    else isAdmin
        Router-->>User: Affichage page admin
    end
    deactivate Router

    Note over User,Router: Phase 3 - Connexion utilisateur

    User->>UI: Accès /auth
    activate UI
    
    UI->>Ctx: useAuth() - vérification user
    alt user déjà connecté
        UI->>Router: navigate(from || '/radar')
        Router-->>User: Redirection automatique
    end
    
    User->>UI: Saisie email + password
    UI->>UI: Validation Zod (loginSchema)
    
    alt Validation échouée
        UI-->>User: Affichage erreurs champs
    else Validation réussie
        UI->>Ctx: signIn(email, password)
        Ctx->>Auth: signInWithPassword({email, password})
        
        alt Erreur authentification
            Auth-->>Ctx: AuthError
            Ctx-->>UI: {error}
            UI-->>User: Toast "Erreur de connexion"
        else Succès
            Auth-->>Ctx: {session, user}
            Note over Auth,Ctx: onAuthStateChange déclenché automatiquement
            Ctx->>Ctx: setSession(session), setUser(user)
            Ctx->>DB: fetchUserRole(user.id)
            DB-->>Ctx: role
            Ctx->>Ctx: setRole(role)
            UI-->>User: Toast "Connexion réussie"
            UI->>Router: navigate(from || '/radar')
        end
    end
    deactivate UI

    Note over User,Router: Phase 4 - Réinitialisation mot de passe

    User->>UI: Clic "Mot de passe oublié"
    activate UI
    UI->>UI: setMode('forgot-password')
    
    User->>UI: Saisie email
    UI->>UI: Validation Zod (resetSchema)
    
    UI->>Auth: resetPasswordForEmail(email, {redirectTo})
    Note right of Auth: redirectTo = origin + /auth/reset-password
    
    alt Erreur envoi
        Auth-->>UI: error
        UI-->>User: Toast "Erreur lors de l'envoi"
    else Succès
        Auth-->>UI: success
        Auth->>User: Email avec lien magic link
        UI-->>User: Toast "Email envoyé"
        UI->>UI: setMode('login')
    end
    deactivate UI

    User->>UI: Clic lien email -> /auth/reset-password#access_token=...
    activate UI
    
    UI->>Auth: getSession()
    alt Pas de session ni token
        UI-->>User: Toast "Lien invalide ou expiré"
        UI->>Router: navigate('/auth')
    else Token valide
        User->>UI: Saisie nouveau password + confirmation
        UI->>UI: Validation Zod (refine: passwords match)
        
        UI->>Auth: updateUser({password})
        alt Erreur
            Auth-->>UI: error
            UI-->>User: Toast "Erreur réinitialisation"
        else Succès
            Auth-->>UI: success
            UI-->>User: Vue succès + bouton "Accéder"
            User->>UI: Clic "Accéder à l'application"
            UI->>Router: navigate('/radar')
        end
    end
    deactivate UI

    Note over User,Router: Phase 5 - Déconnexion

    User->>UI: Clic bouton déconnexion
    UI->>Ctx: signOut()
    activate Ctx
    Ctx->>Auth: signOut()
    Auth-->>Ctx: success
    Ctx->>Ctx: setUser(null), setSession(null), setRole(null)
    Note over Auth,Ctx: onAuthStateChange déclenché avec session=null
    deactivate Ctx
    Router->>Router: ProtectedRoute détecte !user
    Router-->>User: Redirection vers /auth
```

#### Rôles utilisateurs

| Rôle | Niveau | Accès | Description |
|------|--------|-------|-------------|
| `admin` | 1 | Toutes pages + /admin/* | Administrateur système |
| `user` | 2 | Toutes pages sauf /admin/* | Utilisateur standard |
| `council_user` | 3 | Pages conseil restreintes | Membre du conseil |
| `guest` | 4 | Lecture seule | Invité sans édition |

#### Routes protégées

| Route | Guard | Redirection si non autorisé | Condition |
|-------|-------|----------------------------|-----------|
| `/radar`, `/actualites`, etc. | `ProtectedRoute` | `/auth` | `!user` |
| `/admin/*` | `AdminRoute` | `/radar` | `!isAdmin` |
| `/auth` | Aucun | `/radar` (si connecté) | `user` |

#### Validations Zod

| Schema | Champs | Règles |
|--------|--------|--------|
| `loginSchema` | email | `trim`, `min(1)`, `email()`, `max(255)` |
| `loginSchema` | password | `min(1)`, `min(6)` |
| `resetSchema` | email | `trim`, `min(1)`, `email()`, `max(255)` |
| `resetPasswordSchema` | password | `min(6)`, `max(72)` |
| `resetPasswordSchema` | confirmPassword | `refine(match password)` |

#### Composants d'authentification

| Composant/Hook | Rôle | Fichier |
|----------------|------|---------|
| `AuthContext` | Provider global session + rôle | `src/contexts/AuthContext.tsx` |
| `useAuth` | Hook d'accès au contexte | `src/contexts/AuthContext.tsx` |
| `AuthPage` | Page login + forgot password | `src/pages/AuthPage.tsx` |
| `ResetPasswordPage` | Page nouveau mot de passe | `src/pages/ResetPasswordPage.tsx` |
| `ProtectedRoute` | Guard routes authentifiées | `src/components/auth/ProtectedRoute.tsx` |
| `AdminRoute` | Guard routes admin | `src/components/auth/AdminRoute.tsx` |
| `LoadingScreen` | Écran chargement vérification | `src/components/auth/LoadingScreen.tsx` |

#### Prévention deadlock

L'utilisation de `setTimeout(fetchUserRole, 0)` dans `onAuthStateChange` évite les appels Supabase imbriqués qui causent des deadlocks :

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
  
  // Defer Supabase calls with setTimeout
  if (session?.user) {
    setTimeout(() => {
      fetchUserRole(session.user.id).then(setRole);
    }, 0);
  }
});
```

#### Sauvegarde URL origine

Le mécanisme `state={{ from: location }}` préserve l'URL d'origine pour rediriger l'utilisateur vers sa page initiale après connexion :

```typescript
// Dans ProtectedRoute
<Navigate to="/auth" state={{ from: location }} replace />

// Dans AuthPage après connexion réussie
const from = location.state?.from?.pathname || '/radar';
navigate(from, { replace: true });
```

### Schéma de la base de données

Le diagramme ER ci-dessous visualise les 17 tables et leurs relations.

```mermaid
erDiagram
    %% ==========================================
    %% TABLES AUTHENTIFICATION
    %% ==========================================
    
    profiles {
        uuid id PK
        text full_name
        text avatar_url
        text department
        boolean disabled
        timestamp created_at
    }
    
    user_roles {
        uuid id PK
        uuid user_id FK
        app_role role
        timestamp created_at
    }
    
    %% ==========================================
    %% TABLES PRINCIPALES
    %% ==========================================
    
    personnalites {
        uuid id PK
        text nom
        text prenom
        text fonction
        text organisation
        text categorie
        integer cercle
        integer score_influence
        numeric score_spdi_actuel
        text niveau_alerte
        boolean suivi_spdi_actif
        jsonb reseaux
        jsonb alertes_config
    }
    
    actualites {
        uuid id PK
        uuid source_id FK
        text titre
        text contenu
        text resume
        text categorie
        integer importance
        numeric sentiment
        text analyse_ia
        timestamp date_publication
    }
    
    signaux {
        uuid id PK
        uuid source_id FK
        text titre
        text description
        text quadrant
        text niveau
        text tendance
        integer score_impact
        boolean actif
    }
    
    alertes {
        uuid id PK
        uuid user_id FK
        uuid reference_id
        text reference_type
        text titre
        text message
        text niveau
        text type
        boolean lue
        boolean traitee
    }
    
    dossiers {
        uuid id PK
        uuid auteur_id FK
        text titre
        text contenu
        text resume
        text categorie
        text statut
    }
    
    mentions {
        uuid id PK
        text contenu
        text source
        text source_url
        text auteur
        numeric sentiment
        integer score_influence
        boolean est_critique
    }
    
    %% ==========================================
    %% TABLES SPDI
    %% ==========================================
    
    presence_digitale_metrics {
        uuid id PK
        uuid personnalite_id FK
        date date_mesure
        numeric score_spdi
        numeric score_visibilite
        numeric score_qualite
        numeric score_autorite
        numeric score_presence
        integer nb_mentions
        text interpretation
    }
    
    presence_digitale_recommandations {
        uuid id PK
        uuid personnalite_id FK
        text titre
        text message
        text type
        text priorite
        text canal
        boolean vue
        boolean actif
    }
    
    personnalites_mentions {
        uuid id PK
        uuid personnalite_id FK
        uuid mention_id FK
        timestamp created_at
    }
    
    %% ==========================================
    %% TABLES VEILLE
    %% ==========================================
    
    sources_media {
        uuid id PK
        text nom
        text type
        text url
        text frequence_scan
        boolean actif
        timestamp derniere_collecte
    }
    
    categories_veille {
        uuid id PK
        text code
        text nom
        text description
        text couleur
        integer priorite
        boolean actif
    }
    
    mots_cles_veille {
        uuid id PK
        uuid categorie_id FK
        text mot_cle
        text quadrant
        integer score_criticite
        boolean alerte_auto
        boolean actif
    }
    
    collectes_log {
        uuid id PK
        text type
        text statut
        integer nb_resultats
        integer duree_ms
        text erreur
    }
    
    %% ==========================================
    %% TABLES AUDIT
    %% ==========================================
    
    admin_audit_logs {
        uuid id PK
        uuid admin_id FK
        uuid target_user_id FK
        text action
        jsonb details
        text ip_address
    }
    
    audit_consultations {
        uuid id PK
        uuid user_id FK
        uuid resource_id
        text resource_type
        text action
        jsonb metadata
    }
    
    conversations_ia {
        uuid id PK
        uuid user_id FK
        text titre
        jsonb messages
        timestamp updated_at
    }
    
    config_seuils {
        uuid id PK
        uuid updated_by FK
        text cle
        jsonb valeur
        text description
    }
    
    %% ==========================================
    %% RELATIONS
    %% ==========================================
    
    profiles ||--o{ user_roles : "has roles"
    profiles ||--o{ admin_audit_logs : "performs"
    profiles ||--o{ alertes : "receives"
    profiles ||--o{ audit_consultations : "generates"
    profiles ||--o{ conversations_ia : "owns"
    profiles ||--o{ dossiers : "creates"
    profiles ||--o{ config_seuils : "updates"
    profiles ||--o{ admin_audit_logs : "target of"
    
    personnalites ||--o{ presence_digitale_metrics : "has metrics"
    personnalites ||--o{ presence_digitale_recommandations : "receives"
    personnalites ||--o{ personnalites_mentions : "linked to"
    mentions ||--o{ personnalites_mentions : "concerns"
    
    sources_media ||--o{ actualites : "publishes"
    sources_media ||--o{ signaux : "generates"
    
    categories_veille ||--o{ mots_cles_veille : "contains"
```

### Légende des groupes de tables

| Groupe | Tables | Description |
|--------|--------|-------------|
| **Auth** | `profiles`, `user_roles` | Gestion des utilisateurs et rôles |
| **Principales** | `personnalites`, `actualites`, `signaux`, `alertes`, `dossiers`, `mentions` | Données métier core |
| **SPDI** | `presence_digitale_metrics`, `presence_digitale_recommandations`, `personnalites_mentions` | Score de Présence Digitale |
| **Veille** | `sources_media`, `categories_veille`, `mots_cles_veille`, `collectes_log` | Configuration collecte |
| **Audit** | `admin_audit_logs`, `audit_consultations`, `conversations_ia`, `config_seuils` | Traçabilité et config |

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
