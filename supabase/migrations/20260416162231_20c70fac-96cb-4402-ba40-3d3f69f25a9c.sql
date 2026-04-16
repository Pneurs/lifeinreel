
-- Add user_id column (nullable - null means system track)
ALTER TABLE public.music_tracks ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Allow authenticated users to insert their own tracks
CREATE POLICY "Users can insert own music tracks"
ON public.music_tracks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own tracks
CREATE POLICY "Users can delete own music tracks"
ON public.music_tracks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Storage policy: allow authenticated users to upload to music bucket
CREATE POLICY "Authenticated users can upload music"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'music' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy: allow users to delete their own music files
CREATE POLICY "Users can delete own music files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'music' AND auth.uid()::text = (storage.foldername(name))[1]);
