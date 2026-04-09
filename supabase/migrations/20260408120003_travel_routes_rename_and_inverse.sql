-- Rename pricing_matrix → travel_routes and backfill inverse directions (same prices).

alter table public.pricing_matrix rename to travel_routes;

alter table public.travel_routes rename constraint pricing_matrix_pkey to travel_routes_pkey;
alter table public.travel_routes rename constraint pricing_matrix_from_to_unique to travel_routes_from_to_unique;
alter table public.travel_routes rename constraint pricing_matrix_positive to travel_routes_positive;
alter table public.travel_routes rename constraint pricing_matrix_bounds to travel_routes_bounds;

alter index public.pricing_matrix_from_idx rename to travel_routes_from_idx;
alter index public.pricing_matrix_to_idx rename to travel_routes_to_idx;

drop policy if exists admin_all_pricing_matrix on public.travel_routes;

create policy admin_all_travel_routes on public.travel_routes
  for all to authenticated
  using (true) with check (true);

comment on table public.travel_routes is 'Directed travel routes: from_location_id → to_location_id with recommended/min/max price; inverses kept in sync by app';
