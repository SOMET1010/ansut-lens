# Guide de Formation Administrateur

## 🔧 Rôle et Responsabilités

En tant qu'administrateur ANSUT RADAR, vous êtes responsable de :

- **Gestion des utilisateurs** : invitations, rôles, désactivations
- **Configuration de la veille** : mots-clés, catégories, sources
- **Supervision technique** : tâches CRON, logs, performances
- **Support utilisateurs** : assistance et résolution de problèmes

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
| 📊 | Tableau de bord | Vue d'ensemble et KPIs |
| 📰 | Actualités | Fil d'actualités enrichies |
| 📡 | Mes Flux | Flux de veille personnalisés |
| 👥 | Acteurs clés | Personnalités surveillées |
| 📁 | Dossiers | Notes stratégiques |
| 🤖 | Assistant IA | Chatbot intelligent |
| 🔔 | Alertes | Centre de notifications |
| ⚙️ | **Administration** | Gestion de la plateforme |

---

## ⚙️ Interface d'Administration

Accessible via le menu "Administration" (visible uniquement pour les admins).

### Sous-menus disponibles

| Section | Route | Description |
|---------|-------|-------------|
| Utilisateurs | `/admin/users` | Gérer les comptes |
| Rôles & Permissions | `/admin/roles` | Configurer les droits d'accès |
| Mots-clés | `/admin/mots-cles` | Configurer la veille |
| Sources | `/admin/sources` | Gérer les sources média |
| Newsletters | `/admin/newsletters` | Gestion des newsletters |
| Import Acteurs | `/admin/import-acteurs` | Import CSV |
| Tâches CRON | `/admin/cron` | Planification automatique |
| Logs d'audit | `/admin/audit` | Historique des actions |

---

## 👤 Gestion des Utilisateurs

### Accès
Menu Administration → **Utilisateurs** (`/admin/users`)

### Inviter un nouvel utilisateur

1. Cliquez sur **"Inviter un utilisateur"**
2. Remplissez le formulaire :
   - Email (obligatoire)
   - Nom complet
   - Département
   - Rôle (admin, user, council_user, guest)
3. Cliquez sur **"Envoyer l'invitation"**

L'utilisateur reçoit un email personnalisé avec le logo ANSUT.

### Modifier un utilisateur

| Action | Description |
|--------|-------------|
| Changer le rôle | Sélectionnez un nouveau rôle dans le menu déroulant |
| Désactiver | Empêche la connexion sans supprimer le compte |
| Réactiver | Restaure l'accès d'un compte désactivé |
| Supprimer | Suppression définitive (irréversible) |

### Les 4 rôles

| Rôle | Accès |
|------|-------|
| `admin` | Accès complet + Administration |
| `user` | Toutes les fonctionnalités sauf admin |
| `council_user` | Lecture + Flux personnels + Assistant IA |
| `guest` | Tableau de bord + Actualités uniquement |

---

## 🔐 Système de Permissions Granulaires

### Fonctionnement

ANSUT RADAR utilise un système de permissions granulaires permettant de contrôler précisément les accès de chaque rôle. Chaque permission peut être activée ou désactivée individuellement par rôle.

### Accès
Menu Administration → **Rôles & Permissions** (`/admin/roles`)

### Interface de configuration

La matrice de permissions affiche :
- **En lignes** : les permissions disponibles, groupées par catégorie
- **En colonnes** : les 4 rôles (Admin, User, Council User, Guest)
- **Interaction** : Cochez/décochez pour activer/désactiver une permission

> ⚠️ **Note de sécurité** : Les permissions du rôle **Admin** ne peuvent pas être désactivées. Les modifications sont appliquées immédiatement.

---

### Permissions de Consultation

| Code | Libellé | Description |
|------|---------|-------------|
| `view_radar` | Voir le radar | Accès au tableau de bord et radar stratégique |
| `view_actualites` | Voir les actualités | Accès au fil d'actualités enrichies |
| `view_personnalites` | Voir les personnalités | Accès aux fiches acteurs clés |
| `view_dossiers` | Voir les dossiers | Accès aux notes stratégiques |

---

### Permissions d'Actions

| Code | Libellé | Description |
|------|---------|-------------|
| `create_flux` | Créer des flux | Créer ses propres flux de veille personnalisés |
| `edit_dossiers` | Modifier les dossiers | Créer et modifier des notes stratégiques |
| `use_assistant` | Utiliser l'assistant IA | Interagir avec le chatbot intelligent |
| `receive_alerts` | Recevoir des alertes | Recevoir les notifications et emails d'alerte |

---

### Permissions d'Administration

| Code | Libellé | Description |
|------|---------|-------------|
| `access_admin` | Accès administration | Permet d'accéder à la section admin |
| `manage_users` | Gérer les utilisateurs | Inviter, désactiver, supprimer des comptes |
| `manage_roles` | Gérer les rôles | Modifier les permissions par rôle |
| `view_audit_logs` | Voir les logs d'audit | Consulter l'historique des actions |
| `manage_cron_jobs` | Gérer les tâches CRON | Activer/désactiver les collectes automatiques |
| `manage_keywords` | Gérer les mots-clés | Configurer la veille thématique |
| `manage_sources` | Gérer les sources | Configurer les sources média |
| `import_actors` | Importer des acteurs | Import en masse via CSV |
| `manage_newsletters` | Gérer les newsletters | Créer, éditer et envoyer des newsletters |

---

### Matrice par défaut

| Permission | Admin | User | Council | Guest |
|------------|:-----:|:----:|:-------:|:-----:|
| **Consultation** |
| view_radar | ✅ | ✅ | ✅ | ✅ |
| view_actualites | ✅ | ✅ | ✅ | ✅ |
| view_personnalites | ✅ | ✅ | ❌ | ❌ |
| view_dossiers | ✅ | ✅ | ❌ | ❌ |
| **Actions** |
| create_flux | ✅ | ✅ | ✅ | ❌ |
| edit_dossiers | ✅ | ✅ | ❌ | ❌ |
| use_assistant | ✅ | ✅ | ✅ | ❌ |
| receive_alerts | ✅ | ✅ | ✅ | ❌ |
| **Administration** |
| access_admin | ✅ | ❌ | ❌ | ❌ |
| manage_* | ✅ | ❌ | ❌ | ❌ |

---

### Bonnes pratiques

1. **Principe du moindre privilège** : N'accordez que les permissions nécessaires
2. **Tester après modification** : Vérifiez l'impact sur un utilisateur test
3. **Documenter les changements** : Notez les raisons des modifications
4. **Révision régulière** : Auditez les permissions trimestriellement

---

## 🔤 Configuration des Mots-clés

### Accès
Menu Administration → **Mots-clés de veille** (`/admin/mots-cles`)

### Ajouter un mot-clé

1. Cliquez sur **"Ajouter un mot-clé"**
2. Remplissez :
   - Mot-clé principal (ex: "fibre optique")
   - Variantes (ex: "FTTH", "fibre optique", "fiber")
   - Catégorie de veille
   - Quadrant du radar
   - Score de criticité (1-10)
   - Alerte automatique (oui/non)
3. Sauvegardez

### Impact sur la collecte

Les mots-clés configurés sont utilisés par la tâche CRON `collecte-veille` pour :
- Rechercher des actualités correspondantes
- Enrichir automatiquement les articles
- Déclencher des alertes si activé

---

## 📥 Import d'Acteurs

### Accès
Menu Administration → **Import Acteurs** (`/admin/import-acteurs`)

### Format CSV attendu

```csv
nom,prenom,fonction,organisation,categorie,cercle
Dupont,Jean,Directeur,Orange CI,operateurs,1
Martin,Marie,Ministre,Gouvernement,regulateurs,1
```

### Processus d'import

1. Préparez votre fichier CSV
2. Glissez-déposez ou sélectionnez le fichier
3. Vérifiez la prévisualisation
4. Corrigez les erreurs éventuelles
5. Cliquez sur **"Importer"**

### Gestion des doublons

Le système détecte les doublons potentiels basés sur :
- Nom + Prénom similaires
- Même organisation

Vous pouvez fusionner ou ignorer les doublons détectés.

---

## ⏰ Tâches CRON

### Accès
Menu Administration → **Tâches CRON** (`/admin/cron`)

### Tâches configurées

| Tâche | Planification | Description |
|-------|---------------|-------------|
| `collecte-veille-critique` | Toutes les 6h | Collecte actualités prioritaires |
| `collecte-veille-quotidienne` | Chaque jour 8h | Collecte complète |
| `send-flux-digest` | Configurable | Envoi des digests email |

### Actions disponibles

| Action | Description |
|--------|-------------|
| ▶️ Exécuter | Lancer manuellement la tâche |
| ⏸️ Suspendre | Désactiver temporairement |
| ✏️ Modifier | Changer la planification CRON |
| 📊 Historique | Consulter les exécutions passées |

### Format de planification CRON

```
┌───────────── minute (0 - 59)
│ ┌───────────── heure (0 - 23)
│ │ ┌───────────── jour du mois (1 - 31)
│ │ │ ┌───────────── mois (1 - 12)
│ │ │ │ ┌───────────── jour de la semaine (0 - 6)
│ │ │ │ │
* * * * *
```

**Exemples :**
- `0 */6 * * *` → Toutes les 6 heures
- `0 8 * * *` → Chaque jour à 8h00
- `0 8 * * 1-5` → Du lundi au vendredi à 8h00

---

## 📋 Logs d'Audit

### Accès
Menu Administration → **Logs d'audit** (`/admin/audit`)

### Informations enregistrées

Chaque action admin est tracée avec :
- Date et heure
- Administrateur concerné
- Type d'action (invite, role_change, disable, delete)
- Utilisateur cible
- Détails de l'action

### Filtres disponibles

- Par période (aujourd'hui, 7 jours, 30 jours, personnalisé)
- Par administrateur
- Par type d'action

---

## 🔧 Résolution de Problèmes

### Un utilisateur ne reçoit pas l'invitation

1. Vérifiez l'adresse email saisie
2. Demandez à l'utilisateur de vérifier ses spams
3. Consultez les logs de la fonction `invite-user`
4. Vérifiez que le secret `RESEND_API_KEY` est configuré

### La collecte de veille ne fonctionne pas

1. Vérifiez les tâches CRON dans `/admin/cron`
2. Consultez l'historique des exécutions
3. Vérifiez que des mots-clés actifs existent
4. Consultez les logs de `collecte-veille`

### Un utilisateur ne peut pas se connecter

1. Vérifiez que le compte n'est pas désactivé
2. Proposez la réinitialisation de mot de passe
3. Vérifiez le rôle attribué

---

## ✅ Checklist Administrateur

### Configuration initiale

- [ ] Configurer les mots-clés de veille
- [ ] Importer les acteurs clés initiaux
- [ ] Vérifier les tâches CRON
- [ ] Inviter les premiers utilisateurs
- [ ] Tester le flux complet (collecte → enrichissement → alerte)

### Maintenance régulière

- [ ] Consulter les logs d'audit hebdomadaires
- [ ] Vérifier les exécutions CRON
- [ ] Mettre à jour les mots-clés si nécessaire
- [ ] Gérer les demandes d'accès

---

## 📞 Support Technique

Pour les problèmes techniques avancés :
- Consultez la [documentation technique](../README.md)
- Contactez l'équipe de développement

---

**Bonne administration ! 🔧**
