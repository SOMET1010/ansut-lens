
# Suivi des Invitations en Temps Reel

## Ce qui sera ajoute

Un nouveau panneau "Suivi des invitations" sur la page de gestion des utilisateurs, affichant une timeline visuelle pour chaque utilisateur invite. L'administrateur pourra voir d'un coup d'oeil ou en est chaque personne dans le processus d'activation.

## Fonctionnement

Chaque utilisateur invite aura une ligne avec 4 etapes visuelles :

```text
[1. Invite]  -->  [2. Lien clique]  -->  [3. MDP defini]  -->  [4. Premiere connexion]
   Envoye          Email confirme        password_set_at        last_active_at
```

- Etape 1 (Invite) : date de la premiere invitation (depuis `admin_audit_logs`)
- Etape 2 (Lien clique) : l'email est confirme (`email_confirmed_at` non null)
- Etape 3 (MDP defini) : le mot de passe a ete cree (`password_set_at` dans `profiles`)
- Etape 4 (Premiere connexion) : l'utilisateur s'est connecte (`last_active_at` dans `profiles`)

Le panneau sera affiche sous les KPIs existants, dans une carte pliable (Collapsible) pour ne pas encombrer l'interface.

## Ce qui sera cree/modifie

| Fichier | Action |
|---------|--------|
| `src/components/admin/InvitationTracker.tsx` | **Nouveau** -- Composant du panneau de suivi |
| `src/pages/admin/UsersPage.tsx` | **Modifie** -- Integrer le panneau sous les KPIs |

Aucune modification de base de donnees ni de backend necessaire : toutes les donnees existent deja.

## Detail technique

### 1. Nouveau composant `InvitationTracker.tsx`

Ce composant recevra en props :
- La liste des utilisateurs avec profils
- Le statut de chaque utilisateur (depuis `list-users-status`)
- Les logs d'audit filtres sur les actions d'invitation

Il affichera :
- Un titre avec un compteur (ex: "3 invitations en cours")
- Pour chaque utilisateur non encore actif, une ligne avec :
  - Avatar et nom
  - Un stepper horizontal a 4 etapes avec indicateurs colores (vert = fait, ambre = en cours, gris = a venir)
  - La date de la derniere action (derniere invitation envoyee)
  - Un bouton "Renvoyer" si l'utilisateur est bloque a une etape
- Le tout enveloppe dans un Collapsible ouvert par defaut s'il y a des invitations en cours

Le composant utilisera une requete `useQuery` vers `admin_audit_logs` pour recuperer l'historique des invitations :
```text
SELECT target_user_id, action, created_at, details
FROM admin_audit_logs
WHERE action IN ('user_invited', 'user_invitation_resent')
ORDER BY created_at DESC
```

### 2. Modifications de `UsersPage.tsx`

- Importer le nouveau composant `InvitationTracker`
- L'inserer entre les KPIs (`SecurityKpiCards`) et la barre de filtres
- Passer les donnees necessaires : `users`, `usersStatus`, et les callbacks `onResendInvite`

### Structure visuelle du panneau

Le panneau sera structure ainsi :

```text
+----------------------------------------------------------+
| > Suivi des invitations (3 en cours)                     |
+----------------------------------------------------------+
| Bernard AKOUN       [*]---[*]---[ ]---[ ]   il y a 4h   |
|                     Invite Lien  MDP  Acces  [Renvoyer]  |
|                                                          |
| SARRAH COULIBALY    [*]---[ ]---[ ]---[ ]   il y a 3h   |
|                     Invite Lien  MDP  Acces  [Renvoyer]  |
|                                                          |
| TOUAN ARNOLD        [*]---[ ]---[ ]---[ ]   il y a 4h   |
|                     Invite Lien  MDP  Acces  [Renvoyer]  |
+----------------------------------------------------------+
```

Legende des indicateurs :
- [*] vert = etape completee
- [*] ambre/pulse = etape en cours (derniere atteinte)
- [ ] gris = etape pas encore atteinte

Les utilisateurs ayant complete toutes les etapes (actifs) ne seront pas affiches dans ce panneau, car le suivi n'est pertinent que pour les invitations en cours.
