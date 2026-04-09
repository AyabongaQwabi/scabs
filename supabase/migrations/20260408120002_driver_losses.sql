-- Pre-trip deadhead (unpaid km before rider pickup), valued at R10/km straight-line

create table public.driver_losses (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  shift_id uuid references public.shifts (id) on delete set null,
  trip_id uuid references public.trips (id) on delete set null,
  from_location_id uuid references public.locations (id) on delete set null,
  to_location_id uuid references public.locations (id) on delete set null,
  distance_km numeric not null,
  estimated_loss_zar numeric not null,
  zar_per_km_applied numeric not null default 10,
  created_at timestamptz not null default now(),
  constraint driver_losses_distance_nonneg check (distance_km >= 0),
  constraint driver_losses_loss_nonneg check (estimated_loss_zar >= 0),
  constraint driver_losses_zar_rate_nonneg check (zar_per_km_applied > 0)
);

create index driver_losses_driver_created_idx on public.driver_losses (driver_id, created_at desc);
create index driver_losses_shift_idx on public.driver_losses (shift_id);
create index driver_losses_trip_idx on public.driver_losses (trip_id);

alter table public.driver_losses enable row level security;

create policy admin_all_driver_losses on public.driver_losses
  for all to authenticated
  using (true) with check (true);
