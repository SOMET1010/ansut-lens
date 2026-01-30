
# Ajout de la Section Permissions Granulaires dans la Documentation Administrateur

## Objectif

Documenter le système de permissions granulaires disponible dans ANSUT RADAR, en détaillant les 17 permissions existantes organisées en 3 catégories.

## Contenu à ajouter

### Nouvelle section "Système de Permissions"

Insérer après la section "Les 4 rôles" (ligne 92) une nouvelle section détaillant :

1. **Présentation du système** - Explication du fonctionnement basé sur les permissions
2. **Catégorie Consultation** - 4 permissions de lecture
3. **Catégorie Actions** - 4 permissions d'interaction
4. **Catégorie Administration** - 9 permissions de gestion

### Permissions à documenter

| Code | Catégorie | Libellé | Description |
|------|-----------|---------|-------------|
| `view_radar` | Consultation | Voir le radar | Accès au tableau de bord radar |
| `view_actualites` | Consultation | Voir les actualités | Accès à la liste des actualités |
| `view_personnalites` | Consultation | Voir les personnalités | Accès aux fiches acteurs clés |
| `view_dossiers` | Consultation | Voir les dossiers | Accès aux dossiers stratégiques |
| `create_flux` | Actions | Créer des flux | Créer ses propres flux de veille |
| `edit_dossiers` | Actions | Modifier les dossiers | Créer et modifier des dossiers |
| `use_assistant` | Actions | Utiliser l'assistant IA | Poser des questions à l'IA |
| `receive_alerts` | Actions | Recevoir des alertes | Notifications et emails d'alerte |
| `access_admin` | Admin | Accès administration | Permet d'accéder à la section admin |
| `manage_users` | Admin | Gérer les utilisateurs | Inviter, désactiver, supprimer |
| `manage_roles` | Admin | Gérer les rôles | Modifier les permissions |
| `view_audit_logs` | Admin | Voir les logs d'audit | Consulter l'historique |
| `manage_cron_jobs` | Admin | Gérer les tâches CRON | Activer/désactiver collectes |
| `manage_keywords` | Admin | Gérer les mots-clés | Configurer la veille |
| `manage_sources` | Admin | Gérer les sources | Configurer sources média |
| `import_actors` | Admin | Importer des acteurs | Import en masse CSV |
| `manage_newsletters` | Admin | Gérer les newsletters | Créer et envoyer newsletters |

## Fichier à modifier

| Fichier | Modification |
|---------|--------------|
| `docs/formation/ADMIN.md` | Ajouter la section "Système de Permissions" après la ligne 92 |

## Structure de la nouvelle section

```markdown
---

## 🔐 Système de Permissions

### Fonctionnement

ANSUT RADAR utilise un système de permissions granulaires permettant de contrôler 
précisément les accès de chaque rôle. Chaque permission peut être activée ou 
désactivée individuellement par rôle.

### Accès
Menu Administration → **Rôles & Permissions** (`/admin/roles`)

### Interface de configuration

La matrice de permissions affiche :
- En lignes : les permissions disponibles
- En colonnes : les 4 rôles (Admin, User, Council User, Guest)
- Cochez/décochez pour activer/désactiver

> ⚠️ **Note** : Les permissions du rôle Admin ne peuvent pas être désactivées.

### Permissions de Consultation

[Tableau des 4 permissions consultation]

### Permissions d'Actions

[Tableau des 4 permissions actions]

### Permissions d'Administration

[Tableau des 9 permissions admin]

### Bonnes pratiques

- Principe du moindre privilège
- Tester après modification
- Documentation des changements
```

## Résultat attendu

La documentation administrateur inclura une section complète sur :
- Le fonctionnement du système de permissions
- La liste exhaustive des 17 permissions avec codes et descriptions
- Les bonnes pratiques de configuration
- L'accès à l'interface de gestion (`/admin/roles`)
