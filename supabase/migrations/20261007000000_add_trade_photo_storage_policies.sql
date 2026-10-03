-- Keep trade screenshots private.
-- Each user's files live under: <auth.uid()>/...

CREATE POLICY "Users can upload their own trade photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trade-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can view their own trade photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'trade-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can update their own trade photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'trade-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'trade-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can delete their own trade photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'trade-photos'
  AND (SELECT auth.uid()::text) = (storage.foldername(name))[1]
);