-- Create storage bucket for patient photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-photos', 'patient-photos', false);

-- Policy: Users can upload their own photos
CREATE POLICY "Users can upload photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'patient-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own photos
CREATE POLICY "Users can view own photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'patient-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'patient-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own photos
CREATE POLICY "Users can update own photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'patient-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);