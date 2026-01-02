# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### À venir
- Calcul automatique SPDI via CRON quotidien
- Export PDF des dossiers analytiques
- Intégration LinkedIn API directe
- Tableau de bord personnalisable par utilisateur

---

## [1.3.0] - 2026-01-02

### Nom de version : Audit Qualité et Documentation

### Added
- Centralisation gestion erreurs typées (`src/utils/errors.ts`)
  - Fonction `isErrorLike()` pour vérification type-safe
  - Fonction `toErrorMessage()` pour extraction messages
- Schémas Zod pour validation colonnes JSONB (`src/types/json-schemas.ts`)
  - `AlertesConfigSchema` : configuration alertes personnalités
  - `ReseauxSchema` : liens réseaux sociaux
  - `SourcesSuiviesSchema` : sources de veille
- Diagrammes Mermaid dans README.md :
  - Flux de collecte automatisée (Edge Function → PostgreSQL)
  - Flux assistant IA avec streaming SSE
  - Flux gestion utilisateurs (Admin)
  - Flux SPDI complet (4 phases, 4 axes)
- Section Architecture Visuelle complète dans README.md
- 5 tableaux récapitulatifs SPDI (axes, interprétations, recommandations, hooks, composants)

### Changed
- Suppression de 49 occurrences de `any` dans les hooks et composants
- Réécriture complète du README.md (~800 lignes)
- Typage strict des enums et interfaces dans `src/types/index.ts`
- Amélioration documentation des hooks avec JSDoc

### Security
- 12 contraintes CHECK en base de données pour intégrité métier
- Validation triggers pour dates d'expiration et valeurs numériques

### Database
- `20260102220621` : Ajout contraintes CHECK
  - `personnalites` : cercle (1-4), score_influence (0-100), score_spdi_actuel (0-100)
  - `signaux` : score_impact (0-100), niveau (info/attention/critique/urgent)
  - `alertes` : niveau (info/warning/error/critical)
  - `dossiers` : statut et catégorie validés
  - `actualites` : importance (1-5), sentiment (-1 à 1)
  - `presence_digitale_recommandations` : priorité validée
- `20260102210845` : Table `admin_audit_logs` avec index sur admin_id et created_at

---

## [1.2.0] - 2026-01-01

### Nom de version : Gestion Utilisateurs

### Added
- Page `/admin/users` : Gestion complète des utilisateurs
  - Liste paginée avec recherche
  - Modification rôles (admin, user, council_user, guest)
  - Activation/désactivation comptes
  - Suppression avec confirmation
- Page `/admin/audit-logs` : Historique des actions administrateur
  - Filtrage par action et période
  - Détails JSON des modifications
- Edge Function `invite-user` : Invitation par email avec lien magique
- Edge Function `manage-user` : Activation/désactivation/suppression comptes
- Edge Function `update-user-role` : Modification rôles avec audit
- Composant `AdminRoute` : Protection routes admin
- Hook `useAuditLogs` : Récupération logs audit

### Security
- Fonction RPC `has_role()` avec SECURITY DEFINER
- Protection auto-modification (impossibilité de modifier son propre rôle/compte)
- Audit logging systématique de toutes actions admin
- Vérification rôle admin côté Edge Function

### Database
- `20260101233957` : Ajout colonne `disabled` (boolean, default false) sur table `profiles`

---

## [1.1.0] - 2025-12-30

### Nom de version : Corrections RLS et Realtime

### Fixed
- RLS `signaux` : ouverture lecture pour rôles anon + authenticated
- RLS `mentions` : ouverture lecture pour rôles anon + authenticated
- RLS `alertes` : alertes système (user_id = NULL) visibles pour tous les utilisateurs authentifiés

### Added
- Realtime sur table `alertes` pour notifications push temps réel
- Composant `AlertNotificationProvider` : écoute changements alertes
- Hook `useRealtimeAlerts` : abonnement canal Supabase

### Changed
- Optimisation requêtes alertes avec index sur `traitee` et `created_at`

### Database
- `20251230154735` : Corrections policies RLS signaux, mentions, alertes
- `20251230003101` : Configuration supplémentaire collecte
- `20251230002851` : Ajout policies RLS permissives pour lecture publique

---

## [1.0.0] - 2025-12-28

### Nom de version : Lancement Initial

### Added

#### Core Features
- **Dashboard Radar** : Vue stratégique avec 4 quadrants (Opportunités, Menaces, Forces, Faiblesses)
- **Fil d'actualités** : Collecte automatisée multi-sources avec enrichissement IA
- **Personnalités** : Gestion des acteurs stratégiques avec cercles d'influence (1-4)
- **SPDI** : Score de Présence Digitale Institutionnelle (4 axes, scoring 0-100)
- **Assistant IA** : Chat contextuel avec streaming SSE et historique conversations
- **Dossiers analytiques** : Notes structurées en Markdown avec catégorisation
- **Alertes** : Système de notifications temps réel multi-niveaux

#### Pages (12)
- `/` : Dashboard Radar principal
- `/actualites` : Fil d'actualités avec filtres
- `/personnalites` : Annuaire des personnalités
- `/assistant` : Chat IA contextuel
- `/dossiers` : Dossiers analytiques
- `/alertes` : Historique des alertes
- `/profile` : Profil utilisateur
- `/auth` : Authentification
- `/admin` : Administration
- `/admin/users` : Gestion utilisateurs
- `/admin/mots-cles` : Configuration mots-clés veille
- `/admin/audit-logs` : Logs d'audit

#### Composants (50+)
- Composants shadcn/ui personnalisés
- Composants SPDI (Gauge, Radar, Evolution, Recommandations, Comparaison)
- Composants layout (AppHeader, AppSidebar, AppLayout)
- Composants notifications (NotificationCenter, AlertNotificationProvider)

#### Hooks (13)
- `useActualites` : Gestion actualités
- `usePersonnalites` : Gestion personnalités
- `usePresenceDigitale` : Métriques SPDI
- `useConversationsIA` : Historique assistant
- `useDossiers` : CRUD dossiers
- `useMotsClesVeille` : Configuration veille
- `useAlertesHistory` : Historique alertes
- `useRealtimeAlerts` : Notifications temps réel
- `useRadarData` : KPIs dashboard
- `useUserProfile` : Profil utilisateur
- `useDeduplicationActeurs` : Détection doublons import
- `use-mobile` : Détection responsive
- `use-toast` : Notifications UI

#### Edge Functions (7)
- `collecte-veille` : Collecte automatisée sources
- `enrichir-actualite` : Enrichissement IA des articles
- `generer-acteurs` : Génération acteurs depuis actualités
- `assistant-ia` : Chat IA avec streaming SSE
- `invite-user` : Invitation utilisateurs
- `manage-user` : Gestion comptes
- `update-user-role` : Modification rôles

### Authentication
- 4 rôles : `admin`, `user`, `council_user`, `guest`
- Routes protégées avec `ProtectedRoute` et `AdminRoute`
- RLS (Row Level Security) sur 17 tables
- Auto-création profil via trigger `on_auth_user_created`

### Database

#### Tables (17)
- `profiles` : Profils utilisateurs
- `user_roles` : Rôles utilisateurs
- `personnalites` : Acteurs stratégiques
- `personnalites_mentions` : Liaison personnalités-mentions
- `mentions` : Mentions médiatiques
- `actualites` : Articles et news
- `sources_media` : Sources de veille
- `alertes` : Notifications système
- `signaux` : Signaux stratégiques
- `dossiers` : Dossiers analytiques
- `conversations_ia` : Historique assistant
- `mots_cles_veille` : Mots-clés de veille
- `categories_veille` : Catégories mots-clés
- `collectes_log` : Logs de collecte
- `config_seuils` : Configuration seuils
- `presence_digitale_metrics` : Métriques SPDI
- `presence_digitale_recommandations` : Recommandations IA

#### Fonctions RPC
- `has_role(role, user_id)` : Vérification rôle
- `get_user_role(user_id)` : Récupération rôle

#### Enum
- `app_role` : admin | user | council_user | guest

### Migrations initiales
- `20251228000138` : Schéma initial complet
- `20251228001948` : Extensions PostgreSQL
- `20251228004309` : Données de référence
- `20251228004355` : Configuration mots-clés
- `20251228090401` : Tables veille additionnelles
- `20251228091548` : Tables SPDI
- `20251228094801` : Configuration Realtime alertes
- `20251228101200` : Optimisations index

---

## Conventions

### Types de changements
- **Added** : Nouvelles fonctionnalités
- **Changed** : Modifications de fonctionnalités existantes
- **Deprecated** : Fonctionnalités qui seront supprimées
- **Removed** : Fonctionnalités supprimées
- **Fixed** : Corrections de bugs
- **Security** : Corrections de vulnérabilités
- **Database** : Migrations et modifications schéma

### Versioning
- **MAJOR** (X.0.0) : Changements incompatibles avec versions précédentes
- **MINOR** (0.X.0) : Nouvelles fonctionnalités rétrocompatibles
- **PATCH** (0.0.X) : Corrections de bugs rétrocompatibles
