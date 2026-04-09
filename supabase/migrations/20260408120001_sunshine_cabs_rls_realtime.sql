-- RLS + Supabase Realtime for admin dashboards (docs/prompt.md)
-- Driver app uses service role on the server; admins use Supabase Auth + these policies.

-- Realtime: only add if not already a member (safe for local reset / replays)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trips'
  ) then
    alter publication supabase_realtime add table public.trips;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shifts'
  ) then
    alter publication supabase_realtime add table public.shifts;
  end if;
end $$;

-- Row Level Security
alter table public.drivers enable row level security;
alter table public.locations enable row level security;
alter table public.pricing_matrix enable row level security;
alter table public.sessions enable row level security;
alter table public.shifts enable row level security;
alter table public.trips enable row level security;
alter table public.petrol_fillups enable row level security;
alter table public.customers enable row level security;
alter table public.daily_goals enable row level security;
alter table public.monthly_team_goals enable row level security;
alter table public.discount_rules enable row level security;

-- Authenticated (admin) users: full access
-- Anon has no policies → denied (driver flows use service role from Next.js server)

create policy admin_all_drivers on public.drivers
  for all to authenticated
  using (true) with check (true);

create policy admin_all_locations on public.locations
  for all to authenticated
  using (true) with check (true);

create policy admin_all_pricing_matrix on public.pricing_matrix
  for all to authenticated
  using (true) with check (true);

create policy admin_all_sessions on public.sessions
  for all to authenticated
  using (true) with check (true);

create policy admin_all_shifts on public.shifts
  for all to authenticated
  using (true) with check (true);

create policy admin_all_trips on public.trips
  for all to authenticated
  using (true) with check (true);

create policy admin_all_petrol_fillups on public.petrol_fillups
  for all to authenticated
  using (true) with check (true);

create policy admin_all_customers on public.customers
  for all to authenticated
  using (true) with check (true);

create policy admin_all_daily_goals on public.daily_goals
  for all to authenticated
  using (true) with check (true);

create policy admin_all_monthly_team_goals on public.monthly_team_goals
  for all to authenticated
  using (true) with check (true);

create policy admin_all_discount_rules on public.discount_rules
  for all to authenticated
  using (true) with check (true);
