

# Transformation de la Page Utilisateurs en Centre de Gouvernance des Équipes

## Vision

Transformer la page `/admin/users` d'une simple liste CRUD en un **Centre de Gouvernance Visuel** qui répond aux questions essentielles :
- **Qui est cette personne ?** (Rôle métier + Département)
- **Que fait-elle sur la plateforme ?** (Dernière activité)
- **Est-ce sécurisé ?** (Indicateurs de connexion)

## Analyse de l'existant

### Points forts actuels
- KPIs de comptage (Total, Actifs, En attente, Désactivés)
- Filtres par statut et rôle
- Actions complètes (invitation, désactivation, suppression)
- Tooltips informatifs sur les statuts

### Améliorations proposées
- Vue "Cartes" plus humaine en plus de la table
- Indicateurs de présence en temps réel
- Affichage du département (champ existant mais non utilisé)
- KPIs de sécurité enrichis
- Carte d'invitation rapide

## Modifications planifiées

### 1. Nouveau composant `UserCard`

Créer un composant carte "visite" pour chaque utilisateur :

```text
┌─────────────────────────────────────────┐
│  [⋮]                          En ligne ●│
│                                         │
│     ┌──────┐                            │
│     │  SP  │ ●                          │
│     └──────┘                            │
│                                         │
│     SOMET PATRICK                       │
│     patrick.somet@ansut.ci              │
│                                         │
│  [Administrateur]  [Direction Générale] │
│                                         │
│  Dernière activité          Statut      │
│  Il y a 5 min               ● Actif     │
└─────────────────────────────────────────┘
```

### 2. KPIs de sécurité enrichis

Ajouter des métriques de gouvernance :

| KPI | Description |
|-----|-------------|
| Licences actives | X/Y format avec plan |
| Connectés maintenant | Nombre de sessions < 15 min |
| Invitations en attente | Avec délai d'expiration |
| Administrateurs | Nombre de comptes admin |

### 3. Toggle Vue Carte/Table

Permettre de basculer entre :
- **Vue Cartes** : Présentation visuelle, idéale pour petites équipes
- **Vue Table** : Liste compacte, idéale pour recherche rapide

### 4. Indicateurs de dernière activité

Remplacer "Date de création" par "Dernière activité" avec formatage intelligent :
- "À l'instant" (< 5 min)
- "Il y a 15 min"
- "Il y a 2h"
- "Hier 14:30"
- "Jamais connecté"

### 5. Affichage du département

Exploiter le champ `department` existant dans la table `profiles` :
- Badge secondaire sur les cartes
- Colonne dans la vue table
- Possibilité de filtrer par département

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/admin/UserCard.tsx` | Carte utilisateur visuelle avec indicateurs |
| `src/components/admin/SecurityKpiCards.tsx` | KPIs de sécurité enrichis |
| `src/components/admin/InviteQuickCard.tsx` | Carte d'invitation rapide (placeholder visuel) |

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/admin/UsersPage.tsx` | Intégrer vue carte, toggle, KPIs enrichis, département |

## Détails techniques

### UserCard.tsx

```text
Props :
- user: UserWithProfile (id, full_name, avatar_url, role, disabled, department)
- status: UserStatus (email, email_confirmed_at, last_sign_in_at)
- isCurrentUser: boolean
- onRoleChange, onToggle, onDelete, etc.

Features :
- Avatar avec indicateur de présence (point vert si < 15 min)
- Badge rôle coloré
- Badge département
- Dernière activité formatée intelligemment
- Menu actions (3 points)
```

### SecurityKpiCards.tsx

4 cartes horizontales :
1. **Licences actives** - X utilisateurs actifs
2. **Sessions récentes** - Connectés < 15 min
3. **En attente** - Invitations non confirmées
4. **Administrateurs** - Compteur sécurité

### UsersPage.tsx modifications

1. Ajouter state `viewMode: 'cards' | 'table'`
2. Ajouter toggle dans le header
3. Récupérer `department` dans la query profiles
4. Calculer "sessions récentes" (last_sign_in_at < 15 min)
5. Conditionnel : afficher Grid de UserCard ou Table existante

## Schéma de l'interface finale

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ← Retour    Gouvernance des Accès           [Inviter un membre]   │
│              Gérez les membres et la sécurité                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ 4 Utilisat.  │ │ 2 En ligne   │ │ 1 En attente │ │ 1 Admin    │ │
│  │ sur 10 lic.  │ │ session <15m │ │ expire 48h   │ │ privilégié │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│                                                                     │
│  [🔍 Rechercher...]  [Statut: Tous ▾]  [Rôle: Tous ▾]  [□ ≡]      │
│                                                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │   [SP] ●        │ │   [DJ]          │ │   [NH]          │       │
│  │ SOMET PATRICK   │ │ DJEKE JOSEPH    │ │ NGORAN HERVE    │       │
│  │ Administrateur  │ │ Analyste        │ │ Observateur     │       │
│  │ Dir. Générale   │ │ Stratégie       │ │ Communication   │       │
│  │ Il y a 5 min    │ │ Il y a 2h       │ │ Jamais connecté │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                     │
│  ┌─────────────────┐                                                │
│  │      [+]        │                                                │
│  │   Ajouter un    │                                                │
│  │   collaborateur │                                                │
│  └─────────────────┘                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Labels de rôles enrichis

Mapper les rôles techniques vers des libellés métier :

| Rôle technique | Label actuel | Label proposé |
|----------------|--------------|---------------|
| `admin` | Administrateur | Administrateur |
| `user` | Utilisateur | Analyste |
| `council_user` | Membre du conseil | Décideur |
| `guest` | Invité | Observateur |

## Résultat attendu

1. **Interface plus humaine** - Les utilisateurs sont présentés comme des membres d'équipe
2. **Contexte métier** - Département et rôle visibles immédiatement
3. **Sécurité visible** - Indicateurs de sessions et invitations en attente
4. **Flexibilité** - Toggle entre vue cartes (petites équipes) et table (grandes équipes)
5. **Backwards compatible** - Toutes les actions existantes restent disponibles

