-- Postgres does not allow removing columns via CREATE OR REPLACE VIEW; drop and recreate.
-- Lifetime km is computed in the app from trips (Mapbox + haversine per leg), not summed from total_distance_km here.
drop view if exists public.customer_trip_metrics;

create view public.customer_trip_metrics as
select
  c.phone,
  c.first_seen,
  c.total_trips,
  c.last_trip_date,
  c.loyalty_tier,
  coalesce(sum(t.actual_price), 0)::numeric as lifetime_revenue_zar,
  coalesce(sum(t.discount_amount), 0)::numeric as lifetime_discounts_zar
from public.customers c
left join public.trips t
  on t.customer_phone = c.phone
  and t.ended_at is not null
group by c.phone, c.first_seen, c.total_trips, c.last_trip_date, c.loyalty_tier;

comment on view public.customer_trip_metrics is 'Revenue/discounts from ended trips; join customers.phone = trips.customer_phone. Distance is computed in Next.js per trip.';
