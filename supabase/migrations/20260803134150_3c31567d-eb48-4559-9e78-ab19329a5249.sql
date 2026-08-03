ALTER FUNCTION public.touch_editorial_qualifications() SET search_path = public;
ALTER FUNCTION public.touch_social_connections() SET search_path = public;

DROP POLICY IF EXISTS "Users can view own and system alertes" ON public.alertes;
CREATE POLICY "Users can view own alertes"
ON public.alertes FOR SELECT TO authenticated
USING (auth.uid() = user_id OR (user_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "System can create alertes" ON public.alertes;
CREATE POLICY "Admins can create alertes"
ON public.alertes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role can create alertes"
ON public.alertes FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can create matinale jobs" ON public.matinale_jobs;
CREATE POLICY "Users can create own matinale jobs"
ON public.matinale_jobs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated users can insert manual insights" ON public.social_insights;
CREATE POLICY "Admins can insert manual insights"
ON public.social_insights FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));