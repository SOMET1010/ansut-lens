CREATE TABLE public.perplexity_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash text NOT NULL,
  query_text text NOT NULL,
  model text NOT NULL,
  content text,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  hits integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX perplexity_cache_hash_idx ON public.perplexity_cache (query_hash);
CREATE INDEX perplexity_cache_expires_idx ON public.perplexity_cache (expires_at);

GRANT SELECT ON public.perplexity_cache TO authenticated;
GRANT ALL ON public.perplexity_cache TO service_role;

ALTER TABLE public.perplexity_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read perplexity cache"
ON public.perplexity_cache FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_perplexity_cache_updated_at
BEFORE UPDATE ON public.perplexity_cache
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();