

# Ajouter un selecteur de role dans la carte utilisateur

## Constat

Toute la logique backend et frontend est deja en place :
- Edge function `update-user-role` : operationnelle
- Mutation `updateRoleMutation` dans `UsersPage.tsx` : operationnelle  
- Prop `onRoleChange` sur `UserCard` : declaree mais jamais utilisee dans le rendu

Il manque uniquement **l'interface utilisateur** pour declencher le changement de role.

## Solution

Ajouter des options de changement de role dans le menu contextuel (3 points) de chaque `UserCard`.

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/components/admin/UserCard.tsx` | Ajouter un sous-menu "Changer le role" dans le `DropdownMenu` avec les 4 roles disponibles |
| `src/pages/admin/UsersPage.tsx` | Passer la prop `onRoleChange` au composant `UserCard` (vue cartes et vue table) |

## Detail technique

### UserCard.tsx

Dans le `DropdownMenuContent`, ajouter avant le separateur "Desactiver/Reactiver" :

```
Changer le rôle →
  ├─ Administrateur  (masqué si déjà admin)
  ├─ Analyste        (masqué si déjà user)
  ├─ Décideur        (masqué si déjà council_user)
  └─ Observateur     (masqué si déjà guest)
```

Chaque option appelle `onRoleChange(user.id, newRole)`. Le role actuel est indique par une coche et n'est pas cliquable.

### UsersPage.tsx

Passer `onRoleChange={handleRoleChange}` au composant `UserCard` dans la vue cartes. La fonction `handleRoleChange` (ligne 456) existe deja et appelle la mutation.

