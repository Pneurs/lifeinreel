ALTER TABLE public.video_clips 
ADD COLUMN is_best_of_day boolean NOT NULL DEFAULT false,
ADD COLUMN is_best_of_week boolean NOT NULL DEFAULT false,
ADD COLUMN is_best_of_month boolean NOT NULL DEFAULT false;