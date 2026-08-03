DROP POLICY IF EXISTS "Authenticated can view avatars" ON storage.objects;
CREATE POLICY "Users can view own avatar objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "Authenticated can view newsletter images" ON storage.objects;
CREATE POLICY "Admins can view newsletter images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'newsletter-images' AND public.has_role(auth.uid(), 'admin'));