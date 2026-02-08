
-- Create compilations table to store generated/saved videos
CREATE TABLE public.compilations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration NUMERIC NOT NULL DEFAULT 0,
  clip_count INTEGER NOT NULL DEFAULT 0,
  clip_ids UUID[] NOT NULL DEFAULT '{}',
  journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compilations ENABLE ROW LEVEL SECURITY;

-- Users can view their own compilations
CREATE POLICY "Users can view their own compilations"
ON public.compilations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own compilations
CREATE POLICY "Users can create their own compilations"
ON public.compilations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own compilations
CREATE POLICY "Users can update their own compilations"
ON public.compilations
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own compilations
CREATE POLICY "Users can delete their own compilations"
ON public.compilations
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_compilations_updated_at
BEFORE UPDATE ON public.compilations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a storage bucket for compiled videos
INSERT INTO storage.buckets (id, name, public) VALUES ('compilations', 'compilations', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for compilations bucket
CREATE POLICY "Anyone can view compilations"
ON storage.objects
FOR SELECT
USING (bucket_id = 'compilations');

CREATE POLICY "Users can upload their own compilations"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'compilations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own compilations"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'compilations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own compilations"
ON storage.objects
FOR DELETE
USING (bucket_id = 'compilations' AND auth.uid()::text = (storage.foldername(name))[1]);
