-- WhatsApp marketing campaigns (admin-initiated batches, Wasender API)

create table public.whatsapp_campaign_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  template text not null,
  created_by text,
  status text not null default 'active',
  last_wasender_request_at timestamptz,
  threshold_trips int not null default 5,
  constraint whatsapp_campaign_batches_status_check check (status in ('active', 'completed')),
  constraint whatsapp_campaign_batches_threshold_positive check (threshold_trips >= 1)
);

create index whatsapp_campaign_batches_created_at_idx on public.whatsapp_campaign_batches (created_at desc);

create table public.whatsapp_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.whatsapp_campaign_batches (id) on delete cascade,
  customer_phone text not null,
  last_location_label text not null,
  total_trips int not null,
  trips_until_25 int not null,
  rendered_message text,
  status text not null default 'pending',
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint whatsapp_campaign_recipients_status_check check (status in ('pending', 'sending', 'sent', 'failed'))
);

create index whatsapp_campaign_recipients_batch_status_idx
  on public.whatsapp_campaign_recipients (batch_id, status);

comment on table public.whatsapp_campaign_batches is 'Frozen template + throttle anchor for Wasender sends';
comment on table public.whatsapp_campaign_recipients is 'Per-customer queue row; status pending/sent/failed';

alter table public.whatsapp_campaign_batches enable row level security;
alter table public.whatsapp_campaign_recipients enable row level security;

create policy admin_all_whatsapp_campaign_batches on public.whatsapp_campaign_batches
  for all to authenticated
  using (true) with check (true);

create policy admin_all_whatsapp_campaign_recipients on public.whatsapp_campaign_recipients
  for all to authenticated
  using (true) with check (true);
