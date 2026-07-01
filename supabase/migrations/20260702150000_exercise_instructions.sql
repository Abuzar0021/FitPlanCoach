-- Real exercise instructions so users never need to search elsewhere for
-- proper form: step-by-step cues, common mistakes, a breathing pattern, a
-- safety note, and a slot for a demonstration image once generated.
alter table public.exercises
  add column if not exists instructions text[] not null default '{}',
  add column if not exists common_mistakes text[] not null default '{}',
  add column if not exists breathing_tip text,
  add column if not exists safety_tip text,
  add column if not exists image_url text;
