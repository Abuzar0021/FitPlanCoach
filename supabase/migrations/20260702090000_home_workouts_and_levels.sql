-- Home vs gym workouts, owned equipment, and an explicit experience level
-- (previously only inferred from activity_level). Also equipment tagging on
-- workout_templates so home-eligible programs can be identified.
alter table public.profiles
  add column if not exists workout_location text not null default 'gym'
    check (workout_location in ('gym', 'home')),
  add column if not exists available_equipment text[] not null default '{}',
  add column if not exists experience_level text
    check (experience_level in ('beginner', 'intermediate', 'advanced'));

comment on column public.profiles.available_equipment is
  'Subset of: dumbbells, bands. Only meaningful when workout_location = home.';
