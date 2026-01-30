export const TECH_DOC_CONTENT = `
# Documentation Technique ANSUT RADAR

*Version 2.1.0 • Janvier 2026*

---

## Table des matières

1. Présentation Générale
2. Architecture Technique
3. Base de Données
4. Edge Functions
5. Système de Permissions
6. Sécurité & Conformité

---

# 1. Présentation Générale

## 1.1 Contexte

**ANSUT RADAR** est une plateforme de veille stratégique développée pour l'Autorité Nationale de Surveillance des Télécommunications (ANSUT). Elle permet de collecter, analyser et diffuser l'information stratégique dans le secteur des télécommunications en Côte d'Ivoire.

## 1.2 Objectifs

La plateforme répond à 5 objectifs majeurs :

| # | Objectif | Description |
|---|----------|-------------|
| 1 | **Veille automatisée** | Collecte continue des actualités sectorielles via IA |
| 2 | **Analyse intelligente** | Enrichissement automatique par modèles de langage |
| 3 | **Suivi des acteurs** | Monitoring des personnalités clés du secteur |
| 4 | **Alertes temps réel** | Notification instantanée des événements critiques |
| 5 | **Diffusion structurée** | Newsletters et dossiers stratégiques |

## 1.3 Les 7 Modules Métier

| Module | Route | Description |
|--------|-------|-------------|
| **Tableau de bord** | \`/radar\` | Vue d'ensemble avec KPIs et signaux faibles |
| **Actualités** | \`/actualites\` | Fil d'actualités enrichi par IA avec clustering |
| **Flux personnalisés** | \`/flux\` | Canaux de veille configurables par utilisateur |
| **Personnalités** | \`/personnalites\` | Annuaire des acteurs avec score d'influence |
| **Dossiers** | \`/dossiers\` | Notes stratégiques et briefings |
| **Assistant IA** | \`/assistant\` | Interface conversationnelle intelligente |
| **Alertes** | \`/alertes\` | Historique et gestion des notifications |

## 1.4 Profils Utilisateurs

Le système gère 4 rôles distincts :

| Rôle | Code | Accès |
|------|------|-------|
| **Administrateur** | \`admin\` | Accès complet + gestion système |
| **Utilisateur** | \`user\` | Accès standard aux modules métier |
| **Membre du Conseil** | \`council_user\` | Accès lecture aux rapports et briefings |
| **Invité** | \`guest\` | Accès restreint au tableau de bord |

---

# 2. Architecture Technique

## 2.1 Stack Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.x | Typage statique |
| Tailwind CSS | 3.x | Styles utilitaires |
| shadcn/ui | latest | Composants UI |
| TanStack Query | 5.x | Gestion du cache et requêtes |
| React Router | 6.x | Navigation SPA |
| Recharts | 2.x | Visualisation de données |

## 2.2 Stack Backend (Lovable Cloud)

| Composant | Technologie | Description |
|-----------|-------------|-------------|
| **Base de données** | PostgreSQL 15 | 17 tables avec RLS |
| **Authentification** | Auth JWT | Tokens sécurisés |
| **Fonctions** | Edge Functions | 17 fonctions serverless (Deno) |
| **Stockage** | Storage | Avatars et fichiers |
| **Temps réel** | Realtime | Subscriptions WebSocket |

## 2.3 Intégrations Externes

| Service | Usage | Secret requis |
|---------|-------|---------------|
| **Perplexity AI** | Collecte d'actualités | \`PERPLEXITY_API_KEY\` |
| **Grok (xAI)** | Enrichissement IA | \`XAI_API_KEY\` |
| **Resend** | Envoi d'emails/newsletters | \`RESEND_API_KEY\` |

## 2.4 Diagramme d'Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Pages   │ │Components│ │  Hooks   │ │ TanStack Query   │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘   │
│       │            │            │                │              │
│       └────────────┴────────────┴────────────────┘              │
│                            │                                     │
│                     Supabase Client                              │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┼────────────────────────────────────┐
│                    LOVABLE CLOUD                                │
│  ┌─────────────────────────┴─────────────────────────────────┐  │
│  │                     API Gateway                            │  │
│  └───────────┬──────────────────┬──────────────────┬─────────┘  │
│              │                  │                  │             │
│  ┌───────────┴───────┐  ┌──────┴──────┐  ┌────────┴────────┐   │
│  │   PostgreSQL DB   │  │ Edge Funcs  │  │   Storage       │   │
│  │   (17 tables)     │  │ (17 funcs)  │  │   (avatars)     │   │
│  └───────────────────┘  └──────┬──────┘  └─────────────────┘   │
│                                │                                 │
│                    ┌───────────┴───────────┐                    │
│                    │  APIs Externes        │                    │
│                    │  Perplexity • Grok    │                    │
│                    │  Resend               │                    │
│                    └───────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

---

# 3. Base de Données

## 3.1 Tables Principales (17)

| Table | Description | RLS |
|-------|-------------|-----|
| \`actualites\` | Articles collectés et enrichis | ✓ |
| \`alertes\` | Notifications utilisateurs | ✓ |
| \`admin_audit_logs\` | Journalisation admin | ✓ |
| \`audit_consultations\` | Traçabilité des accès | ✓ |
| \`categories_veille\` | Catégories thématiques | ✓ |
| \`collectes_log\` | Historique des collectes | ✓ |
| \`config_seuils\` | Paramètres système | ✓ |
| \`conversations_ia\` | Historique assistant IA | ✓ |
| \`dossiers\` | Notes et briefings | ✓ |
| \`flux_veille\` | Flux personnalisés | ✓ |
| \`flux_actualites\` | Liens flux/actualités | ✓ |
| \`mentions\` | Citations médiatiques | ✓ |
| \`mots_cles_veille\` | Dictionnaire sémantique | ✓ |
| \`newsletters\` | Newsletters générées | ✓ |
| \`newsletter_destinataires\` | Liste de diffusion | ✓ |
| \`newsletter_programmation\` | Planification envois | ✓ |
| \`permissions_registry\` | Catalogue des permissions | ✓ |
| \`personnalites\` | Acteurs suivis | ✓ |
| \`personnalites_mentions\` | Liens personnalités/mentions | ✓ |
| \`presence_digitale_metrics\` | Scores SPDI | ✓ |
| \`presence_digitale_recommandations\` | Recommandations IA | ✓ |
| \`profiles\` | Profils utilisateurs | ✓ |
| \`role_permissions\` | Matrice rôle/permission | ✓ |
| \`signaux\` | Signaux faibles détectés | ✓ |
| \`sources_media\` | Sources de veille | ✓ |
| \`user_roles\` | Affectation des rôles | ✓ |

## 3.2 Enum app_role

\`\`\`sql
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'user', 
  'council_user',
  'guest'
);
\`\`\`

## 3.3 Fonctions Utilitaires

| Fonction | Paramètres | Retour |
|----------|------------|--------|
| \`get_user_role(_user_id)\` | UUID | app_role |
| \`has_role(_role, _user_id)\` | app_role, UUID | boolean |
| \`has_permission(_permission, _user_id)\` | text, UUID | boolean |
| \`get_cron_jobs()\` | - | Table des jobs CRON |
| \`toggle_cron_job(job_id)\` | integer | void |

---

# 4. Edge Functions

## 4.1 Liste des 17 Fonctions

| Fonction | Méthode | Description |
|----------|---------|-------------|
| \`assistant-ia\` | POST | Interface conversationnelle IA |
| \`collecte-veille\` | POST | Collecte automatique via Perplexity |
| \`enrichir-actualite\` | POST | Analyse IA d'un article |
| \`envoyer-newsletter\` | POST | Envoi via Resend |
| \`generate-password-link\` | POST | Lien de réinitialisation |
| \`generer-acteurs\` | POST | Génération d'acteurs via IA |
| \`generer-briefing\` | POST | Génération de briefing quotidien |
| \`generer-newsletter\` | POST | Génération contenu newsletter |
| \`generer-requete-flux\` | POST | Génération requête de veille |
| \`invite-user\` | POST | Invitation utilisateur |
| \`list-users-status\` | GET | Liste statuts utilisateurs |
| \`manage-cron-jobs\` | POST | Gestion tâches planifiées |
| \`manage-user\` | POST | CRUD utilisateurs |
| \`reset-user-password\` | POST | Réinitialisation mot de passe |
| \`scheduler-newsletter\` | POST | Planification newsletters |
| \`send-flux-digest\` | POST | Envoi digest flux |
| \`update-user-role\` | POST | Modification rôle utilisateur |

## 4.2 Planification CRON

| Job | Schedule | Fonction |
|-----|----------|----------|
| Collecte quotidienne | \`0 6 * * *\` | \`collecte-veille\` |
| Briefing matinal | \`0 7 * * 1-5\` | \`generer-briefing\` |
| Newsletter mensuelle | \`0 9 1 * *\` | \`scheduler-newsletter\` |

## 4.3 Secrets Requis

| Secret | Service | Obligatoire |
|--------|---------|-------------|
| \`PERPLEXITY_API_KEY\` | Perplexity AI | ✓ |
| \`XAI_API_KEY\` | Grok (xAI) | ✓ |
| \`RESEND_API_KEY\` | Resend | ✓ |

---

# 5. Système de Permissions

## 5.1 Les 17 Permissions Granulaires

| Code | Catégorie | Description |
|------|-----------|-------------|
| \`access_admin\` | Admin | Accès interface administration |
| \`manage_users\` | Admin | Gestion des utilisateurs |
| \`manage_roles\` | Admin | Gestion des rôles |
| \`view_audit_logs\` | Admin | Consultation logs d'audit |
| \`manage_keywords\` | Admin | Gestion mots-clés veille |
| \`manage_sources\` | Admin | Gestion sources média |
| \`manage_cron_jobs\` | Admin | Gestion tâches CRON |
| \`import_actors\` | Admin | Import acteurs IA |
| \`manage_newsletters\` | Admin | Gestion newsletters |
| \`view_radar\` | Consultation | Accès tableau de bord |
| \`view_actualites\` | Consultation | Accès fil d'actualités |
| \`view_personnalites\` | Consultation | Accès annuaire acteurs |
| \`view_dossiers\` | Consultation | Accès dossiers stratégiques |
| \`create_flux\` | Création | Création flux personnalisés |
| \`use_assistant\` | Création | Utilisation assistant IA |
| \`receive_alerts\` | Notifications | Réception des alertes |
| \`export_data\` | Données | Export des données |

## 5.2 Matrice Rôle/Permission par Défaut

| Permission | Admin | User | Council | Guest |
|------------|:-----:|:----:|:-------:|:-----:|
| access_admin | ✓ | - | - | - |
| manage_users | ✓ | - | - | - |
| manage_roles | ✓ | - | - | - |
| view_audit_logs | ✓ | - | - | - |
| manage_keywords | ✓ | - | - | - |
| manage_sources | ✓ | - | - | - |
| manage_cron_jobs | ✓ | - | - | - |
| import_actors | ✓ | - | - | - |
| manage_newsletters | ✓ | - | - | - |
| view_radar | ✓ | ✓ | ✓ | ✓ |
| view_actualites | ✓ | ✓ | ✓ | - |
| view_personnalites | ✓ | ✓ | ✓ | - |
| view_dossiers | ✓ | ✓ | ✓ | - |
| create_flux | ✓ | ✓ | - | - |
| use_assistant | ✓ | ✓ | - | - |
| receive_alerts | ✓ | ✓ | ✓ | - |
| export_data | ✓ | ✓ | - | - |

## 5.3 Architecture RBAC

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                      UTILISATEUR                                 │
│                          │                                       │
│                    ┌─────┴─────┐                                │
│                    │ user_roles │◄─── 1 rôle par user           │
│                    └─────┬─────┘                                │
│                          │                                       │
│                    ┌─────┴─────┐                                │
│                    │   ROLE    │◄─── admin|user|council|guest   │
│                    └─────┬─────┘                                │
│                          │                                       │
│              ┌───────────┴───────────┐                          │
│              │   role_permissions    │◄─── N permissions/rôle   │
│              └───────────┬───────────┘                          │
│                          │                                       │
│              ┌───────────┴───────────┐                          │
│              │ permissions_registry  │◄─── Catalogue 17 perms   │
│              └───────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

---

# 6. Sécurité & Conformité

## 6.1 Authentification

| Aspect | Implémentation |
|--------|----------------|
| **Méthode** | Email + Mot de passe |
| **Tokens** | JWT via Supabase Auth |
| **Session** | Persistante avec refresh |
| **Récupération** | Lien magique par email |

## 6.2 Row Level Security (RLS)

Toutes les tables sont protégées par RLS avec les patterns suivants :

| Pattern | Usage |
|---------|-------|
| \`auth.uid() = user_id\` | Données personnelles |
| \`has_role(auth.uid(), 'admin')\` | Administration |
| \`true\` (SELECT only) | Données publiques |
| \`has_permission(...)\` | Accès granulaire |

## 6.3 Audit et Traçabilité

| Table | Événements tracés |
|-------|-------------------|
| \`admin_audit_logs\` | Actions administratives |
| \`audit_consultations\` | Consultations de ressources |
| \`collectes_log\` | Exécution des collectes |

## 6.4 Protection des Routes

\`\`\`typescript
// Composants de protection
<ProtectedRoute>      // Authentification requise
  <PermissionRoute permission="view_radar">
    <RadarPage />     // Permission spécifique
  </PermissionRoute>
</ProtectedRoute>
\`\`\`

## 6.5 Bonnes Pratiques Implémentées

- ✓ Validation côté serveur (Edge Functions)
- ✓ Sanitization des entrées utilisateur
- ✓ Rate limiting sur les endpoints sensibles
- ✓ Logs d'audit exhaustifs
- ✓ Tokens d'accès à durée limitée
- ✓ Séparation des rôles (RBAC)
- ✓ Principe du moindre privilège

---

*Document généré automatiquement par ANSUT RADAR v2.1.0*

© 2026 ANSUT - Autorité Nationale de Surveillance des Télécommunications

**Document confidentiel • Usage interne uniquement**
`;
