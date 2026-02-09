

# Debloquer le compte d'AMONKOU YVES

## Situation actuelle

AMONKOU YVES (`amonkou.nguessan@ansut.ci`) est dans une boucle :
- Il recoit un lien de reinitialisation
- Le scanner de securite email Microsoft (IP 48.209.x.x) consomme le jeton avant lui
- Il voit "Lien expire ou invalide"
- L'admin lui renvoie un nouveau lien, et le cycle recommence
- Resultat : `password_set_at` est toujours `null` malgre plusieurs tentatives

Son compte est fonctionnel (email confirme, connexions enregistrees via recovery) mais il n'a jamais pu definir un mot de passe permanent.

## Plan d'action

### Etape 1 : Publier l'application (action utilisateur)

C'est l'etape **obligatoire**. Toutes les corrections suivantes sont deja dans le code preview mais pas encore en production :
- Reconstruction du systeme d'authentification (AuthContext, suppression de RecoveryTokenHandler)
- Mecanisme de fallback session (si le jeton est consomme par un scanner, la page detecte la session existante et affiche le formulaire quand meme)

Sans publication, le site de production continue d'utiliser l'ancien code defaillant.

### Etape 2 : Envoyer un unique lien de reinitialisation

Apres publication, envoyer **un seul** email de reinitialisation a `amonkou.nguessan@ansut.ci`. Avec le nouveau code :
- Si le scanner Microsoft consomme le jeton en arriere-plan, la session sera creee
- Quand AMONKOU clique sur le lien, le fallback detectera la session et affichera le formulaire de mot de passe
- Il pourra enfin definir son mot de passe permanent

### Etape 3 : Verifier le resultat

Confirmer que `password_set_at` n'est plus `null` apres que l'utilisateur a defini son mot de passe.

## Aucune modification de code necessaire

Le correctif est deja en place dans le code preview. La seule action requise est la **publication**.

