

# Mettre a jour le TWITTER_BEARER_TOKEN

## Contexte

La collecte Twitter echoue avec une erreur `401 Unauthorized`, ce qui signifie que le Bearer Token actuel est invalide ou expire.

## Etapes

### 1. Obtenir un Bearer Token valide

Pour obtenir un nouveau Bearer Token Twitter/X :

1. Aller sur le **portail developpeur X** : https://developer.x.com/en/portal/dashboard
2. Selectionner votre projet/application
3. Aller dans **Keys and Tokens**
4. Dans la section **Bearer Token**, cliquer sur **Regenerate** pour obtenir un nouveau token
5. Copier le token genere

**Important** : Le plan Basic de l'API X (100$/mois) est requis pour acceder a l'endpoint `tweets/search/recent`. Le plan Free ne donne acces qu'a la publication de tweets.

### 2. Mettre a jour le secret dans le projet

Une fois le token copie, je demanderai la mise a jour du secret `TWITTER_BEARER_TOKEN` via l'outil de gestion des secrets.

### 3. Tester la collecte

Apres la mise a jour, lancer manuellement la fonction `collecte-social-api` pour verifier que la collecte Twitter fonctionne.

## Fichiers concernes

Aucune modification de code. Seule une mise a jour du secret `TWITTER_BEARER_TOKEN`.

