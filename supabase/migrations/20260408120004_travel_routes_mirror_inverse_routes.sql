-- Idempotent: for every route A→B where A ≠ B, insert missing inverse B→A with the same prices.
-- No seed data: safe on empty public.travel_routes (inserts zero rows).

insert into public.travel_routes (from_location_id, to_location_id, recommended_price, min_price, max_price)
select
  p.to_location_id,
  p.from_location_id,
  p.recommended_price,
  p.min_price,
  p.max_price
from public.travel_routes p
where p.from_location_id is distinct from p.to_location_id
  and not exists (
    select 1
    from public.travel_routes inv
    where inv.from_location_id = p.to_location_id
      and inv.to_location_id = p.from_location_id
  );
