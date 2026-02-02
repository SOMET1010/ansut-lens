
# Activation des APIs officielles des réseaux sociaux

## Objectif

Configurer les tokens d'accès pour Twitter/X, LinkedIn et Facebook afin d'activer la collecte via leurs APIs officielles, en complément du scraping Firecrawl existant.

## Secrets à ajouter

| Secret | API | Utilisation |
|--------|-----|-------------|
| TWITTER_BEARER_TOKEN | Twitter API v2 | Recherche de tweets, timeline, mentions |
| LINKEDIN_ACCESS_TOKEN | LinkedIn Marketing API | Posts d'entreprise, analytics |
| FACEBOOK_PAGE_ACCESS_TOKEN | Facebook Graph API | Posts de page, insights, commentaires |

## Sources concernées

3 sources déjà configurées mais inactives :

| Source | Type | URL | Statut actuel |
|--------|------|-----|---------------|
| Twitter/X ANSUT | twitter | twitter.com/ansut_ci | Inactif |
| LinkedIn ANSUT | linkedin | linkedin.com/company/ansut | Inactif |
| Facebook ANSUT | facebook | facebook.com/ansut.ci | Inactif |

## Étapes d'implémentation

### 1. Ajout des secrets (immédiat)

Utiliser l'outil `add_secret` pour demander les 3 tokens :
- `TWITTER_BEARER_TOKEN` - Obtenu depuis le Twitter Developer Portal
- `LINKEDIN_ACCESS_TOKEN` - Obtenu depuis LinkedIn Developer Portal  
- `FACEBOOK_PAGE_ACCESS_TOKEN` - Obtenu depuis Meta Business Suite

### 2. Extension de la fonction collecte-social

Modifier `supabase/functions/collecte-social/index.ts` pour :
- Détecter les sources de type `twitter`, `linkedin`, `facebook`
- Appeler les APIs officielles avec les tokens configurés
- Conserver le fallback Firecrawl si les tokens ne sont pas configurés

### 3. Activation des sources

Migration SQL pour activer les 3 sources :
```sql
UPDATE sources_media 
SET actif = true 
WHERE type IN ('twitter', 'linkedin', 'facebook');
```

## Section technique

### Structure de la collecte multi-plateformes

```text
collecte-social/
├── Sources web (actuelles)
│   └── Firecrawl scraping → blog, forum, news
└── APIs officielles (à ajouter)
    ├── Twitter API v2 → tweets, mentions
    ├── LinkedIn API → posts entreprise
    └── Facebook Graph API → posts page
```

### Contraintes de plateforme

La contrainte `social_insights_plateforme_check` doit être mise à jour pour accepter les nouveaux types :

```sql
ALTER TABLE social_insights 
DROP CONSTRAINT IF EXISTS social_insights_plateforme_check;

ALTER TABLE social_insights 
ADD CONSTRAINT social_insights_plateforme_check 
CHECK (plateforme IN ('twitter', 'linkedin', 'facebook', 'blog', 'forum', 'news'));
```

### Obtention des tokens

| API | Portail | Prérequis |
|-----|---------|-----------|
| Twitter | developer.twitter.com | App créée, Bearer Token |
| LinkedIn | developer.linkedin.com | App autorisée, OAuth 2.0 |
| Facebook | developers.facebook.com | Page liée, Page Access Token |

### Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `supabase/functions/collecte-social/index.ts` | Ajouter appels API Twitter/LinkedIn/Facebook |
| Migration SQL | Activer les sources + mettre à jour la contrainte |

### Seuil d'alerte social

Conformément à la stratégie définie, le seuil de déclenchement des alertes pour les réseaux sociaux sera de **40** (contre 70 pour les sources standards) pour capturer davantage de signaux faibles.
