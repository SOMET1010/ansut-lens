-- Nettoyer les source_url invalides (marqueurs Perplexity "[1]", "Non spécifié...", numéros nus)
-- pour que l'UI affiche honnêtement le badge "Sans source" au lieu de proposer un lien cassé.
UPDATE public.radar_proximite
SET source_url = NULL
WHERE source_url IS NOT NULL
  AND source_url !~ '^https?://';
