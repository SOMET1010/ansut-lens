-- Create flux_veille table for user-defined monitoring feeds
CREATE TABLE public.flux_veille (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  mots_cles TEXT[] DEFAULT '{}'::text[],
  categories_ids UUID[] DEFAULT '{}'::uuid[],
  quadrants TEXT[] DEFAULT '{}'::text[],
  importance_min INTEGER DEFAULT 0,
  alerte_email BOOLEAN DEFAULT false,
  alerte_push BOOLEAN DEFAULT true,
  frequence_digest TEXT DEFAULT 'instantane',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flux_actualites junction table
CREATE TABLE public.flux_actualites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flux_id UUID NOT NULL REFERENCES public.flux_veille(id) ON DELETE CASCADE,
  actualite_id UUID NOT NULL REFERENCES public.actualites(id) ON DELETE CASCADE,
  score_match INTEGER DEFAULT 0,
  notifie BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(flux_id, actualite_id)
);

-- Enable RLS
ALTER TABLE public.flux_veille ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flux_actualites ENABLE ROW LEVEL SECURITY;

-- RLS policies for flux_veille
CREATE POLICY "Users can manage own flux"
ON public.flux_veille
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for flux_actualites
CREATE POLICY "Users can view own flux actualites"
ON public.flux_actualites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.flux_veille
    WHERE flux_veille.id = flux_actualites.flux_id
    AND flux_veille.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert flux actualites"
ON public.flux_actualites
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own flux actualites"
ON public.flux_actualites
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.flux_veille
    WHERE flux_veille.id = flux_actualites.flux_id
    AND flux_veille.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_flux_veille_updated_at
BEFORE UPDATE ON public.flux_veille
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for flux_actualites
ALTER PUBLICATION supabase_realtime ADD TABLE public.flux_actualites;