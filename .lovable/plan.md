

# Corrections du flux de reinitialisation de mot de passe

## Problemes identifies

### 1. Probleme CRITIQUE : fonction backend non accessible sans authentification
La fonction `reset-user-password` n'est pas enregistree dans le fichier de configuration backend avec `verify_jwt = false`. Par defaut, toute requete sans jeton d'authentification est rejetee. Or, un utilisateur qui a oublie son mot de passe n'est PAS connecte -- il ne peut donc pas appeler cette fonction. **C'est la cause principale du blocage signale ("ca ne passe pas").**

### 2. Les liens d'invitation ne sont pas interceptes
Le composant `RecoveryTokenHandler` ne detecte que `type=recovery` dans les liens. Les utilisateurs invites arrivent avec `type=invite`, qui n'est pas traite -- ils ne sont pas rediriges vers la page de definition de mot de passe.

### 3. Conflit entre deux ecouteurs d'evenements auth
`AuthContext` et `RecoveryTokenHandler` ecoutent tous les deux les changements d'etat d'authentification. Quand un lien de recovery est clique, il y a une course : `AuthContext` peut etablir la session (et donc rendre l'utilisateur "connecte") avant que `RecoveryTokenHandler` ne puisse rediriger vers la page de reinitialisation.

### 4. Renvoi d'email a Sarrah Coulibaly
Un des 4 emails de recovery envoyes precedemment a ete bloque par la limite de debit de Resend (erreur 429). Il faudra renvoyer le lien.

---

## Corrections prevues

### Correction 1 : Ajouter `reset-user-password` dans la configuration
Ajouter l'entree `[functions.reset-user-password]` avec `verify_jwt = false` dans `supabase/config.toml`. Cela permettra aux utilisateurs non connectes d'appeler la fonction depuis la page de connexion.

### Correction 2 : Gerer `type=invite` dans RecoveryTokenHandler
Modifier `RecoveryTokenHandler.tsx` pour detecter aussi `type=invite` dans le fragment hash de l'URL, et rediriger vers `/auth/reset-password` dans ce cas.

### Correction 3 : Eviter la course entre AuthContext et RecoveryTokenHandler
Dans `AuthContext.tsx`, verifier si l'evenement recu est `PASSWORD_RECOVERY` et, dans ce cas, ne pas declencher la logique de chargement de role classique qui pourrait entrer en conflit avec la redirection du RecoveryTokenHandler.

### Correction 4 : Renvoyer l'email a Sarrah Coulibaly
Appeler la fonction `reset-user-password` pour `sarrah.coulibaly@ansut.ci` afin qu'elle recoive un nouveau lien.

---

## Section technique

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/config.toml` | Ajouter `[functions.reset-user-password]` avec `verify_jwt = false` |
| `src/components/auth/RecoveryTokenHandler.tsx` | Ajouter detection de `type=invite` en plus de `type=recovery` |
| `src/contexts/AuthContext.tsx` | Ignorer `PASSWORD_RECOVERY` pour eviter les conflits de redirection |

### Detail des changements

**`supabase/config.toml`** -- ajouter :
```text
[functions.reset-user-password]
verify_jwt = false
```

**`RecoveryTokenHandler.tsx`** -- ligne 22, remplacer :
```text
if (type === 'recovery' && ...)
```
par :
```text
if ((type === 'recovery' || type === 'invite') && ...)
```

**`AuthContext.tsx`** -- dans le listener `onAuthStateChange`, ajouter une condition pour ne pas traiter normalement l'evenement `PASSWORD_RECOVERY` (laisser le `RecoveryTokenHandler` gerer la redirection sans interference).

### Ordre d'execution

```text
1. Modifier supabase/config.toml (ajouter reset-user-password)
2. Modifier RecoveryTokenHandler.tsx (ajouter type=invite)
3. Modifier AuthContext.tsx (ignorer PASSWORD_RECOVERY)
4. Deployer et tester
5. Renvoyer le lien a sarrah.coulibaly@ansut.ci
```

