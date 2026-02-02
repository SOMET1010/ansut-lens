-- Étendre le type de sources_media pour inclure blog, forum, news
ALTER TABLE sources_media DROP CONSTRAINT IF EXISTS sources_media_type_check;
ALTER TABLE sources_media ADD CONSTRAINT sources_media_type_check 
  CHECK (type IN ('web', 'rss', 'twitter', 'linkedin', 'facebook', 'blog', 'forum', 'news', 'autre'));

-- Insérer les sources alternatives (blogs tech, forums, actualités)
INSERT INTO sources_media (nom, type, url, actif, frequence_scan) VALUES
  ('CIO Mag Afrique', 'blog', 'https://cio-mag.com', true, 'quotidien'),
  ('JeuneAfrique Tech', 'news', 'https://www.jeuneafrique.com/economie-entreprises/tech', true, 'quotidien'),
  ('TIC Magazine CI', 'news', 'https://www.ticmagazine.ci', true, 'quotidien'),
  ('Réseau Télécom', 'blog', 'https://www.reseaux-telecoms.net', true, 'quotidien'),
  ('Africa Tech Summit', 'blog', 'https://africatechsummit.com/blog', true, 'quotidien')
ON CONFLICT DO NOTHING;

-- Désactiver les anciennes sources sociales bloquées par Firecrawl
UPDATE sources_media SET actif = false 
  WHERE type IN ('linkedin', 'twitter', 'facebook');