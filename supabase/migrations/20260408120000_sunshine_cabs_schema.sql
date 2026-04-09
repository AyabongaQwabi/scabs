-- Sunshine Cabs: core schema (see docs/prompt.md, docs/prd.md)
-- Tables: drivers, locations, pricing_matrix, sessions, shifts, trips, petrol_fillups,
--         customers, daily_goals, monthly_team_goals, discount_rules

create extension if not exists "pgcrypto";

-- 1. drivers
create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vehicle_reg text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. locations
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  lat numeric,
  lng numeric,
  created_at timestamptz not null default now()
);

-- 3. pricing_matrix
create table public.pricing_matrix (
  id uuid primary key default gen_random_uuid(),
  from_location_id uuid not null references public.locations (id) on delete cascade,
  to_location_id uuid not null references public.locations (id) on delete cascade,
  recommended_price numeric not null,
  min_price numeric not null,
  max_price numeric not null,
  created_at timestamptz not null default now(),
  constraint pricing_matrix_from_to_unique unique (from_location_id, to_location_id),
  constraint pricing_matrix_positive check (
    recommended_price >= 0
    and min_price >= 0
    and max_price >= 0
  ),
  constraint pricing_matrix_bounds check (
    min_price <= recommended_price
    and recommended_price <= max_price
  )
);

create index pricing_matrix_from_idx on public.pricing_matrix (from_location_id);
create index pricing_matrix_to_idx on public.pricing_matrix (to_location_id);

-- 4. sessions (driver cookie sessions)
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  session_token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index sessions_driver_id_idx on public.sessions (driver_id);
create index sessions_expires_at_idx on public.sessions (expires_at);

-- 5. shifts
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  date date not null,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  start_km numeric,
  end_km numeric,
  goal_amount numeric not null default 500,
  total_earned numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint shifts_goal_nonnegative check (goal_amount >= 0),
  constraint shifts_total_earned_nonnegative check (total_earned >= 0)
);

create index shifts_driver_date_idx on public.shifts (driver_id, date);
create index shifts_date_idx on public.shifts (date);

-- 6. trips (multi-stop: stops jsonb[])
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid references public.shifts (id) on delete set null,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  start_location_id uuid references public.locations (id) on delete set null,
  end_location_id uuid references public.locations (id) on delete set null,
  stops jsonb[] not null default '{}'::jsonb[],
  start_lat numeric,
  start_lng numeric,
  end_lat numeric,
  end_lng numeric,
  total_distance_km numeric,
  recommended_price numeric,
  actual_price numeric,
  discount_amount numeric not null default 0,
  discount_reason text,
  customer_phone text,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint trips_discount_nonnegative check (discount_amount >= 0),
  constraint trips_distance_nonnegative check (total_distance_km is null or total_distance_km >= 0)
);

create index trips_driver_created_at_idx on public.trips (driver_id, created_at desc);
create index trips_shift_id_idx on public.trips (shift_id);
create index trips_created_at_idx on public.trips (created_at desc);
create index trips_customer_phone_idx on public.trips (customer_phone);

-- 7. petrol_fillups
create table public.petrol_fillups (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid references public.shifts (id) on delete set null,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  date date not null,
  litres numeric not null,
  rand_amount numeric not null,
  odometer_km numeric,
  created_at timestamptz not null default now(),
  constraint petrol_fillups_nonnegative check (litres > 0 and rand_amount >= 0)
);

create index petrol_fillups_driver_date_idx on public.petrol_fillups (driver_id, date);

-- 8. customers
create table public.customers (
  phone text primary key,
  first_seen timestamptz not null default now(),
  total_trips int not null default 0,
  last_trip_date timestamptz,
  loyalty_tier text not null default 'bronze',
  constraint customers_total_trips_nonnegative check (total_trips >= 0)
);

-- 9. daily_goals
create table public.daily_goals (
  driver_id uuid not null references public.drivers (id) on delete cascade,
  date date not null,
  target_amount numeric not null,
  created_at timestamptz not null default now(),
  primary key (driver_id, date),
  constraint daily_goals_target_nonnegative check (target_amount >= 0)
);

-- 10. monthly_team_goals
create table public.monthly_team_goals (
  year int not null,
  month int not null,
  target_amount numeric not null,
  created_at timestamptz not null default now(),
  primary key (year, month),
  constraint monthly_team_goals_month_valid check (month >= 1 and month <= 12),
  constraint monthly_team_goals_target_nonnegative check (target_amount >= 0)
);

-- 11. discount_rules
create table public.discount_rules (
  id uuid primary key default gen_random_uuid(),
  min_repeat_trips int not null,
  discount_percent numeric not null,
  min_margin_percent numeric not null default 25,
  created_at timestamptz not null default now(),
  constraint discount_rules_min_repeat_trips_valid check (min_repeat_trips >= 1),
  constraint discount_rules_discount_percent_valid check (discount_percent > 0 and discount_percent <= 100),
  constraint discount_rules_min_margin_valid check (min_margin_percent >= 0 and min_margin_percent <= 100)
);

comment on table public.drivers is 'Taxi drivers; public select for /driver/select; writes via app service role';
comment on table public.sessions is 'httpOnly cookie sessions for drivers (24h)';
comment on table public.trips is 'Per-trip log; multi-stop pricing summed from pricing_matrix';
comment on table public.pricing_matrix is 'Directed edges: from_location_id -> to_location_id with recommended/min/max price';
