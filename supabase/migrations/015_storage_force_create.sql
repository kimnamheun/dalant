-- Force create the product-images bucket
DO $$
BEGIN
  -- Insert bucket if not exists
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product-images') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'product-images',
      'product-images',
      true,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    );
  ELSE
    -- Update to ensure public and correct settings
    UPDATE storage.buckets
    SET public = true,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    WHERE id = 'product-images';
  END IF;
END $$;

-- Drop existing policies for clean slate
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname LIKE '%product%'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- Public read
CREATE POLICY "product_images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Authenticated insert
CREATE POLICY "product_images_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Authenticated update
CREATE POLICY "product_images_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Authenticated delete
CREATE POLICY "product_images_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Verify
SELECT 'Bucket status:' AS info;
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'product-images';

SELECT 'Policies:' AS info;
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
AND policyname LIKE '%product%';
