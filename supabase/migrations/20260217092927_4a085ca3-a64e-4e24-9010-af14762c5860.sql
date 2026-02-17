
-- Fix actualites table: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view actualites" ON public.actualites;
CREATE POLICY "Authenticated users can view actualites" 
  ON public.actualites 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Fix signaux table: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view signaux" ON public.signaux;
CREATE POLICY "Authenticated users can view signaux" 
  ON public.signaux 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Fix mentions table: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view mentions" ON public.mentions;
CREATE POLICY "Authenticated users can view mentions" 
  ON public.mentions 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Fix alertes table: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view alertes" ON public.alertes;
CREATE POLICY "Users can view own and system alertes" 
  ON public.alertes 
  FOR SELECT 
  TO authenticated 
  USING ((auth.uid() = user_id) OR (user_id IS NULL));
