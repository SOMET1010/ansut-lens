

# Correction des URLs de redirection -- liens d'invitation inaccessibles

## Probleme

Quand un administrateur envoie une invitation depuis l'environnement de preview, l'URL de redirection dans les emails pointe vers `https://id-preview--...lovable.app` qui necessite un compte Lovable pour etre accessible. Les utilisateurs invites voient donc la page de login Lovable au lieu de la page de definition de mot de passe.

## Cause racine

`window.location.origin` dans le frontend retourne l'URL de preview quand l'admin travaille depuis cet environnement. Cette URL est transmise aux fonctions backend qui l'utilisent telle quelle pour generer les liens dans les emails.

## Solution

Remplacer toutes les utilisations dynamiques de `window.location.origin` pour les liens d'invitation/reinitialisation par l'URL publiee fixe (`https://ansut-lens.lovable.app`). Les fonctions backend seront egalement securisees pour forcer l'URL de production.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/admin/UsersPage.tsx` | Remplacer `window.location.origin` par l'URL publiee pour les 2 appels (invite + password link) |
| `supabase/functions/reset-user-password/index.ts` | Forcer l'URL de production au lieu de `req.headers.get("origin")` |
| `supabase/functions/generate-password-link/index.ts` | Ignorer le `redirectUrl` du frontend et forcer l'URL de production |
| `supabase/functions/invite-user/index.ts` | Deja corrige avec `PRODUCTION_URL`, mais ignorer le `redirectUrl` du frontend s'il contient "preview" |

## Detail des modifications

### 1. `src/pages/admin/UsersPage.tsx`

Ajouter une constante en haut du composant :

```text
const PUBLISHED_URL = "https://ansut-lens.lovable.app";
```

Remplacer les 2 occurrences de `window.location.origin` :

- Ligne 258 : `redirectUrl: \`${PUBLISHED_URL}/auth/reset-password\``
- Ligne 416 : `redirectUrl: \`${PUBLISHED_URL}/auth/reset-password\``

### 2. `supabase/functions/reset-user-password/index.ts`

Remplacer la ligne 38 :

```text
// Avant:
const redirectUrl = `${req.headers.get("origin") || "https://ansut-lens.lovable.app"}/auth/reset-password`;

// Apres:
const PRODUCTION_URL = "https://ansut-lens.lovable.app";
const redirectUrl = `${PRODUCTION_URL}/auth/reset-password`;
```

### 3. `supabase/functions/generate-password-link/index.ts`

Forcer l'URL de production cote serveur, ignorer le `redirectUrl` du client :

```text
// Avant:
const { userId, redirectUrl }: RequestBody = await req.json();

// Apres:
const { userId }: RequestBody = await req.json();
const PRODUCTION_URL = "https://ansut-lens.lovable.app";
const redirectUrl = `${PRODUCTION_URL}/auth/reset-password`;
```

### 4. `supabase/functions/invite-user/index.ts`

Ajouter une protection contre les URLs de preview dans le `redirectUrl` recu du frontend :

```text
// Avant:
const finalRedirectUrl = redirectUrl || `${PRODUCTION_URL}/auth/reset-password`;

// Apres:
const isPreviewUrl = redirectUrl && (redirectUrl.includes('id-preview--') || redirectUrl.includes('lovableproject.com'));
const finalRedirectUrl = (!redirectUrl || isPreviewUrl) ? `${PRODUCTION_URL}/auth/reset-password` : redirectUrl;
```

### 5. Renvoyer les invitations

Apres deploiement des corrections, renvoyer les invitations aux 4 utilisateurs (Bernard, Amonkou, Arnold, Sarrah) pour qu'ils recoivent des liens fonctionnels pointant vers `https://ansut-lens.lovable.app/auth/reset-password`.

## Ordre d'execution

```text
1. Modifier UsersPage.tsx -- utiliser l'URL publiee
2. Modifier reset-user-password -- forcer URL de production
3. Modifier generate-password-link -- forcer URL de production
4. Modifier invite-user -- proteger contre les URLs de preview
5. Deployer les fonctions backend
6. Renvoyer les invitations aux 4 utilisateurs
```

