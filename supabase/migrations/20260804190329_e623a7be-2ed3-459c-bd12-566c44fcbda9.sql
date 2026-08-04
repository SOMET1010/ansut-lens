DROP POLICY "Authenticated users can view categories" ON public.categories_veille;
CREATE POLICY "Authenticated users can view categories" ON public.categories_veille FOR SELECT TO authenticated USING (true);

DROP POLICY "Authenticated users can view mots_cles" ON public.mots_cles_veille;
CREATE POLICY "Authenticated users can view mots_cles" ON public.mots_cles_veille FOR SELECT TO authenticated USING (true);

DROP POLICY "Anyone can view permissions" ON public.permissions_registry;
CREATE POLICY "Authenticated can view permissions" ON public.permissions_registry FOR SELECT TO authenticated USING (true);

DROP POLICY "Authenticated can view role_permissions" ON public.role_permissions;
CREATE POLICY "Authenticated can view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.categories_veille, public.mots_cles_veille, public.permissions_registry, public.role_permissions FROM anon;