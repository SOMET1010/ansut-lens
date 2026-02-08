

# Indicateurs visuels distinctifs pour les statuts d'activite

## Contexte

Actuellement, la page Gouvernance des Acces affiche trois etats de statut : "Desactive", "En attente" et "Actif". Cependant, un utilisateur qui s'est connecte hier et un utilisateur inactif depuis 3 mois portent le meme badge "Actif". De meme, "Jamais connecte" n'apparait que dans le texte de derniere activite sans traitement visuel distinctif.

## Objectif

Ajouter des indicateurs visuels clairs pour distinguer rapidement :
- Les utilisateurs **jamais connectes** (last_active_at = null, email confirme)
- Les utilisateurs **inactifs depuis longtemps** (derniere activite > 30 jours)
- Les utilisateurs **recemment actifs** (derniere activite < 30 jours)
- Les utilisateurs **en ligne** (activite < 15 min, deja en place)

## Modifications prevues

### 1. UserCard.tsx -- Nouveaux badges de statut et indicateurs visuels

**Badge de statut enrichi (footer de la carte) :**

| Etat | Badge actuel | Nouveau badge |
|------|-------------|---------------|
| Desactive | Gris "Desactive" | Inchange |
| En attente (email non confirme) | Ambre "En attente" | Inchange |
| Jamais connecte (email confirme, last_active_at null) | Vert "Actif" | Bleu-gris avec icone UserX : "Jamais connecte" |
| Inactif > 30 jours | Vert "Actif" | Orange avec icone Clock : "Inactif" + tooltip avec la date |
| Actif < 30 jours | Vert "Actif" | Vert "Actif" + tooltip avec la date precise |
| En ligne | Vert "Actif" | Vert vif "En ligne" avec point pulse |

**Indicateur sur l'avatar :**
- Jamais connecte : petit badge gris barre sur l'avatar (au lieu du point vert de presence)
- Inactif > 30 jours : petit point orange sur l'avatar

**Texte "Derniere activite" :**
- Jamais connecte : affiche en couleur bleu-gris avec style italique
- Inactif > 30 jours : affiche en orange

### 2. UsersPage.tsx -- Vue table mise a jour

La colonne "Statut" et "Derniere activite" de la vue table adoptera la meme logique :
- Badge "Jamais connecte" bleu-gris distinct du badge "En attente"
- Badge "Inactif" orange pour les utilisateurs absents depuis plus de 30 jours
- Colonne derniere activite avec code couleur coherent

### 3. Compteurs KPI enrichis

Ajouter un compteur "Jamais connecte" dans les statistiques `userCounts` pour alimenter un eventuel KPI supplementaire ou enrichir le tooltip existant.

---

## Section technique

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/admin/UserCard.tsx` | Ajout logique de categorisation d'activite, nouveaux badges conditionnels, indicateur avatar |
| `src/pages/admin/UsersPage.tsx` | Meme logique dans la vue table, compteur "neverConnected" |

### Logique de categorisation

Une fonction utilitaire `getActivityCategory` sera ajoutee pour centraliser la logique :

```text
function getActivityCategory(lastActiveAt, isEmailConfirmed, isDisabled):
  si desactive -> 'disabled'
  si email non confirme -> 'pending'
  si lastActiveAt est null -> 'never_connected'
  si lastActiveAt > 30 jours -> 'dormant'
  si lastActiveAt < 15 min -> 'online'
  sinon -> 'active'
```

### Details des badges visuels

```text
never_connected:
  Badge: bg-slate-100 text-slate-500, icone UserX
  Texte: "Jamais connecte"
  Avatar: point gris avec barre
  Tooltip: "Cet utilisateur n'a jamais ouvert de session"

dormant (> 30 jours):
  Badge: bg-orange-100 text-orange-600, icone Clock
  Texte: "Inactif"
  Avatar: point orange
  Tooltip: "Derniere connexion le [date precise]"

active (< 30 jours):
  Badge: bg-emerald-100 text-emerald-700
  Texte: "Actif"
  Tooltip: "Derniere activite : [date]"

online (< 15 min):
  Badge: bg-emerald-100 text-emerald-700, point pulse
  Texte: "En ligne"
```

### Ordre d'execution

```text
1. Ajouter la fonction getActivityCategory dans UserCard.tsx
2. Modifier le rendu des badges et indicateurs dans UserCard.tsx
3. Appliquer la meme logique dans la vue table de UsersPage.tsx
4. Mettre a jour les compteurs userCounts dans UsersPage.tsx
```

