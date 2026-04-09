## Sunshine Cabs

Driver-first trip + shift logging for a taxi business in Komani (Queenstown), with a real-time admin dashboard.

### Tech

- Next.js App Router
- Tailwind + shadcn/ui
- Supabase (Postgres + Auth + Realtime)
- Leaflet map, Recharts charts

### Key URLs

- **Driver app**: `/driver/select` (no password; cookie session)
- **Admin**: `/admin/login` (Supabase email/password auth)

## Getting Started

### 1) Create Supabase project (or local Supabase)

- **Hosted Supabase**: create a project in Supabase.
- **Local Supabase** (recommended for dev): install Supabase CLI then run:

```bash
supabase start
```

### 2) Apply database schema (migrations) + optional seed data

**Schema** is versioned in:

- `supabase/migrations/20260408120000_sunshine_cabs_schema.sql` — tables, indexes (matches `docs/prompt.md` / `docs/prd.md`)
- `supabase/migrations/20260408120001_sunshine_cabs_rls_realtime.sql` — RLS policies for authenticated admins + Realtime for `trips` / `shifts`

**Hosted Supabase:** paste and run each migration file **in order** in the SQL Editor (or use [CLI db push](https://supabase.com/docs/guides/cli/local-development#link-your-project)).

**Local Supabase CLI** (from repo root, after `supabase link` or local init):

```bash
supabase db reset
```

That applies all `supabase/migrations/*.sql` in filename order. To add demo locations/drivers/trips afterward, run:

- `supabase/seed.sql` (data only)

### 3) Configure environment variables

Copy:

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`: from Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY`: **server-only** key from Supabase project settings

### 4) Create an admin user

In Supabase Dashboard:

- Authentication → Users → **Add user**
- Set email + password

### 5) Run the app

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Troubleshooting: “Failed to patch lockfile” / SWC fetch timeout

Next.js 16 may try to **patch `package-lock.json`** by calling the npm registry for `@next/swc-*` metadata. If you are **offline**, on a **restricted network**, or npm is blocked, that step fails with a connect timeout.

This repo’s `npm run dev` and `npm run build` set **`NEXT_IGNORE_INCORRECT_LOCKFILE=1`**, which skips that network step. Your `@next/swc-*` binary should already be present from `npm install` (e.g. `node_modules/@next/swc-darwin-arm64`).

If SWC is still missing, run **`npm install`** once on a network where the registry is reachable (or fix `HTTP_PROXY` / `HTTPS_PROXY` / firewall), then retry.

### Notes on security (drivers)

Drivers do **not** use Supabase Auth. They “log in” by selecting their name, which creates a 24h httpOnly cookie session stored in the `sessions` table.

Because Supabase RLS cannot read your Next.js cookies directly, the driver app performs DB reads/writes via Next.js server code using the **service role** key (service role bypasses RLS). Admin pages use Supabase Auth + RLS policies (authenticated users have full access).

### Offline mode

Driver mutations are queued in **IndexedDB** when offline and replayed automatically when the device comes back online.

### What’s implemented (MVP)

- Driver: select driver, start/end shift, create multi-stop trips, GPS capture, live distance, end-trip pricing + discount gate (margin-aware), fuel logging
- Admin: login, Overview KPIs + chart + Leaflet map, Drivers, Trips (filter + CSV export), Customers, Goals, Locations & Pricing

### Deploy

- Set the same env vars on your host (Vercel/etc.)
- Apply `supabase/seed.sql` to your hosted Supabase project

