CREATE POLICY "Users can log own admin actions" ON public.admin_audit_logs
  FOR INSERT TO authenticated WITH CHECK (admin_id = auth.uid());