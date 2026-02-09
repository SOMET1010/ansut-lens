
# Correction definitive : bouton de confirmation anti-scanner

## Le vrai probleme

Le mecanisme de fallback (`getSession()` apres echec de `verifyOtp`) ne resout pas le probleme des scanners email car :

1. Le scanner Microsoft charge la page `reset-password?token_hash=xxx`
2. Le JavaScript s'execute automatiquement et appelle `verifyOtp()`
3. Le jeton est consomme, une session est creee **dans le contexte du scanner**
4. Quand l'utilisateur ouvre le lien, `verifyOtp()` echoue ET `getSession()` retourne `null` (la session est dans le localStorage du scanner, pas du navigateur de l'utilisateur)

## Solution

Ajouter une **etape de confirmation manuelle** avant d'appeler `verifyOtp()`. Les scanners email chargent les pages mais ne cliquent jamais sur les boutons. C'est la methode standard recommandee pour contrer ce probleme.

### Flux actuel

```text
Page chargee → verifyOtp() automatique → echec (scanner a deja consomme le jeton) → erreur
```

### Nouveau flux

```text
Page chargee → detection du token_hash dans l'URL → affichage d'un ecran "Cliquez pour continuer"
→ utilisateur clique → verifyOtp() → succes → formulaire de mot de passe
```

Le scanner chargera la page mais verra juste un bouton et ne cliquera pas dessus. Le jeton restera intact pour l'utilisateur.

## Fichier modifie

| Fichier | Action |
|---------|--------|
| `src/pages/ResetPasswordPage.tsx` | Ajouter un etat `awaitingClick` qui affiche un ecran intermediaire avec un bouton "Continuer" avant d'appeler `verifyOtp()` |

## Detail technique

### Changements dans `processToken()`

Au lieu d'appeler `verifyOtp()` immediatement quand un `token_hash` est detecte, la fonction stocke le token et affiche un ecran intermediaire :

```text
Si token_hash present :
  → sauvegarder token_hash et type dans des refs
  → mettre awaitingClick = true
  → afficher ecran avec bouton "Continuer vers la reinitialisation"

Quand l'utilisateur clique :
  → appeler verifyOtp(token_hash)
  → si succes → afficher formulaire mot de passe
  → si echec → afficher ecran erreur avec option de renvoi
```

Le Case 1 (hash-based tokens avec `access_token` + `refresh_token`) reste inchange car ce format n'est pas affecte par les scanners (les tokens sont dans le fragment hash, invisible pour les requetes serveur).

### Interface de l'ecran intermediaire

Un ecran simple et rassurant avec :
- Le logo ANSUT
- Un message "Presque termine !" 
- Un texte explicatif : "Cliquez sur le bouton ci-dessous pour acceder a la configuration de votre mot de passe"
- Un bouton principal "Continuer"
- Un indicateur de securite (icone ShieldCheck)

### Publication necessaire

Apres modification, l'application devra etre publiee pour que le correctif soit actif sur le site de production. Ensuite, un seul lien de reinitialisation devra etre envoye a AMONKOU YVES.
