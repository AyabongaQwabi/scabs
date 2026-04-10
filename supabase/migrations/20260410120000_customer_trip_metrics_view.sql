-- Lifetime revenue, discounts, and km per customer (completed trips only).
create or replace view public.customer_trip_metrics as
select
  c.phone,
  c.first_seen,
  c.total_trips,
  c.last_trip_date,
  c.loyalty_tier,
  coalesce(sum(t.actual_price), 0)::numeric as lifetime_revenue_zar,
  coalesce(sum(t.discount_amount), 0)::numeric as lifetime_discounts_zar,
  coalesce(sum(t.total_distance_km), 0)::numeric as lifetime_km
from public.customers c
left join public.trips t
  on t.customer_phone = c.phone
  and t.ended_at is not null
group by c.phone, c.first_seen, c.total_trips, c.last_trip_date, c.loyalty_tier;

comment on view public.customer_trip_metrics is 'Aggregates from trips with ended_at set; join key is customers.phone = trips.customer_phone.';
