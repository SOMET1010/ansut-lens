# Base de Données

## Vue d'ensemble

La base de données PostgreSQL contient **30+ tables** avec Row Level Security (RLS) activé sur toutes les tables.

## Tables par Domaine

### Utilisateurs & Auth (4 tables)

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs (id FK auth.users, full_name, avatar_url, department, disabled) |
| `user_roles` | Rôles utilisateurs (enum app_role) |
| `role_permissions` | Permissions par rôle (granulaires, activables/désactivables) |
| `permissions_registry` | Registre des permissions disponibles (code, label_fr, category) |

### Veille & Actualités (6 tables)

| Table | Description |
|-------|-------------|
| `actualites` | Articles et news collectés (titre, contenu, analyse_ia, sentiment, importance) |
| `sources_media` | Sources de veille (nom, type, url, platform_config) |
| `mots_cles_veille` | Mots-clés de veille (variantes, quadrant, score_criticite) |
| `categories_veille` | Catégories thématiques (code, couleur, priorite) |
| `collectes_log` | Logs de collecte (statut, nb_resultats, duree_ms) |
| `config_seuils` | Configuration seuils (clé-valeur JSON) |

### Flux Personnalisés (2 tables)

| Table | Description |
|-------|-------------|
| `flux_veille` | Flux de veille personnalisés par utilisateur |
| `flux_actualites` | Liaison flux-actualités (score_match, notifie) |

### Acteurs & SPDI (5 tables)

| Table | Description |
|-------|-------------|
| `personnalites` | Acteurs stratégiques (nom, fonction, cercle, score_spdi, suivi_spdi_actif) |
| `personnalites_mentions` | Liaison personnalités-mentions |
| `mentions` | Mentions médiatiques (sentiment, score_influence, est_critique) |
| `presence_digitale_metrics` | Métriques SPDI historiques (4 axes, nb_mentions, sentiment_moyen) |
| `presence_digitale_recommandations` | Recommandations IA (titre, type, priorite, canal) |

### Social & Insights (3 tables)

| Table | Description |
|-------|-------------|
| `social_insights` | Données réseaux sociaux (plateforme, engagement, hashtags, entites) |
| `social_api_config` | Configuration APIs sociales (plateforme, quota, enabled) |
| `signaux` | Signaux stratégiques (quadrant, niveau, tendance, score_impact) |

### Newsletters & Diffusion (5 tables)

| Table | Description |
|-------|-------------|
| `newsletters` | Newsletters générées (contenu JSON, html_complet, statut, ton) |
| `newsletter_destinataires` | Destinataires newsletter (email, type, frequence) |
| `newsletter_programmation` | Programmation envois automatiques (frequence, heure, cible) |
| `diffusion_programmation` | Programmation diffusion multi-canal (email, SMS) |
| `diffusion_logs` | Logs d'envoi (canal, destinataires_count, succes_count) |

### SMS (2 tables)

| Table | Description |
|-------|-------------|
| `sms_destinataires` | Destinataires SMS (numero, nom, role_filtre) |
| `sms_logs` | Logs SMS (destinataire, statut, erreur) |

### Documents & IA (2 tables)

| Table | Description |
|-------|-------------|
| `dossiers` | Dossiers stratégiques (titre, contenu Markdown, categorie, statut) |
| `conversations_ia` | Historique assistant IA (messages JSON) |

### Alertes & Notifications (1 table)

| Table | Description |
|-------|-------------|
| `alertes` | Notifications système (niveau, type, lue, traitee) |

### Audit (2 tables)

| Table | Description |
|-------|-------------|
| `admin_audit_logs` | Actions administrateur (action, target_user_id, details JSON) |
| `audit_consultations` | Consultations utilisateurs (resource_type, metadata) |

## Enum `app_role`

```sql
CREATE TYPE app_role AS ENUM ('admin', 'user', 'council_user', 'guest');
```

| Rôle | Description | Permissions |
|------|-------------|-------------|
| admin | Administrateur | Accès complet, gestion utilisateurs |
| user | Utilisateur standard | Lecture/écriture données métier |
| council_user | Membre du conseil | Lecture avancée, rapports |
| guest | Invité | Lecture seule limitée |

## Fonctions Utilitaires

### `has_role(user_id, role)`
Vérifie si un utilisateur possède un rôle.

### `get_user_role(user_id)`
Retourne le rôle principal d'un utilisateur.

### `has_permission(user_id, permission)`
Vérifie si un utilisateur possède une permission spécifique via son rôle.

### `get_cron_jobs()` / `get_cron_history()`
Fonctions de gestion des tâches CRON planifiées.

### `toggle_cron_job()` / `update_cron_schedule()`
Activation/désactivation et modification des planifications CRON.

## Row Level Security (RLS)

### Pattern Standard

```sql
-- Lecture : utilisateur authentifié
CREATE POLICY "select_policy" ON table_name
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Écriture : propriétaire uniquement
CREATE POLICY "insert_policy" ON table_name
FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Tables Publiques (Lecture authentifiée)

- `personnalites` - Tous les utilisateurs authentifiés
- `actualites` - Actualités visibles par tous
- `categories_veille` - Référentiel public
- `signaux` - Signaux du radar publics
- `social_insights` - Données sociales publiques

## Migrations

Les migrations sont gérées automatiquement par Lovable Cloud. Pour ajouter une migration :

1. Utiliser l'outil de migration Lovable
2. Écrire le SQL avec RLS policies
3. Attendre l'approbation utilisateur
4. Les types TypeScript sont régénérés automatiquement

---

Voir aussi : [Architecture](./ARCHITECTURE.md) | [Authentication](./AUTHENTICATION.md)
