-- Modifier la contrainte pour ajouter les nouveaux types de sources
ALTER TABLE public.sources_media DROP CONSTRAINT sources_media_type_check;

ALTER TABLE public.sources_media ADD CONSTRAINT sources_media_type_check 
CHECK (type = ANY (ARRAY['web'::text, 'rss'::text, 'twitter'::text, 'linkedin'::text, 'autre'::text, 'institution'::text, 'presse'::text, 'bailleur'::text, 'industrie'::text, 'international'::text]));