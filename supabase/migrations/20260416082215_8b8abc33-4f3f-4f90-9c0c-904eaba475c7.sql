
-- Create music storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('music', 'music', true);

-- Public read access for music bucket
CREATE POLICY "Music files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'music');

-- Create music_tracks table
CREATE TABLE public.music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mood TEXT NOT NULL,
  file_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Everyone can read music tracks
CREATE POLICY "Music tracks are viewable by everyone"
ON public.music_tracks FOR SELECT
USING (true);
