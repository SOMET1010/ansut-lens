

# Plan d'integration des APIs officielles Twitter, LinkedIn et Facebook

## Contexte

Le scraping des reseaux sociaux via Firecrawl est bloque pour des raisons de conformite. Ce plan propose d'implementer une integration avec les **APIs officielles** de chaque plateforme pour collecter legalement les donnees sociales.

## Apercu des APIs

| Plateforme | API | Donnees accessibles | Cout |
|------------|-----|---------------------|------|
| Twitter/X | X API v2 | Tweets, mentions, recherche, hashtags | Free tier: 10k tweets/mois |
| LinkedIn | Marketing API | Posts de pages d'entreprise | Gratuit (acces approuve requis) |
| Facebook | Graph API | Posts de pages publiques | Gratuit |

## Architecture proposee

```text
                      +-------------------+
                      | collecte-social   |
                      | (orchestrateur)   |
                      +--------+----------+
                               |
         +---------------------+---------------------+
         |                     |                     |
         v                     v                     v
+----------------+    +----------------+    +----------------+
| collecte-      |    | collecte-      |    | collecte-      |
| twitter        |    | linkedin       |    | facebook       |
| (X API v2)     |    | (Marketing API)|    | (Graph API)    |
+----------------+    +----------------+    +----------------+
         |                     |                     |
         +---------------------+---------------------+
                               |
                               v
                      +-------------------+
                      | social_insights   |
                      | (table unifiee)   |
                      +-------------------+
```

## Changements prevus

### 1. Nouvelle edge function `collecte-twitter`

Utilise l'API X v2 pour:
- Rechercher des tweets contenant les mots-cles de veille
- Collecter les mentions des comptes suivis
- Extraire les hashtags tendance pertinents

Fonctionnalites:
- Authentification OAuth 2.0 Bearer Token
- Gestion du rate limiting (450 requetes/15 min)
- Pagination automatique des resultats
- Extraction des metriques d'engagement reelles (retweets, likes, replies)

### 2. Nouvelle edge function `collecte-linkedin`

Utilise l'API Marketing de LinkedIn pour:
- Recuperer les posts des pages d'entreprise suivies
- Analyser les reactions et commentaires
- Detecter les mentions de l'organisation

Fonctionnalites:
- Authentification OAuth 2.0 avec refresh token
- Collecte des metriques natives (likes, shares, comments)
- Support des Organization URNs

### 3. Nouvelle edge function `collecte-facebook`

Utilise le Graph API v19 pour:
- Lire les posts des pages publiques
- Analyser les reactions et partages
- Rechercher dans les contenus publics

Fonctionnalites:
- Access Token long-lived pour les pages
- Extraction des metriques (reactions, shares, comments)
- Support des Page Access Tokens

### 4. Mise a jour de `collecte-social`

Transformation en orchestrateur:
- Appelle les 3 fonctions specialisees en parallele
- Agrege les resultats
- Continue la collecte web existante (blogs, forums, news)
- Genere les alertes unifiees

### 5. Migration base de donnees

- Reactiver les types `twitter`, `linkedin`, `facebook` dans `sources_media`
- Ajouter des champs optionnels pour les identifiants de plateforme
- Table de configuration des tokens API par plateforme

### 6. Interface de configuration

Nouveau composant dans l'administration:
- Formulaire de saisie des credentials API
- Test de connexion par plateforme
- Gestion des comptes/pages a surveiller
- Historique des quotas d'API utilises

### 7. Mise a jour du widget

Extension de `SocialPulseWidget` pour:
- Afficher les icones officielles des plateformes sociales
- Metriques d'engagement reelles (RT, likes, shares)
- Lien direct vers le post original
- Indicateur de source (API officielle vs web scraping)

---

## Section technique

### Secrets a configurer

Les cles API suivantes devront etre ajoutees via l'outil de secrets:

| Secret | Description |
|--------|-------------|
| `TWITTER_BEARER_TOKEN` | Bearer Token de l'app Twitter Developer |
| `LINKEDIN_CLIENT_ID` | Client ID de l'app LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | Client Secret de l'app LinkedIn |
| `LINKEDIN_ACCESS_TOKEN` | Access Token (genere via OAuth) |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Page Access Token long-lived |

### Edge function Twitter (extrait)

```typescript
const TWITTER_API_BASE = 'https://api.x.com/2';

async function searchTweets(query: string, bearerToken: string) {
  const response = await fetch(
    `${TWITTER_API_BASE}/tweets/search/recent?query=${encodeURIComponent(query)}&tweet.fields=created_at,public_metrics,author_id&max_results=100`,
    {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.status}`);
  }
  
  return response.json();
}
```

### Edge function LinkedIn (extrait)

```typescript
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

async function getOrganizationPosts(orgId: string, accessToken: string) {
  const response = await fetch(
    `${LINKEDIN_API_BASE}/shares?q=owners&owners=urn:li:organization:${orgId}&count=50`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    }
  );
  
  return response.json();
}
```

### Edge function Facebook (extrait)

```typescript
const FACEBOOK_API_BASE = 'https://graph.facebook.com/v19.0';

async function getPagePosts(pageId: string, accessToken: string) {
  const response = await fetch(
    `${FACEBOOK_API_BASE}/${pageId}/posts?fields=id,message,created_time,shares,reactions.summary(true),comments.summary(true)&access_token=${accessToken}`
  );
  
  return response.json();
}
```

### Migration SQL

```sql
-- Reactiver les sources sociales
UPDATE sources_media SET actif = true 
  WHERE type IN ('linkedin', 'twitter', 'facebook');

-- Ajouter les identifiants de plateforme
ALTER TABLE sources_media 
  ADD COLUMN IF NOT EXISTS platform_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_config JSONB DEFAULT '{}';

-- Table de configuration des APIs sociales
CREATE TABLE IF NOT EXISTS social_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plateforme TEXT NOT NULL UNIQUE CHECK (plateforme IN ('twitter', 'linkedin', 'facebook')),
  enabled BOOLEAN DEFAULT false,
  last_sync TIMESTAMPTZ,
  quota_used INTEGER DEFAULT 0,
  quota_limit INTEGER,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enrichir social_insights avec les metriques natives
ALTER TABLE social_insights
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_post_id TEXT,
  ADD COLUMN IF NOT EXISTS is_official_api BOOLEAN DEFAULT false;
```

### Config.toml additions

```toml
[functions.collecte-twitter]
verify_jwt = false

[functions.collecte-linkedin]
verify_jwt = false

[functions.collecte-facebook]
verify_jwt = false
```

## Prerequis utilisateur

Avant l'implementation, l'utilisateur devra:

1. **Twitter/X**: Creer un compte Developer et une app sur developer.twitter.com
2. **LinkedIn**: Demander l'acces a l'API Marketing via LinkedIn Developer
3. **Facebook**: Creer une app Facebook et obtenir un Page Access Token

## Livrables

1. Edge function `collecte-twitter` avec X API v2
2. Edge function `collecte-linkedin` avec Marketing API
3. Edge function `collecte-facebook` avec Graph API
4. Migration de base de donnees pour les nouveaux champs
5. Orchestrateur `collecte-social` mis a jour
6. Interface d'administration pour la configuration API
7. Widget `SocialPulseWidget` enrichi avec metriques reelles
8. Documentation d'onboarding pour chaque API

