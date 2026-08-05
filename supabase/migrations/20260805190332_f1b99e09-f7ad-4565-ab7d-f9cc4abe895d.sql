
DROP POLICY IF EXISTS "Users can log own admin actions" ON public.admin_audit_logs;
CREATE POLICY "Admins can log own admin actions"
ON public.admin_audit_logs FOR INSERT TO authenticated
WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can view matinale jobs" ON public.matinale_jobs;
CREATE POLICY "Owners and admins can view matinale jobs"
ON public.matinale_jobs FOR SELECT TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
