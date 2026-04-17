-- Create a public storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Policy: Anyone can view product images (public bucket)
DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Policy: Authenticated users (admin/teacher) can upload
DROP POLICY IF EXISTS "Authenticated upload for product images" ON storage.objects;
CREATE POLICY "Authenticated upload for product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can update their uploads
DROP POLICY IF EXISTS "Authenticated update for product images" ON storage.objects;
CREATE POLICY "Authenticated update for product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Policy: Authenticated users can delete
DROP POLICY IF EXISTS "Authenticated delete for product images" ON storage.objects;
CREATE POLICY "Authenticated delete for product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
