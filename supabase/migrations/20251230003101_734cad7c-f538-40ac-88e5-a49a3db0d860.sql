-- S'assurer que RLS est activé
ALTER TABLE public.actualites ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies restrictives
DROP POLICY IF EXISTS "Authenticated users can view actualites" ON public.actualites;
DROP POLICY IF EXISTS "Anyone can view actualites" ON public.actualites;
DROP POLICY IF EXISTS "Admins can manage actualites" ON public.actualites;

-- Créer une policy de lecture pour anon + authenticated
CREATE POLICY "Anyone can view actualites"
  ON public.actualites
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Créer une policy admin pour la gestion complète
CREATE POLICY "Admins can manage actualites"
  ON public.actualites
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));