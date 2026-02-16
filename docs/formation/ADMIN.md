# Guide de Formation Administrateur

## 🔧 Rôle et Responsabilités

En tant qu'administrateur ANSUT RADAR, vous êtes responsable de :

- **Gestion des utilisateurs** : invitations, rôles, désactivations
- **Permissions** : configuration granulaire des droits d'accès par rôle
- **Configuration de la veille** : mots-clés, catégories, sources média
- **Newsletters** : gestion, génération et envoi
- **Diffusion** : programmation des envois automatiques
- **SPDI** : supervision des calculs et statuts
- **Supervision technique** : tâches CRON, logs d'audit, performances

---

## 🚀 Première Connexion

1. Acceptez l'invitation reçue par email
2. Définissez votre mot de passe (min. 8 caractères)
3. Vous accédez automatiquement à l'interface

---

## 📍 Navigation Administrateur

Le menu latéral affiche les entrées suivantes :

| Icône | Menu | Description |
|-------|------|-------------|
| 📊 | Centre de Veille | Radar stratégique et briefing |
| 📰 | Actualités & Veille | Fil d'actualités enrichies |
| 📡 | Mes Flux | Flux de veille personnalisés |
| 👥 | Acteurs & Influence | Cartographie, SPDI, Benchmark, Revue |
| 📁 | Studio Publication | Notes et newsletters |
| 🤖 | Assistant IA | Chatbot intelligent |
| ⚙️ | **Administration** | Gestion de la plateforme |

---

## ⚙️ Interface d'Administration

Accessible via le menu "Administration" (visible uniquement avec la permission `access_admin`).

### Sous-menus disponibles

| Section | Route | Description |
|---------|-------|-------------|
| Utilisateurs | `/admin/users` | Gérer les comptes |
| Rôles & Permissions | `/admin/roles` | Configurer les droits d'accès granulaires |
| Mots-clés | `/admin/mots-cles` | Configurer la veille |
| Sources | `/admin/sources` | Gérer les sources média |
| Newsletters | `/admin/newsletters` | Gestion des newsletters |
| Diffusion | `/admin/diffusion` | Programmation des envois automatiques |
| SPDI Status | `/admin/spdi-status` | Supervision des calculs SPDI |
| Import Acteurs | `/admin/import-acteurs` | Import CSV d'acteurs |
| Tâches CRON | `/admin/cron-jobs` | Planification automatique |
| Logs d'audit | `/admin/audit-logs` | Historique des actions |
| Formation | `/admin/formation` | Guides PDF par profil |
| Documentation | `/admin/documentation` | Doc technique intégrée |
| Présentation | `/admin/presentation` | Slides de présentation |

---

## 👤 Gestion des Utilisateurs

### Accès
Menu Administration → **Utilisateurs** (`/admin/users`)

### Inviter un nouvel utilisateur

1. Cliquez sur **"Inviter un utilisateur"**
2. Remplissez : Email, Nom complet, Département, Rôle
3. Cliquez sur **"Envoyer l'invitation"**

### Modifier un utilisateur

| Action | Description |
|--------|-------------|
| Changer le rôle | Sélectionnez un nouveau rôle |
| Désactiver | Empêche la connexion |
| Réactiver | Restaure l'accès |
| Supprimer | Suppression définitive |
| Réinitialiser MDP | Générer un lien de réinitialisation |

### Les 4 rôles

| Rôle | Accès |
|------|-------|
| `admin` | Accès complet + Administration |
| `user` | Toutes les fonctionnalités sauf admin |
| `council_user` | Lecture + Flux personnels + Assistant IA |
| `guest` | Centre de Veille + Actualités uniquement |

---

## 🔐 Système de Permissions Granulaires

### Accès
Menu Administration → **Rôles & Permissions** (`/admin/roles`)

### Interface de configuration

La matrice de permissions affiche :
- **En lignes** : les permissions disponibles, groupées par catégorie
- **En colonnes** : les 4 rôles (Admin, User, Council User, Guest)
- **Interaction** : Cochez/décochez pour activer/désactiver

> ⚠️ Les permissions du rôle **Admin** ne peuvent pas être désactivées.

### Permissions de Consultation

| Code | Libellé |
|------|---------|
| `view_radar` | Accès au Centre de Veille |
| `view_actualites` | Accès aux actualités |
| `view_personnalites` | Accès aux Acteurs & Influence |
| `view_dossiers` | Accès au Studio Publication |

### Permissions d'Actions

| Code | Libellé |
|------|---------|
| `create_flux` | Créer des flux de veille |
| `edit_dossiers` | Créer/modifier des notes |
| `use_assistant` | Utiliser l'assistant IA |
| `receive_alerts` | Recevoir des alertes |

### Permissions d'Administration

| Code | Libellé |
|------|---------|
| `access_admin` | Accès section admin |
| `manage_users` | Gérer les utilisateurs |
| `manage_roles` | Gérer les permissions |
| `view_audit_logs` | Voir les logs d'audit |
| `manage_cron_jobs` | Gérer les tâches CRON |
| `manage_keywords` | Gérer les mots-clés |
| `manage_sources` | Gérer les sources |
| `import_actors` | Importer des acteurs |
| `manage_newsletters` | Gérer les newsletters |

---

## 📧 Gestion des Newsletters

### Accès
Menu Administration → **Newsletters** (`/admin/newsletters`)

- Voir toutes les newsletters générées
- Valider ou rejeter les contenus
- Programmer les envois
- Consulter les statistiques d'envoi

---

## 📡 Diffusion Automatisée

### Accès
Menu Administration → **Diffusion** (`/admin/diffusion`)

- Programmer des envois par canal (email, SMS)
- Configurer les destinataires par groupe
- Définir la fréquence et l'heure d'envoi
- Consulter les logs d'envoi

---

## 📊 SPDI Status

### Accès
Menu Administration → **SPDI Status** (`/admin/spdi-status`)

- Voir le statut des calculs SPDI pour chaque acteur
- Identifier les acteurs avec suivi actif/inactif
- Forcer un recalcul manuel
- Diagnostiquer les erreurs de calcul

---

## 🔤 Sources Média

### Accès
Menu Administration → **Sources** (`/admin/sources`)

- Gérer les sources de veille (RSS, sites web, réseaux sociaux)
- Configurer les paramètres de collecte par source
- Activer/désactiver des sources
- Voir la dernière date de collecte

---

## 🔤 Configuration des Mots-clés

### Accès
Menu Administration → **Mots-clés** (`/admin/mots-cles`)

### Ajouter un mot-clé

1. Cliquez sur **"Ajouter un mot-clé"**
2. Remplissez : mot-clé, variantes, catégorie, quadrant, criticité
3. Activez l'alerte automatique si nécessaire

---

## ⏰ Tâches CRON

### Accès
Menu Administration → **Tâches CRON** (`/admin/cron-jobs`)

### Actions disponibles

| Action | Description |
|--------|-------------|
| ▶️ Exécuter | Lancer manuellement |
| ⏸️ Suspendre | Désactiver temporairement |
| ✏️ Modifier | Changer la planification |
| 📊 Historique | Consulter les exécutions |

---

## 📋 Logs d'Audit

### Accès
Menu Administration → **Logs d'audit** (`/admin/audit-logs`)

Chaque action admin est tracée avec :
- Date et heure
- Administrateur concerné
- Type d'action
- Utilisateur cible
- Détails JSON de l'action

---

## ✅ Checklist Administrateur

### Configuration initiale

- [ ] Configurer les mots-clés de veille
- [ ] Configurer les sources média
- [ ] Importer les acteurs clés initiaux
- [ ] Configurer les permissions par rôle
- [ ] Vérifier les tâches CRON
- [ ] Inviter les premiers utilisateurs
- [ ] Tester le flux complet (collecte → enrichissement → alerte)

### Maintenance régulière

- [ ] Consulter les logs d'audit
- [ ] Vérifier les exécutions CRON
- [ ] Mettre à jour les mots-clés
- [ ] Valider et envoyer les newsletters
- [ ] Gérer les demandes d'accès

---

**Bonne administration ! 🔧**
