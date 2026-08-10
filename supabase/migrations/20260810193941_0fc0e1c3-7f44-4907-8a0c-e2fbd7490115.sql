CREATE POLICY "Newsletter privee: lecture authentifiee"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'newsletter-images-privees');

CREATE POLICY "Newsletter privee: depot authentifie"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'newsletter-images-privees');

CREATE POLICY "Newsletter privee: mise a jour authentifiee"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'newsletter-images-privees')
WITH CHECK (bucket_id = 'newsletter-images-privees');

CREATE POLICY "Newsletter privee: suppression authentifiee"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'newsletter-images-privees');