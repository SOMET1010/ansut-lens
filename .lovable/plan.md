

# Correction du flux d'authentification -- les utilisateurs ne peuvent pas se connecter

## Diagnostic

L'analyse des logs d'authentification revele le scenario suivant :

1. **Bernard, Amonkou, Arnold et Sarrah** ont tous clique sur leurs liens de reinitialisation (confirme par les logs `/verify` a 21:51:14-21:51:20 et 21:59:52)
2. Le clic a declenche un **login implicite** qui a mis a jour `last_active_at` dans la table `profiles`, les faisant apparaitre "En ligne" dans l'interface
3. **Mais ils n'ont jamais complete la definition de leur mot de passe** -- ils ont probablement ete perdus sur la page de reinitialisation ou l'ont fermee
4. Quand ils tentent de se connecter ensuite avec email/mot de passe → **"Invalid login credentials"** (log a 21:51:07)
5. Seul **Patrick Somet** a un vrai login par mot de passe (`grant_type: refresh_token`)

## Problemes identifies

### Probleme 1 : Faux positif `last_active_at`
Le clic sur un lien de recuperation declenche un evenement `SIGNED_IN` (login implicite) qui met a jour `last_active_at`. Le filtre actuel dans `AuthContext` n'exclut que l'evenement `PASSWORD_RECOVERY`, pas le `SIGNED_IN` provenant d'un lien de recuperation/invitation.

### Probleme 2 : Page de reinitialisation potentiellement confuse
Les utilisateurs semblent cliquer le lien, arriver sur la page de reinitialisation, mais ne pas completer la saisie du nouveau mot de passe. Le formulaire manque peut-etre de guidage visuel pour les nouveaux utilisateurs.

### Probleme 3 : Pas de suivi de la completion du mot de passe
Aucun mecanisme ne permet de distinguer un utilisateur qui a **clique le lien** d'un utilisateur qui a **reellement defini son mot de passe**.

## Plan de correction

### 1. Corriger le tracking `last_active_at` dans AuthContext

Modifier `src/contexts/AuthContext.tsx` pour ne mettre a jour `last_active_at` que lors de vrais logins par mot de passe, en excluant les logins implicites provenant de liens de recuperation/invitation.

La verification se fera en testant si le `amr` (Authentication Methods Reference) contient `password` comme facteur, ou en verifiant que le type d'evenement n'est pas un login implicite via recovery.

### 2. Ajouter un champ `password_set_at` dans profiles

Creer une migration pour ajouter une colonne `password_set_at` (timestamp nullable) dans la table `profiles`. Ce champ sera mis a jour uniquement quand l'utilisateur complete avec succes la definition/reinitialisation de son mot de passe sur `ResetPasswordPage`.

### 3. Ameliorer la page ResetPasswordPage

- Ajouter un **message d'accueil clair** pour les nouveaux utilisateurs : "Bienvenue sur ANSUT RADAR. Definissez votre mot de passe pour activer votre compte."
- Ajouter des **indicateurs de force** du mot de passe
- Afficher un **stepper visuel** (Etape 1/2 : Definir le mot de passe → Etape 2/2 : Acces a l'application)
- Mettre a jour `password_set_at` dans profiles apres le succes

### 4. Mettre a jour les indicateurs visuels

Modifier la logique `getActivityCategory` pour utiliser `password_set_at` :
- Si `password_set_at` est null et `email_confirmed_at` existe → "Lien clique, mot de passe non defini"
- Cela donne un statut plus precis que le simple "Jamais connecte"

### 5. Reinitialiser `last_active_at` pour les utilisateurs sans mot de passe

Corriger les donnees existantes : remettre a `null` le `last_active_at` des utilisateurs qui n'ont fait que cliquer un lien sans definir de mot de passe.

---

## Section technique

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/contexts/AuthContext.tsx` | Filtrer les SIGNED_IN implicites (recovery/invite) du tracking last_active_at |
| `src/pages/ResetPasswordPage.tsx` | Ameliorer l'UX, ajouter stepper, mettre a jour password_set_at |
| `src/utils/activity-status.ts` | Integrer password_set_at dans la categorisation |
| `src/components/admin/UserCard.tsx` | Nouveau badge "Lien clique" distinct |
| `src/pages/admin/UsersPage.tsx` | Nouveau compteur KPI "Mot de passe non defini" |
| Migration SQL | Ajout colonne `password_set_at` + correction donnees existantes |

### Migration SQL

```text
-- Ajouter le champ password_set_at
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

-- Corriger les faux positifs : remettre last_active_at a null
-- pour les utilisateurs qui n'ont jamais eu de vrai login par mot de passe
-- (tous sauf Patrick Somet qui a un vrai login)
UPDATE profiles 
SET last_active_at = NULL 
WHERE id != '266e47a1-70c7-48af-8f6b-2a52527dad9a'
AND password_set_at IS NULL;

-- Marquer Patrick comme ayant defini son mot de passe
UPDATE profiles 
SET password_set_at = last_active_at 
WHERE id = '266e47a1-70c7-48af-8f6b-2a52527dad9a';
```

### Modification AuthContext -- filtrage des logins implicites

```text
onAuthStateChange:
  si event = PASSWORD_RECOVERY → ignorer tracking
  si event = SIGNED_IN:
    verifier session.user.app_metadata.provider
    verifier si la session vient d'un token de recovery (amr claim)
    si login implicite (recovery/invite) → ne PAS mettre a jour last_active_at
    si login par mot de passe → mettre a jour last_active_at
```

### Nouvelle categorisation d'activite

```text
getActivityCategory(lastActiveAt, isEmailConfirmed, isDisabled, passwordSetAt):
  si desactive → 'disabled'
  si email non confirme → 'pending'
  si passwordSetAt est null → 'password_not_set' (NOUVEAU)
  si lastActiveAt est null → 'never_connected'
  si lastActiveAt > 30 jours → 'dormant'
  si lastActiveAt < 15 min → 'online'
  sinon → 'active'
```

### Nouveau badge visuel `password_not_set`

```text
password_not_set:
  Badge: bg-rose-100 text-rose-600, icone KeyRound
  Texte: "Mot de passe non defini"
  Avatar: point rouge
  Tooltip: "L'utilisateur a clique le lien mais n'a pas encore defini son mot de passe"
  Action rapide: bouton "Renvoyer le lien" visible
```

### Ordre d'execution

```text
1. Migration SQL : ajout password_set_at + correction donnees
2. Modifier AuthContext : filtrer logins implicites
3. Modifier ResetPasswordPage : ameliorer UX + mettre a jour password_set_at
4. Modifier activity-status.ts : ajouter categorie password_not_set
5. Modifier UserCard.tsx : nouveau badge password_not_set
6. Modifier UsersPage.tsx : nouveau compteur + vue table
7. Modifier list-users-status : inclure password_set_at
```

