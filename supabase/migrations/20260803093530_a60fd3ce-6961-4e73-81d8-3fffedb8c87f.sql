-- 1. search_path
CREATE OR REPLACE FUNCTION public.check_knowledge_evidence_cible()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
BEGIN
  IF NEW.cible_type = 'entity' THEN
    IF NOT EXISTS (SELECT 1 FROM public.strategic_entities WHERE id = NEW.cible_id) THEN
      RAISE EXCEPTION 'knowledge_evidence : entité cible % introuvable', NEW.cible_id;
    END IF;
  ELSIF NEW.cible_type = 'relation' THEN
    IF NOT EXISTS (SELECT 1 FROM public.strategic_relations WHERE id = NEW.cible_id) THEN
      RAISE EXCEPTION 'knowledge_evidence : relation cible % introuvable', NEW.cible_id;
    END IF;
  ELSIF NEW.cible_type = 'indicator' THEN
    IF NOT EXISTS (SELECT 1 FROM public.strategic_indicators WHERE id = NEW.cible_id) THEN
      RAISE EXCEPTION 'knowledge_evidence : indicateur cible % introuvable', NEW.cible_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Revoke EXECUTE on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_social_api_credentials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_knowledge_evidence_cible() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_cron_jobs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_cron_history(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_cron_job(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_cron_schedule(bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_cron_manager() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cron_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_cron_history(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_cron_job(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_cron_schedule(bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_cron_manager() TO service_role;

-- 3. Storage: no anonymous listing
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Authenticated can view avatars" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Anyone can view newsletter images" ON storage.objects;
CREATE POLICY "Authenticated can view newsletter images" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'newsletter-images');

-- 4. profiles PII
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- 5. audit_consultations spoofing
DROP POLICY IF EXISTS "System can create audits" ON public.audit_consultations;
CREATE POLICY "Users can create own audits" ON public.audit_consultations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6. presence_digitale_recommandations update
DROP POLICY IF EXISTS "Users can mark recommandations as viewed" ON public.presence_digitale_recommandations;
CREATE POLICY "Admins can update recommandations" ON public.presence_digitale_recommandations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. social_insights update ownership
DROP POLICY IF EXISTS "Authenticated users can update social insights" ON public.social_insights;
CREATE POLICY "Admins can update social insights" ON public.social_insights
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Unauthenticated writes on internal tables
DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Service can insert audit logs" ON public.admin_audit_logs
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert vip_alertes" ON public.vip_alertes;
CREATE POLICY "Service can insert vip_alertes" ON public.vip_alertes
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert radar_proximite" ON public.radar_proximite;
CREATE POLICY "Service can insert radar_proximite" ON public.radar_proximite
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert echo_metrics" ON public.echo_metrics;
CREATE POLICY "Service can insert echo_metrics" ON public.echo_metrics
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert part_de_voix" ON public.part_de_voix;
CREATE POLICY "Service can insert part_de_voix" ON public.part_de_voix
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert analyses_visuelles" ON public.analyses_visuelles;
CREATE POLICY "Service can insert analyses_visuelles" ON public.analyses_visuelles
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert publications_inst" ON public.publications_institutionnelles;
CREATE POLICY "Service can insert publications_inst" ON public.publications_institutionnelles
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert collectes_log" ON public.collectes_log;
CREATE POLICY "Service can insert collectes_log" ON public.collectes_log
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "service_insert_sms_logs" ON public.sms_logs;
CREATE POLICY "Service can insert sms_logs" ON public.sms_logs
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert flux actualites" ON public.flux_actualites;
CREATE POLICY "Service can insert flux actualites" ON public.flux_actualites
  FOR INSERT TO service_role WITH CHECK (true);