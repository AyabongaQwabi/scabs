**1. Goal**  
Build a **simple, driver-first web app** (mobile-optimized) + admin dashboard for Sunshine Cabs that lets drivers quickly log shifts, create multi-stop trips, capture customer cellphone numbers for loyalty, auto-calculate distance & recommended pricing, track daily fuel, and hit money goals — while admins get real-time visibility into revenue, repeat customers, discounts, and team performance.

Everything saves to Supabase. Drivers use zero-friction “select-your-name” login (cookies keep them logged in all day). The entire flow is built for speed on the road, directly boosting ride volume, driver earnings, and profit margins.

**2. Business logic**

- Drivers are incentivised to log every trip and customer number because the app instantly shows “you qualify for R20 discount on next trip” (only when it doesn’t hurt margins).
- Recommended price is pulled from admin-maintained location-pair table → drivers can override but admin sees every discount.
- Daily goals (default R500) + monthly team goals create clear targets; admin sees live progress per driver.
- Fuel tracking (start km, end km, fill-ups) gives exact cost-per-km and prevents “ghost fuel” losses.
- Cellphone-only customer tracking turns one-off riders into repeaters without complex CRM.
- All data feeds admin dashboard for daily revenue, per-trip profit, repeat-rate %, and driver activity.
- Every feature ties directly to revenue (more trips), efficiency (auto-distance & pricing), retention (discounts for repeats), and margins (smart discount rules + fuel visibility).

**3. UI layout**  
**Driver screens (super simple, big buttons, dark mode friendly):**

- **Home / Shift screen** (after selecting name)  
  Top: “Good morning, Sipho” + big green “START SHIFT” button  
  Cards: Today’s goal (R500 / R320 earned), Start km reading, Active trips (0)  
  Bottom nav: Trips | Customers | Fuel | End Shift

- **Create Trip screen**  
  • Start location dropdown (Komani Central, Ezibeleni, Ilinge + any admin-added)  
  • “+ Add stop” button (multi-stop support)  
  • End location dropdown  
  • Auto-shows “Recommended price: R250” (based on start → end pair)  
  • Optional: Search/add cellphone number (quick search box + “New number” button)  
  • Big “START TRIP” button → instantly captures current GPS lat/long

- **Active Trip screen**  
  Live distance so far, customer number (if captured), price so far  
  Big “END TRIP” button → opens price confirmation modal

- **End Trip modal**  
  • “Use recommended R250” button (pre-filled)  
  • Or manual price input  
  • Optional discount reason (dropdown with admin rules)  
  • “Save trip”

- **Fuel & Shift end**  
  Simple form: Start km | Fill-ups today (litres + rand) | End km

**Admin dashboard pages (full Sunshine Cabs style):**

- Overview: KPI cards (today’s revenue, trips, repeat customers %, average km per trip) + driver goal progress bars + live map of active drivers
- Drivers → table with today’s earnings, goal %, fuel used, trips logged
- Locations & Pricing → matrix table (from → to) with edit prices
- Trips → filterable table with all trip details, discounts applied, profit per trip
- Customers → cellphone list + trip count + last trip date + loyalty tier
- Goals → daily per-driver + monthly team targets (editable)

**4. Data model (Supabase tables)**

```sql
-- Core tables
drivers (id, name, phone, vehicle_reg, is_active)
locations (id, name, lat, lng)  -- Komani Central, Ezibeleni, Ilinge etc.

pricing_matrix (from_location_id, to_location_id, recommended_price, min_price, max_price)

shifts (id, driver_id, date, start_time, end_time, start_km, end_km, goal_amount, total_earned)

trips (
  id, shift_id, driver_id,
  start_location_id, end_location_id,
  start_lat, start_lng, end_lat, end_lng,
  total_distance_km,  -- calculated on end
  recommended_price, actual_price, discount_amount, discount_reason,
  customer_phone, created_at, ended_at,
  stops jsonb[]  -- array of {location_id, lat, lng, order}
)

petrol_fillups (id, shift_id, driver_id, date, litres, rand_amount, odometer_km)

customers (phone text PRIMARY KEY, first_seen, total_trips, last_trip_date, loyalty_tier)

-- Admin settings
daily_goals (driver_id, date, target_amount)
monthly_team_goal (month, year, target_amount)
discount_rules (min_repeat_trips, discount_percent, only_if_margin_above_percent)
```

**5. API requirements (Supabase)**

- Real-time subscriptions on `shifts` and `trips` for admin live view
- Edge function or client-side:  
  – On trip start: `navigator.geolocation.getCurrentPosition` → save start lat/lng  
  – On trip end: call Supabase edge function that uses simple Haversine formula (or Mapbox distance matrix if you want streets) to calculate `total_distance_km`
- RLS policies:  
  – Drivers can only read/write their own shifts & trips (row-level security by `driver_id`)  
  – Admins have full read/write on everything
- Auth:  
  – Drivers: no Clerk/Supabase auth — just a public “driver login” page that inserts/upserts a session row and sets a httpOnly cookie (or localStorage + Supabase anon key with RLS)  
  – Admins: Supabase Auth (email/password or magic link) + Clerk if you prefer

**6. Edge cases**

- Driver forgets to end shift → admin can force-close next day with note
- No GPS permission → fallback manual location picker + warning banner
- Offline → all data queued in IndexedDB (simple) and syncs when back online
- Duplicate customer phone → instantly links to existing customer record
- Discount would make trip unprofitable → app shows red warning “Margin too low — discount blocked” (based on simple cost-per-km from fuel data)
- Multi-stop trips → distance summed across all legs
- Driver selects same start/end → allow but flag for admin review

**7. Cursor-ready prompt**

```
Create a production-ready Next.js 15 + Tailwind + shadcn/ui + Supabase web app for Sunshine Cabs with two user flows:

Driver flow (zero login friction):
- Public page: list of active drivers → select name → set cookie session + redirect to /driver/home
- /driver/home: start shift (record start km + daily goal), create trip (multi-stop locations from Supabase, auto recommended price from pricing_matrix, optional customer phone search/add, capture GPS on start)
- Active trip screen + end trip with price confirmation (recommended or manual + discount)
- Fuel fill-up logging and end shift

Admin dashboard (protected route):
- Full Sunshine Cabs layout with sidebar
- Overview KPIs, live driver cards, goal progress
- Drivers table, Locations & Pricing matrix editor, Trips analytics, Customer phone loyalty view, Goals manager

Use Supabase tables exactly as specified above (include RLS, realtime subscriptions for live map & activity).
Include browser geolocation on trip start, Haversine distance calculation on trip end (or Mapbox if you add it).
Mobile-first driver UI with huge buttons, dark mode, simple bottom nav.
Admin uses card + table + chart layout.
Add realistic South African sample data (Queenstown locations: Komani Central, Ezibeleni, Ilinge etc.).
Include empty states, loading skeletons, and success toasts.
```

**8. Future scale improvements**

- Phase 2: Add WhatsApp “Start trip” button from driver phone → deep link into web app
- Phase 3: AI suggested next price based on time-of-day + demand
- Phase 4: Driver app becomes PWA + push notifications for new corporate bookings
- Phase 5: Full Mapbox live tracking + auto-dispatch to nearest driver

This MVP gives you a working, profitable system in days, not weeks. Ready to build the first page? Tell me which one to generate the full component tree + Supabase schema + code for first (Driver Home or Admin Overview).
