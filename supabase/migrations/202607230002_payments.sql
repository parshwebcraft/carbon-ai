-- Isolated pricing/payment tables for Razorpay checkout and Custom plan leads.
-- This migration does not alter existing CRM tables.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null check (plan_id in ('starter', 'growth')),
  plan_name text not null,
  amount_paise integer not null,
  currency text not null default 'INR',
  status text not null default 'created',
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  razorpay_signature text,
  customer jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists idx_payments_plan_id on public.payments(plan_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_payment_id on public.payments(razorpay_payment_id);

create table if not exists public.pricing_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null,
  expected_call_volume text not null,
  plan_id text not null default 'custom',
  source text not null default 'pricing_page',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists idx_pricing_leads_email on public.pricing_leads(email);
create index if not exists idx_pricing_leads_status on public.pricing_leads(status);

alter table public.payments enable row level security;
alter table public.pricing_leads enable row level security;

create policy "service role manages payments"
on public.payments for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role manages pricing leads"
on public.pricing_leads for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

