```
You are an expert Next.js 15 (App Router), Tailwind CSS, shadcn/ui, and Supabase developer. Build a complete, production-ready web app called "Sunshine Cabs" for a South African taxi business in Queenstown.

TECH STACK:
- Next.js 15 App Router with server actions
- Tailwind + shadcn/ui (all components must use shadcn)
- Supabase (auth for admins, postgres for everything else)
- Lucide icons
- Realtime subscriptions where needed
- Responsive: driver pages mobile-first, admin desktop-first with sidebar
- Dark mode enabled by default

AUTH & USERS:
- TWO user types: DRIVERS and ADMINS
- Drivers: NO login required. Public page /driver/select shows list of active drivers from Supabase. Selecting a driver creates/upserts a cookie-based session (httpOnly cookie + custom sessions table with driver_id and expiry). Session lasts 24h.
- Admins: Full Supabase Auth (email + password) on /admin/login. Protected route middleware for all /admin/* pages.
- RLS: Drivers can only read/write their own shifts and trips (filter by driver_id from cookie). Admins have full access.

DATABASE SCHEMA (create these tables with RLS policies):
1. drivers (id uuid PK, name text, vehicle_reg text, is_active boolean default true)
2. locations (id uuid PK, name text unique, lat numeric, lng numeric) — seed with Komani Central, Ezibeleni, Ilinge, Queenstown CBD etc.
3. pricing_matrix (id uuid PK, from_location_id uuid references locations, to_location_id uuid references locations, recommended_price numeric, min_price numeric, max_price numeric) — unique(from,to)
4. sessions (id uuid PK, driver_id uuid, session_token text unique, expires_at timestamp)
5. shifts (id uuid PK, driver_id uuid, date date, start_time timestamp, end_time timestamp, start_km numeric, end_km numeric, goal_amount numeric default 500, total_earned numeric default 0)
6. trips (
   id uuid PK,
   shift_id uuid references shifts,
   driver_id uuid,
   start_location_id uuid,
   end_location_id uuid,
   stops jsonb[] default '[]',  -- array of {location_id, lat, lng, order}
   start_lat numeric,
   start_lng numeric,
   end_lat numeric,
   end_lng numeric,
   total_distance_km numeric,
   recommended_price numeric,
   actual_price numeric,
   discount_amount numeric default 0,
   discount_reason text,
   customer_phone text,
   created_at timestamp default now(),
   ended_at timestamp
)
7. petrol_fillups (id uuid PK, shift_id uuid, driver_id uuid, date date, litres numeric, rand_amount numeric, odometer_km numeric)
8. customers (phone text PRIMARY KEY, first_seen timestamp, total_trips int default 0, last_trip_date timestamp, loyalty_tier text default 'bronze')
9. daily_goals (driver_id uuid, date date, target_amount numeric)
10. monthly_team_goals (year int, month int, target_amount numeric)
11. discount_rules (min_repeat_trips int, discount_percent numeric, min_margin_percent numeric default 25)


FEATURES TO IMPLEMENT:

DRIVER FLOW (/driver/*):
- /driver/select → list of drivers → select → set cookie + redirect to /driver/home
- /driver/home: big "START SHIFT" button (records start_km, sets goal), today's goal progress card (earned vs goal), quick stats (trips today, revenue today)
- Create Trip page: dropdowns for start location + "+ Add Stop" (multi-stop) + end location. On selection, instantly show "Recommended price: R250" from pricing_matrix. Search/add customer phone (autocomplete from customers table). Big "START TRIP" button → capture current GPS (navigator.geolocation) and save start lat/lng.
- Active trip screen: shows live distance (updated every 30s), customer phone, big "END TRIP" button.
- End Trip modal: "Use Recommended Price" button (pre-filled) OR manual price input + optional discount toggle (only allowed if margin > 25 % based on average cost/km from previous fuel data). Save trip → trigger server action that calculates total_distance_km using Haversine formula on all points (start + stops + end).
- Fuel page: log fill-ups (litres + rand) during shift. End Shift button records end_km and finalises shift earnings.

CRITICAL MULTI-STOP LOGIC (MUST IMPLEMENT EXACTLY):
- Admins can add/edit locations and fully manage the pricing_matrix (every possible from → to pair with recommended/min/max price).
- On the driver "Create Trip" screen:
  - Start location dropdown
  - Repeatable "+ Add Stop" (each stop is a location)
  - End location dropdown
  - As soon as any stop is added or changed, the UI instantly calls a server action that looks up pricing_matrix for every consecutive pair (start→stop1, stop1→stop2, …, last_stop→end) and shows ONE live "Recommended total: R870" card.
- When the trip ends, the same summed recommended_price is saved to the trips table.
- Driver then confirms ONE final actual_price for the entire multi-leg trip (or clicks "Use Recommended Total").
- If any leg has no price in pricing_matrix, show warning and require manual final price.

ADMIN DASHBOARD (/admin/* with sidebar):
- Overview: KPI cards (today revenue, trips, repeat customers %, avg km/trip), driver goal progress bars (live), revenue trend chart (recharts or shadcn chart), active drivers map (simple leaflet or just pins for MVP)
- Drivers page: table with name, today’s trips, earned, goal %, fuel used, actions (edit, suspend)
- Locations & Pricing: table + matrix editor to add locations and set prices between them
- Trips: filterable table (date, driver, locations, price, discount, distance, customer phone) with export button
- Customers: phone list + total trips, last trip, loyalty tier, repeat rate
- Goals: edit daily per-driver goals + monthly team goal
- All pages: filters, search, sorting, status badges, modals for create/edit, empty states, loading skeletons, success toasts (sonner)

ADDITIONAL REQUIREMENTS:
- On trip end, if customer_phone exists, increment total_trips and update last_trip_date. Show driver smart discount recommendation based on discount_rules.
- Realtime: admin Overview and Trips page subscribe to new trips/shifts.
- South African sample data: seed 8 drivers, 6 locations, pricing matrix, 20 sample trips.
- Mobile-first driver UI with huge touch-friendly buttons and bottom navigation.
- Premium fintech look: clean cards, green accents for money, red for discounts.
- Include full Supabase setup instructions at top of README.md (tables + RLS + seed script).
- Error handling, offline toast, GPS permission fallback.
- Realtime subscriptions on admin Overview and Trips.
- South African sample data: seed 8 drivers, 6+ locations, full pricing matrix, 20 sample multi-stop trips.
- Mobile-first driver UI with huge buttons and bottom nav.
- Premium fintech styling (green for money).
- Include full Supabase setup instructions + seed.sql in README.md.
- Implement calculateTripRecommendedPrice server action that returns the summed price for any array of location IDs.
- Haversine distance for total_distance_km (sum across all points).

Generate the FULL project structure with all pages, components, server actions, Supabase client config, middleware for cookies/auth, and a seed.sql file. Make it ready to run with "npm run dev" after supabase start and setting .env.local variables.

2. **Business logic**

- Drivers get instant “login” by selecting their name → cookie session lasts all day → only they can create/end trips for themselves.
- Every trip pulls recommended price from admin pricing matrix; driver can accept or override (discounts are smart: only applied if margin > 25 % based on average fuel cost/km).
- Cellphone tracking turns riders into repeat customers; app shows driver “This customer has 3+ trips → suggest R20 discount” automatically.
- Fuel + km data gives real profit-per-trip (revenue minus estimated fuel cost).
- Goals drive behaviour: driver sees live progress toward R500/day; admin sets per-driver daily targets and monthly team target.
- All data flows to admin analytics so you instantly see revenue, repeat rate, discounts given, and fuel spend.
- Multi-stop trips are fully supported; distance is summed across all legs using real GPS.

3. **UI layout**
   **Driver side (mobile-first, huge buttons, bottom nav):**

- Driver select screen → Home (shift start button, goal progress card, today’s stats)
- Create Trip (start location dropdown → +Add Stop → end location → auto recommended price → cellphone search/add → START TRIP with GPS capture)
- Active Trip screen (live distance, customer phone, END TRIP button)
- End Trip modal (recommended price button or manual + discount toggle)
- Fuel & End Shift screen

**Admin dashboard (desktop-first, shadcn/ui cards + tables):**

- Sidebar navigation (Overview, Drivers, Trips, Locations & Pricing, Customers, Goals, Settings)
- Overview: KPI cards, live driver cards with goal %, revenue chart
- All pages use tables with filters, status badges, modals for edit/create.

4. **Data model**
   Supabase tables exactly as defined below (prompt will include full SQL schema + RLS policies).

5. **API requirements**

- Supabase client + realtime subscriptions (live updates for admin)
- Server actions / route handlers for trip start/end (GPS + Haversine distance)
- Driver “auth” via cookies + custom session table
- Admin uses Supabase Auth (email/password)
- Edge functions for distance calculation and smart discount logic

6. **Edge cases**

- No GPS → fallback manual location picker with warning
- Offline mode → local storage queue + sync on reconnect
- Discount would cause loss → blocked with explanation
- Driver forgets to end shift → admin force-close next day
- Duplicate cellphone → auto-links to existing customer record
- Multi-stop distance summed correctly


Start building now.
```
