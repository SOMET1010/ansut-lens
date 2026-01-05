# Base de Données

## Vue d'ensemble

La base de données PostgreSQL contient **17 tables** avec Row Level Security (RLS) activé sur toutes les tables.

## Schéma Entité-Relation

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    profiles     │     │   user_roles    │     │    alertes      │
│─────────────────│     │─────────────────│     │─────────────────│
│ id (PK, FK)     │◄────│ user_id (FK)    │     │ id (PK)         │
│ full_name       │     │ role            │     │ user_id (FK)    │
│ avatar_url      │     │ created_at      │     │ titre           │
│ department      │     └─────────────────┘     │ message         │
│ disabled        │                              │ niveau          │
│ created_at      │                              │ type            │
│ updated_at      │                              │ lue             │
└─────────────────┘                              │ traitee         │
        │                                        └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   dossiers      │     │conversations_ia │     │   flux_veille   │
│─────────────────│     │─────────────────│     │─────────────────│
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ auteur_id (FK)  │     │ user_id (FK)    │     │ user_id (FK)    │
│ titre           │     │ titre           │     │ nom             │
│ contenu         │     │ messages (JSON) │     │ mots_cles[]     │
│ categorie       │     │ created_at      │     │ categories_ids[]│
│ statut          │     │ updated_at      │     │ quadrants[]     │
│ resume          │     └─────────────────┘     │ importance_min  │
└─────────────────┘                              │ alerte_email    │
                                                 │ alerte_push     │
                                                 └────────┬────────┘
                                                          │
┌─────────────────┐     ┌─────────────────┐              │
│  personnalites  │     │flux_actualites  │◄─────────────┘
│─────────────────│     │─────────────────│
│ id (PK)         │     │ id (PK)         │     ┌─────────────────┐
│ nom             │     │ flux_id (FK)    │────►│   actualites    │
│ prenom          │     │ actualite_id(FK)│     │─────────────────│
│ fonction        │     │ score_match     │     │ id (PK)         │
│ organisation    │     │ notifie         │     │ titre           │
│ cercle          │     └─────────────────┘     │ contenu         │
│ score_spdi      │                              │ source_id (FK)  │
│ reseaux (JSON)  │                              │ categorie       │
│ alertes_config  │     ┌─────────────────┐     │ importance      │
│ suivi_spdi_actif│     │  sources_media  │◄────│ sentiment       │
└────────┬────────┘     │─────────────────│     │ tags[]          │
         │              │ id (PK)         │     │ analyse_ia      │
         │              │ nom             │     └─────────────────┘
         │              │ type            │
         │              │ url             │
         │              │ actif           │
         │              └─────────────────┘
         │
         ▼
┌─────────────────────────────────┐     ┌─────────────────┐
│ presence_digitale_metrics       │     │    mentions     │
│─────────────────────────────────│     │─────────────────│
│ id (PK)                         │     │ id (PK)         │
│ personnalite_id (FK)            │     │ contenu         │
│ date_mesure                     │     │ source          │
│ score_spdi                      │     │ auteur          │
│ score_visibilite                │     │ sentiment       │
│ score_autorite                  │     │ score_influence │
│ score_presence                  │     │ est_critique    │
│ score_qualite                   │     └─────────────────┘
│ nb_mentions                     │              │
│ sentiment_moyen                 │              ▼
└─────────────────────────────────┘     ┌─────────────────────────┐
                                        │personnalites_mentions   │
┌─────────────────┐                     │─────────────────────────│
│    signaux      │                     │ personnalite_id (FK)    │
│─────────────────│                     │ mention_id (FK)         │
│ id (PK)         │                     └─────────────────────────┘
│ titre           │
│ quadrant        │     ┌─────────────────┐     ┌─────────────────┐
│ niveau          │     │mots_cles_veille │     │categories_veille│
│ tendance        │     │─────────────────│     │─────────────────│
│ score_impact    │     │ id (PK)         │     │ id (PK)         │
│ actif           │     │ mot_cle         │────►│ code            │
└─────────────────┘     │ categorie_id(FK)│     │ nom             │
                        │ variantes[]     │     │ couleur         │
                        │ quadrant        │     │ priorite        │
                        │ alerte_auto     │     └─────────────────┘
                        └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  collectes_log  │     │admin_audit_logs │     │audit_consultations│
│─────────────────│     │─────────────────│     │─────────────────│
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ type            │     │ admin_id (FK)   │     │ user_id (FK)    │
│ statut          │     │ action          │     │ action          │
│ nb_resultats    │     │ target_user_id  │     │ resource_type   │
│ duree_ms        │     │ details (JSON)  │     │ resource_id     │
│ erreur          │     │ ip_address      │     │ metadata (JSON) │
│ mots_cles[]     │     │ created_at      │     │ created_at      │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────────────────────────┐
│ presence_digitale_recommandations   │
│─────────────────────────────────────│
│ id (PK)                             │
│ personnalite_id (FK)                │
│ titre                               │
│ message                             │
│ type                                │
│ priorite                            │
│ canal                               │
│ actif                               │
└─────────────────────────────────────┘
```

## Tables Principales

### `profiles`
Profils utilisateurs liés à `auth.users`.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | ID utilisateur (FK auth.users) |
| full_name | text | Nom complet |
| avatar_url | text | URL avatar |
| department | text | Département |
| disabled | boolean | Compte désactivé |
| created_at | timestamptz | Date création |
| updated_at | timestamptz | Dernière modification |

### `user_roles`
Rôles des utilisateurs (enum `app_role`).

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Identifiant unique |
| user_id | uuid (FK) | Référence utilisateur |
| role | app_role | admin, user, council_user, guest |
| created_at | timestamptz | Date assignation |

### `personnalites`
Acteurs du secteur télécoms surveillés.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Identifiant unique |
| nom | text | Nom de famille |
| prenom | text | Prénom |
| fonction | text | Poste occupé |
| organisation | text | Entreprise/institution |
| cercle | integer | 1-5 (proximité stratégique) |
| score_spdi_actuel | integer | Score présence digitale |
| suivi_spdi_actif | boolean | Suivi activé |
| reseaux | jsonb | Liens réseaux sociaux |
| alertes_config | jsonb | Configuration alertes |
| tags | text[] | Tags de classification |
| thematiques | text[] | Thématiques suivies |

### `actualites`
Articles et actualités collectés.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Identifiant unique |
| titre | text | Titre de l'article |
| contenu | text | Contenu complet |
| resume | text | Résumé généré |
| source_id | uuid (FK) | Source média |
| source_nom | text | Nom de la source |
| source_url | text | URL de l'article |
| categorie | text | Catégorie thématique |
| importance | integer | Score 1-10 |
| sentiment | integer | -100 à +100 |
| tags | text[] | Tags automatiques |
| analyse_ia | text | Analyse IA complète |
| date_publication | timestamptz | Date publication |

### `flux_veille`
Flux de veille personnalisés par utilisateur.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Identifiant unique |
| user_id | uuid (FK) | Propriétaire |
| nom | text | Nom du flux |
| mots_cles | text[] | Mots-clés de filtrage |
| categories_ids | text[] | Catégories suivies |
| quadrants | text[] | Quadrants du radar |
| importance_min | integer | Seuil d'importance |
| alerte_email | boolean | Notifications email |
| alerte_push | boolean | Notifications push |
| frequence_digest | text | hourly, daily, weekly |

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

```sql
CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### `get_user_role(user_id)`
Retourne le rôle principal d'un utilisateur.

```sql
CREATE FUNCTION get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role 
    WHEN 'admin' THEN 1 
    WHEN 'user' THEN 2 
    WHEN 'council_user' THEN 3 
    WHEN 'guest' THEN 4 
  END
  LIMIT 1
$$;
```

## Row Level Security (RLS)

### Pattern Standard

```sql
-- Lecture : utilisateur authentifié ou admin
CREATE POLICY "select_policy" ON table_name
FOR SELECT USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin')
);

-- Écriture : propriétaire uniquement
CREATE POLICY "insert_policy" ON table_name
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_policy" ON table_name
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "delete_policy" ON table_name
FOR DELETE USING (auth.uid() = user_id);
```

### Tables Publiques (Lecture)

Certaines tables sont en lecture publique pour les utilisateurs authentifiés :

- `personnalites` - Tous les utilisateurs peuvent consulter
- `actualites` - Actualités visibles par tous
- `categories_veille` - Référentiel public
- `signaux` - Signaux du radar publics

## Migrations

Les migrations sont gérées automatiquement par Lovable Cloud. Pour ajouter une migration :

1. Utiliser l'outil de migration Lovable
2. Écrire le SQL avec RLS policies
3. Attendre l'approbation utilisateur
4. Les types TypeScript sont régénérés automatiquement

### Exemple de Migration

```sql
-- Créer une nouvelle table
CREATE TABLE public.ma_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  titre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.ma_table ENABLE ROW LEVEL SECURITY;

-- Créer les policies
CREATE POLICY "Users can view own data" ON public.ma_table
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON public.ma_table
FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

Voir aussi : [Architecture](./ARCHITECTURE.md) | [Authentication](./AUTHENTICATION.md)
