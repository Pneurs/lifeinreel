-- Add is_draft column to compilations table
ALTER TABLE public.compilations
ADD COLUMN is_draft boolean NOT NULL DEFAULT false;