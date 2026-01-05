-- Create storage bucket for newsletter images
INSERT INTO storage.buckets (id, name, public)
VALUES ('newsletter-images', 'newsletter-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for newsletter images bucket
CREATE POLICY "Admins can upload newsletter images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'newsletter-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update newsletter images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'newsletter-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete newsletter images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'newsletter-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view newsletter images"
ON storage.objects FOR SELECT
USING (bucket_id = 'newsletter-images');