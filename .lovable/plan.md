

## Mise à jour des secrets LinkedIn

Les secrets `LINKEDIN_CLIENT_ID` et `LINKEDIN_CLIENT_SECRET` existent déjà dans la plateforme mais semblent invalides (erreur 401 lors des collectes).

### Action
Utiliser l'outil `add_secret` pour demander la saisie sécurisée des deux valeurs :
1. **LINKEDIN_CLIENT_ID** — L'identifiant client de votre application LinkedIn Developer
2. **LINKEDIN_CLIENT_SECRET** — Le secret client associé

Puis relancer une collecte sociale pour vérifier que l'authentification LinkedIn fonctionne.

