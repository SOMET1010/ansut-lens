# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### À venir
- Calcul automatique SPDI via CRON quotidien
- Intégration LinkedIn API directe
- Tableau de bord personnalisable par utilisateur

---

## [1.4.0] - 2026-02-16

### Nom de version : Acteurs & Influence Unifiés

### Added

#### Fusion Menu Acteurs & Influence
- Nouvelle page unifiée `/acteurs` avec navigation par onglets (Tabs Radix)
- 4 onglets : Cartographie, Dashboard SPDI, Revue Stabilité, Benchmark
- Synchronisation URL via query param `?tab=cartographie|spdi|revue|benchmark`
- Redirections rétrocompatibles depuis `/personnalites`, `/presence-digitale`, `/spdi-review`
- Entrée de menu unique "Acteurs & Influence" dans le sidebar

#### Module d'Analyse d'Influence Digitale
- Score SPDI composite (4 axes : Visibilité 30%, Qualité 25%, Autorité 25%, Présence 20%)
- Edge Function `calculer-spdi` avec clamp sécurisé pour `sentiment_moyen` (numeric 3,2)
- Edge Function `analyser-spdi` : recommandations stratégiques via Gemini (4 piliers)
- Dashboard SPDI individuel : jauge, radar axes, évolution historique, comparaison pairs
- Revue de Stabilité : KPIs globaux, tableau synthèse, comparaison temporelle, classement par axe
- 15 composants SPDI (GaugeCard, AxesRadar, EvolutionChart, BenchmarkPanel, StabilityTable, etc.)

#### Mode Benchmark "Duel d'Influence"
- Composant `SPDIBenchmarkPanel` : comparaison côte à côte de 2 acteurs
- Hook `useBenchmarkData` : données comparatives

#### Studio Newsletter WYSIWYG
- Éditeur visuel avec blocs drag & drop (@dnd-kit)
- 11 types de blocs : Header, Édito, Article, Tech, Chiffre, Agenda, Image, Bouton, Séparateur, Texte, Footer
- Prévisualisation responsive (Desktop 650px, Tablette 768px, Mobile 375px)
- Export HTML complet pour envoi
- Edge Functions : `generer-newsletter`, `envoyer-newsletter`, `scheduler-newsletter`

#### Système de Permissions Granulaires
- Table `role_permissions` + `permissions_registry`
- Hook `useUserPermissions` : vérification permissions côté client
- Composant `PermissionRoute` : protection routes par permission
- Interface admin de configuration (matrice rôles × permissions)
- Fonction RPC `has_permission()` côté base de données

#### Diffusion Automatisée
- Programmation multi-canal (email, SMS) avec table `diffusion_programmation`
- Edge Function `diffuser-resume` : envoi automatique par canal
- Edge Function `envoyer-sms` : alertes SMS critiques
- Logs d'envoi avec statistiques

#### Guides de Formation PDF
- Composant `GuideViewer` : visualisation des guides par profil
- Composant `GuidePDFLayout` : mise en page pour export PDF
- Page admin `/admin/formation` : accès aux guides

#### Edge Functions (14 nouvelles, total 23)
- `analyser-spdi`, `calculer-spdi` : analyse et calcul SPDI
- `collecte-social`, `collecte-social-api` : collecte données sociales
- `diffuser-resume` : diffusion automatisée
- `envoyer-newsletter`, `envoyer-sms` : envoi par canal
- `generate-password-link`, `reset-user-password` : gestion mots de passe
- `generer-briefing` : briefing quotidien IA
- `generer-newsletter` : génération contenu newsletter
- `generer-requete-flux` : génération requête flux par IA
- `list-users-status` : statut utilisateurs
- `scheduler-newsletter` : programmation newsletters

### Changed
- Menu sidebar : 3 entrées (Acteurs, Présence Digitale, Revue SPDI) → 1 entrée "Acteurs & Influence"
- Routes : `/personnalites`, `/presence-digitale`, `/spdi-review` redirigent vers `/acteurs?tab=...`
- Documentation complète mise à jour (OVERVIEW, ARCHITECTURE, DATABASE, EDGE-FUNCTIONS, API, README, formations)
- Compteurs docs : 17 tables → 30+, 9 Edge Functions → 23, 13 hooks → 25+, 50 composants → 80+
- API IA : référence Grok/xAI remplacée par Google Gemini (via Lovable AI)

### Security
- Clamp sécurisé `sentiment_moyen` dans `calculer-spdi` pour éviter overflow numeric(3,2)

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
- `20260102210845` : Table `admin_audit_logs` avec index

---

## [1.2.0] - 2026-01-01

### Nom de version : Gestion Utilisateurs

### Added
- Page `/admin/users` : Gestion complète des utilisateurs
- Page `/admin/audit-logs` : Historique des actions administrateur
- Edge Function `invite-user` : Invitation par email
- Edge Function `manage-user` : Activation/désactivation/suppression
- Edge Function `update-user-role` : Modification rôles avec audit

### Security
- Fonction RPC `has_role()` avec SECURITY DEFINER
- Audit logging systématique

### Database
- `20260101233957` : Ajout colonne `disabled` sur `profiles`

---

## [1.1.0] - 2025-12-30

### Nom de version : Corrections RLS et Realtime

### Fixed
- RLS `signaux` : ouverture lecture pour rôles anon + authenticated
- RLS `mentions` : ouverture lecture
- RLS `alertes` : alertes système visibles pour tous

### Added
- Realtime sur table `alertes`
- Composant `AlertNotificationProvider`
- Hook `useRealtimeAlerts`

---

## [1.0.0] - 2025-12-28

### Nom de version : Lancement Initial

### Added

#### Core Features
- **Dashboard Radar** : Vue stratégique avec 4 quadrants
- **Fil d'actualités** : Collecte automatisée multi-sources avec enrichissement IA
- **Personnalités** : Gestion des acteurs stratégiques avec cercles d'influence
- **SPDI** : Score de Présence Digitale Institutionnelle (4 axes, scoring 0-100)
- **Assistant IA** : Chat contextuel avec streaming SSE
- **Dossiers analytiques** : Notes structurées en Markdown
- **Alertes** : Système de notifications temps réel

#### Pages (12)
- `/`, `/actualites`, `/personnalites`, `/assistant`, `/dossiers`, `/alertes`
- `/profile`, `/auth`, `/admin`, `/admin/users`, `/admin/mots-cles`, `/admin/audit-logs`

#### Edge Functions (7)
- `collecte-veille`, `enrichir-actualite`, `generer-acteurs`, `assistant-ia`
- `invite-user`, `manage-user`, `update-user-role`

### Authentication
- 4 rôles : `admin`, `user`, `council_user`, `guest`
- RLS sur 17 tables

---

## Conventions

### Types de changements
- **Added** : Nouvelles fonctionnalités
- **Changed** : Modifications existantes
- **Deprecated** : Fonctionnalités à supprimer
- **Removed** : Fonctionnalités supprimées
- **Fixed** : Corrections de bugs
- **Security** : Corrections de vulnérabilités
- **Database** : Migrations et modifications schéma

### Versioning
- **MAJOR** (X.0.0) : Changements incompatibles
- **MINOR** (0.X.0) : Nouvelles fonctionnalités rétrocompatibles
- **PATCH** (0.0.X) : Corrections de bugs
