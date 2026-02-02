
# Plan d'adaptation : Sources alternatives pour la veille sociale

## Contexte

Firecrawl bloque le scraping des réseaux sociaux (LinkedIn, Twitter, Facebook) conformément aux conditions d'utilisation de ces plateformes. Ce plan propose d'adapter le système pour scraper des **sources alternatives ouvertes** : blogs tech, forums sectoriels et sites d'actualités spécialisés.

## Architecture proposée

```text
+---------------------+     +-------------------+     +------------------+
|   sources_media     | --> | collecte-social   | --> | social_insights  |
| (blog, forum, news) |     | (Firecrawl)       |     | (platforme:      |
|                     |     |                   |     |  blog/forum/news)|
+---------------------+     +-------------------+     +------------------+
                                    |
                                    v
                           +-----------------+
                           | SocialPulseWidget|
                           | (UI renommée en  |
                           | "Veille Web")    |
                           +-----------------+
```

## Changements prévus

### 1. Migration base de données

**Nouvelles sources par défaut** (table `sources_media`) :

| Nom | Type | URL | Catégorie |
|-----|------|-----|-----------|
| CIO Mag Afrique | blog | https://cio-mag.com | Blog tech |
| JeuneAfrique Tech | news | https://www.jeuneafrique.com/economie-entreprises/tech | Actualités |
| TIC Magazine CI | news | https://www.ticmagazine.ci | Actualités locales |
| Réseau Télécom | blog | https://www.reseaux-telecoms.net | Blog télécom |
| Forum Abidjan IT | forum | https://forum.abidjan.net/forumdisplay.php?f=6 | Forum local |
| Africa Tech Summit | blog | https://africatechsummit.com/blog | Blog tech pan-africain |

**Mise à jour du CHECK constraint** sur `sources_media.type` pour ajouter les types `blog`, `forum`, `news`.

### 2. Edge Function `collecte-social`

Modifications majeures :
- Requêter les sources de type `blog`, `forum`, `news` au lieu de `linkedin`, `twitter`, `facebook`
- Adapter le parsing Firecrawl pour extraire les titres, auteurs, dates des articles
- Mapper `plateforme` vers les nouvelles valeurs : `blog`, `forum`, `news`
- Ajuster les scores d'engagement basés sur la longueur du contenu et la richesse sémantique
- Conserver l'analyse de sentiment existante

### 3. Hook `useSocialInsights.ts`

- Étendre le type `SocialInsight.plateforme` pour inclure `blog`, `forum`, `news`
- Adapter les statistiques par type de source

### 4. Widget `SocialPulseWidget.tsx`

Transformations :
- Renommer "Pulse Social" en **"Veille Web"**
- Nouvelles icônes et couleurs :
  - Blog : `Newspaper` (violet)
  - Forum : `MessagesSquare` (orange)
  - News : `Globe` (vert)
- Afficher le nom de la source et l'URL originale
- Conserver les indicateurs de sentiment et criticité

### 5. Types TypeScript

Mettre à jour `src/types/index.ts` si nécessaire pour les nouveaux types de sources.

---

## Section technique

### Migration SQL

```sql
-- Étendre le type de sources_media
ALTER TABLE sources_media DROP CONSTRAINT IF EXISTS sources_media_type_check;
ALTER TABLE sources_media ADD CONSTRAINT sources_media_type_check 
  CHECK (type IN ('web', 'rss', 'twitter', 'linkedin', 'facebook', 'blog', 'forum', 'news', 'autre'));

-- Insérer les sources alternatives
INSERT INTO sources_media (nom, type, url, actif, frequence_scan) VALUES
  ('CIO Mag Afrique', 'blog', 'https://cio-mag.com', true, 'quotidien'),
  ('JeuneAfrique Tech', 'news', 'https://www.jeuneafrique.com/economie-entreprises/tech', true, 'quotidien'),
  ('TIC Magazine CI', 'news', 'https://www.ticmagazine.ci', true, 'quotidien'),
  ('Réseau Télécom', 'blog', 'https://www.reseaux-telecoms.net', true, 'quotidien'),
  ('Africa Tech Summit', 'blog', 'https://africatechsummit.com/blog', true, 'quotidien');

-- Désactiver les anciennes sources sociales bloquées
UPDATE sources_media SET actif = false 
  WHERE type IN ('linkedin', 'twitter', 'facebook');
```

### Modifications Edge Function

```typescript
// Nouveaux types de plateformes
type Plateforme = 'blog' | 'forum' | 'news';

// Requête adaptée
const { data: sources } = await supabase
  .from('sources_media')
  .select('id, nom, type, url')
  .in('type', ['blog', 'forum', 'news'])
  .eq('actif', true);

// Extraction adaptée pour articles/posts de blog
function extractInsightsFromContent(
  content: string,
  metadata: { title?: string; sourceURL?: string },
  sourceId: string,
  plateforme: Plateforme,
  keywords: string[]
): SocialInsight[]
```

### Configuration UI

```typescript
const PLATFORM_CONFIG = {
  blog: {
    icon: Newspaper,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    label: 'Blogs',
  },
  forum: {
    icon: MessagesSquare,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    label: 'Forums',
  },
  news: {
    icon: Globe,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    label: 'Actualités',
  },
};
```

## Livrables

1. Migration SQL pour ajouter les sources alternatives
2. Edge function `collecte-social` adaptée
3. Hook `useSocialInsights` mis à jour
4. Widget `SocialPulseWidget` renommé "Veille Web" avec nouvelles icônes
5. Test de collecte sur les nouvelles sources
