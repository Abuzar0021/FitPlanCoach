-- The application code (usePlan, the dashboard, the subscription page, and
-- Google Play purchase verification) has always read/written these columns,
-- but the deployed `subscriptions` table never had them — every one of those
-- reads/writes was silently failing (unknown-column errors on select, and
-- rejected updates on purchase), so plan state and premium entitlements never
-- actually reached the UI. Bring the table in line with what the app expects.
alter table public.subscriptions
  add column if not exists billing_interval text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists renews_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;
