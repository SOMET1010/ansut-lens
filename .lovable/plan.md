

# Correction des liens d'invitation -- Acces direct sans intermediaire

## Probleme identifie

Les liens dans les emails passent par le serveur d'authentification (`/auth/v1/verify`), qui dans l'environnement Lovable Cloud redirige automatiquement via un pont d'authentification (`lovable.dev/auth-bridge`) vers l'URL de preview. L'utilisateur arrive donc sur une page de login Lovable au lieu de la page de creation de mot de passe.

Le lien actuel genere :
```text
https://lpkfwxisranmetbtgxrv.supabase.co/auth/v1/verify?token=...&redirect_to=...
```

Ce qui provoque : serveur auth --> auth-bridge --> preview URL --> login Lovable

## Solution

Au lieu d'utiliser le `action_link` (qui passe par le serveur de verification), construire un lien **direct** vers l'application de production avec le `hashed_token`. La page `ResetPasswordPage` gere deja ce format (elle appelle `verifyOtp()` cote client).

Le nouveau lien sera :
```text
https://ansut-lens.lovable.app/auth/reset-password?token_hash=HASH&type=recovery
```

L'utilisateur clique --> arrive directement sur la page de creation de mot de passe --> le token est verifie cote client --> il definit son mot de passe. Pas d'intermediaire, pas de redirection.

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/reset-user-password/index.ts` | Construire le lien avec `hashed_token` au lieu de `action_link` |
| `supabase/functions/generate-password-link/index.ts` | Idem |
| `supabase/functions/invite-user/index.ts` | Idem |

## Detail technique

### 1. `supabase/functions/reset-user-password/index.ts`

Remplacer l'utilisation de `action_link` par la construction d'un lien direct :

```text
// Avant :
const resetLink = linkData?.properties?.action_link;

// Apres :
const hashedToken = linkData?.properties?.hashed_token;
const resetLink = `${PRODUCTION_URL}/auth/reset-password?token_hash=${hashedToken}&type=recovery`;
```

### 2. `supabase/functions/generate-password-link/index.ts`

Meme modification :

```text
// Avant :
const resetLink = linkData.properties.action_link;

// Apres :
const hashedToken = linkData.properties.hashed_token;
const resetLink = `${PRODUCTION_URL}/auth/reset-password?token_hash=${hashedToken}&type=recovery`;
```

### 3. `supabase/functions/invite-user/index.ts`

Meme modification, en tenant compte du type de lien (invite ou recovery) :

```text
// Avant :
const inviteLink = linkData.properties.action_link;

// Apres :
const hashedToken = linkData.properties.hashed_token;
const inviteLink = `${PRODUCTION_URL}/auth/reset-password?token_hash=${hashedToken}&type=${linkType}`;
```

### 4. Verification de `ResetPasswordPage.tsx`

La page gere deja le format `token_hash` + `type` en query params (Cas 2 dans le useEffect). Aucune modification necessaire cote frontend :

```text
// Deja present :
const tokenHash = queryParams.get('token_hash');
if (tokenHash && (type === 'recovery' || type === 'invite')) {
  await supabase.auth.verifyOtp({ token_hash: tokenHash, type: ... });
}
```

## Flux utilisateur apres correction

```text
1. L'utilisateur recoit l'email avec un lien direct
2. Il clique --> arrive sur https://ansut-lens.lovable.app/auth/reset-password?token_hash=...&type=recovery
3. La page verifie le token automatiquement (verifyOtp)
4. Le formulaire de creation de mot de passe s'affiche
5. Il definit son mot de passe et accede a l'application
```

Aucune page intermediaire, aucun formulaire d'email, aucune redirection parasite.

## Apres deploiement

Renvoyer les invitations aux 4 utilisateurs pour qu'ils recoivent les nouveaux liens directs.

