

# Correction du flux de reinitialisation de mot de passe

## Diagnostic

J'ai analyse les logs d'authentification en detail. Le probleme vient de **deux causes combinees** :

### Cause 1 : Le site publie utilise l'ancien code

Les liens de reinitialisation pointent vers `https://ansut-lens.lovable.app` (le site publie). Or, toutes les corrections du systeme d'authentification (suppression des conditions de course, reconstruction de la page de reinitialisation, etc.) sont uniquement dans l'environnement **preview**. Le site publie utilise encore l'ancien code instable.

Les logs d'authentification confirment que toutes les requetes echouees proviennent de `https://ansut-lens.lovable.app` :

```text
referer: https://ansut-lens.lovable.app/auth/reset-password
erreur: "One-time token not found" / "otp_expired"
```

### Cause 2 : Pas de mecanisme de repli en cas de consommation du jeton

Les logs montrent que le jeton OTP est parfois consomme par une requete parallele (double-clic, onglet duplique, scanner de securite email Microsoft) avant que l'utilisateur ne voie le formulaire. La page actuelle ne verifie pas s'il existe deja une session valide quand `verifyOtp` echoue.

```text
09:20:03 - POST /verify - 200 (jeton consomme par IP 48.209.x.x)
09:21:09 - POST /verify - 403 "otp_expired" (tentative utilisateur)
```

## Ce qui sera modifie

| Fichier | Action | Objectif |
|---------|--------|----------|
| `src/pages/ResetPasswordPage.tsx` | **Modifie** | Ajouter un mecanisme de repli : si verifyOtp echoue, verifier s'il existe deja une session valide avant d'afficher l'erreur |

Apres modification, il faudra **publier l'application** pour que le site de production utilise le nouveau code.

## Detail technique

### Amelioration de `processToken()` dans `ResetPasswordPage.tsx`

Le changement est cible sur la gestion d'erreur de `verifyOtp`. Actuellement, si le jeton est invalide, la page affiche directement "Lien expire ou invalide". La correction ajoute une verification : si une session existe malgre l'echec du jeton (parce qu'un processus parallele l'a deja consomme avec succes), le formulaire de mot de passe s'affiche quand meme.

Logique actuelle (simplifiee) :

```text
verifyOtp(token_hash) echoue → afficher erreur
```

Logique corrigee :

```text
verifyOtp(token_hash) echoue → verifier session existante
  → session trouvee → afficher formulaire mot de passe
  → pas de session → afficher erreur avec formulaire de renvoi
```

Cela couvre les scenarios suivants :
- Double-clic sur le lien (le premier onglet consomme le jeton, le deuxieme trouve la session)
- Scanner de securite email (Microsoft Safe Links) qui consomme le jeton en arriere-plan
- Rechargement de la page apres une verification reussie

### Etape suivante obligatoire : publication

Apres la correction du code, l'application devra etre **publiee** pour que le site `ansut-lens.lovable.app` utilise le nouveau systeme d'authentification au complet (la reconstruction de AuthContext, la suppression de RecoveryTokenHandler, et cette nouvelle amelioration).

