
CREATE TABLE public.compilation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  render_id text,
  status text NOT NULL DEFAULT 'pending',
  clip_urls text[] NOT NULL DEFAULT '{}',
  clip_day_numbers int[] DEFAULT '{}',
  title text NOT NULL DEFAULT 'Compilation',
  journey_id uuid REFERENCES public.journeys(id),
  result_url text,
  error_message text,
  clip_count int NOT NULL DEFAULT 0,
  duration numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.compilation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON public.compilation_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own jobs" ON public.compilation_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.compilation_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON public.compilation_jobs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_compilation_jobs_user_status ON public.compilation_jobs(user_id, status);
