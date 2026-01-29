-- Create video_clips table for storing clip metadata
CREATE TABLE public.video_clips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration NUMERIC(4,2) NOT NULL CHECK (duration >= 1 AND duration <= 2),
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_highlight BOOLEAN NOT NULL DEFAULT false,
  week_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_clips ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own clips"
ON public.video_clips
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clips"
ON public.video_clips
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clips"
ON public.video_clips
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clips"
ON public.video_clips
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_video_clips_journey ON public.video_clips(journey_id);
CREATE INDEX idx_video_clips_user ON public.video_clips(user_id);

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

-- Storage policies for video uploads
CREATE POLICY "Users can upload their own videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Users can delete their own videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to update journey clip count
CREATE OR REPLACE FUNCTION public.update_journey_clip_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.journeys 
    SET clip_count = clip_count + 1, last_capture_date = NEW.captured_at
    WHERE id = NEW.journey_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.journeys 
    SET clip_count = clip_count - 1
    WHERE id = OLD.journey_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update clip count
CREATE TRIGGER update_clip_count
AFTER INSERT OR DELETE ON public.video_clips
FOR EACH ROW
EXECUTE FUNCTION public.update_journey_clip_count();