

# Intégration des APIs LinkedIn et Twitter/X

## Contexte

Les clés API LinkedIn et Twitter/X sont fournies. Facebook est en attente de verification. La table `social_api_config` existe deja avec les 3 plateformes desactivees. La fonction `collecte-social` actuelle ne fait que du scraping web via Firecrawl.

## Etape 1 : Stocker les secrets

5 secrets a ajouter de maniere securisee :

| Secret | Valeur |
|--------|--------|
| `LINKEDIN_CLIENT_ID` | 78og1qsnauynph |
| `LINKEDIN_CLIENT_SECRET` | WPL_AP1.VFoCRxyFeH8pF8D2.1LAGjA== |
| `TWITTER_CONSUMER_KEY` | wYeyVZGb1LBaC5jKMYEUMaBL8 |
| `TWITTER_CONSUMER_SECRET` | QhIh8EaVW83RCeNe64CsnRE66wAW59ff9BCiMZkQIuUpGyvtkW |
| `TWITTER_BEARER_TOKEN` | Le bearer token fourni |

## Etape 2 : Creer la fonction `collecte-social-api`

Nouvelle edge function dediee aux APIs officielles (separee de `collecte-social` qui reste pour le scraping web).

### Twitter/X (API v2)

- Endpoint : `https://api.x.com/2/tweets/search/recent`
- Authentification : Bearer Token
- Recherche par mots-cles de veille (table `mots_cles_veille`)
- Extraction : tweets, auteurs, metriques d'engagement, hashtags
- Limite : 10 000 tweets/mois (plan Basic)

### LinkedIn (Marketing API)

- Endpoint : `https://api.linkedin.com/v2/`
- Authentification : OAuth 2.0 Client Credentials (client_id + client_secret)
- Recherche de posts d'entreprises/pages suivies
- Note : L'API LinkedIn est plus restrictive, limitee aux pages d'organisation auxquelles l'app a acces

### Logique commune

- Consulter `social_api_config` pour verifier quelles plateformes sont actives
- Verifier les quotas avant chaque appel
- Inserer les resultats dans `social_insights` avec `is_official_api = true`
- Mettre a jour `quota_used` et `last_sync` dans `social_api_config`
- Generer des alertes pour les insights critiques (sentiment < -0.3)

## Etape 3 : Activer les plateformes

Migration SQL pour activer Twitter et LinkedIn dans `social_api_config` :

```sql
UPDATE social_api_config SET enabled = true WHERE plateforme IN ('twitter', 'linkedin');
```

Facebook restera desactive jusqu'a validation de la verification.

## Etape 4 : Interface utilisateur

Le composant `SocialPulseWidget` et le hook `useSocialInsights` supportent deja les plateformes `twitter`, `linkedin`, `facebook`. Aucune modification UI majeure necessaire, les nouveaux insights apparaitront automatiquement dans le radar.

Ajout possible : un bouton "Collecter APIs sociales" a cote du bouton existant "Collecter" pour lancer la fonction `collecte-social-api`.

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| Secrets Lovable Cloud | Ajout de 5 secrets API |
| `supabase/functions/collecte-social-api/index.ts` | Nouveau - collecte via APIs officielles Twitter et LinkedIn |
| Migration SQL | Activer twitter et linkedin dans `social_api_config` |
| `src/hooks/useSocialInsights.ts` | Ajouter mutation pour appeler `collecte-social-api` |
| `src/components/radar/SocialPulseWidget.tsx` | Ajouter bouton de collecte API (optionnel) |

## Points d'attention

- Le Bearer Token Twitter doit etre decode (il contient des `%2F` et `%3D` qui sont des caracteres encodes URL)
- L'API LinkedIn en mode Client Credentials a un acces limite : elle permet principalement de consulter les pages d'organisation, pas de faire des recherches libres
- Les quotas sont geres automatiquement pour eviter les depassements
