-- =============================================
-- Correction RLS pour signaux (tableau radar)
-- =============================================

-- Supprimer l'ancienne policy SELECT restrictive
DROP POLICY IF EXISTS "Authenticated users can view signaux" ON public.signaux;

-- Créer une policy de lecture pour anon + authenticated
CREATE POLICY "Anyone can view signaux"
  ON public.signaux
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================
-- Correction RLS pour mentions (KPIs dashboard)
-- =============================================

-- Supprimer l'ancienne policy SELECT restrictive
DROP POLICY IF EXISTS "Authenticated users can view mentions" ON public.mentions;

-- Créer une policy de lecture pour anon + authenticated
CREATE POLICY "Anyone can view mentions"
  ON public.mentions
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================
-- Correction RLS pour alertes (compteur dashboard)
-- =============================================

-- Supprimer l'ancienne policy SELECT
DROP POLICY IF EXISTS "Users can view own alertes" ON public.alertes;

-- Créer une policy de lecture pour anon + authenticated
-- anon ne voit que les alertes système (user_id IS NULL)
-- authenticated voit ses alertes + les alertes système
CREATE POLICY "Anyone can view alertes"
  ON public.alertes
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING ((auth.uid() = user_id) OR (user_id IS NULL));