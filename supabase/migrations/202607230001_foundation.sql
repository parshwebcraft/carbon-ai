-- ParshCall AI foundation schema.
-- Run this in Supabase after creating the project and enabling Auth.

create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  brand_name text,
  website text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete cascade,
  legacy_user_id bigint,
  role text not null default 'Sales',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, auth_user_id),
  unique(company_id, legacy_user_id)
);

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  about_company text,
  mission text,
  vision text,
  services jsonb not null default '[]'::jsonb,
  usp text,
  office_locations jsonb not null default '[]'::jsonb,
  business_hours jsonb not null default '{}'::jsonb,
  phone_numbers jsonb not null default '[]'::jsonb,
  emails jsonb not null default '[]'::jsonb,
  website text,
  social_links jsonb not null default '{}'::jsonb,
  google_maps text,
  industries_served jsonb not null default '[]'::jsonb,
  languages jsonb not null default '["English","Hindi"]'::jsonb,
  working_process text,
  payment_terms text,
  support_hours text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  category text not null,
  source_type text not null,
  source_url text,
  storage_bucket text,
  storage_path text,
  folder_path text,
  tags text[] not null default '{}',
  status text not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  version_number integer not null,
  content_text text,
  storage_path text,
  change_note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(document_id, version_number)
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  version_id uuid references public.knowledge_document_versions(id) on delete set null,
  chunk_index integer not null,
  chunk_text text not null,
  token_count integer not null default 0,
  embedding_model text,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_training_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'queued',
  last_training_at timestamptz,
  documents_used integer not null default 0,
  embeddings_count integer not null default 0,
  tokens integer not null default 0,
  progress integer not null default 0,
  error_message text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_training_sources (
  id uuid primary key default gen_random_uuid(),
  training_job_id uuid not null references public.ai_training_jobs(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  status text not null default 'pending',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_playbooks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, name)
);

create table if not exists public.sales_playbook_stages (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references public.sales_playbooks(id) on delete cascade,
  stage_name text not null,
  sort_order integer not null,
  goal text,
  prompt text,
  success_criteria text,
  created_at timestamptz not null default now(),
  unique(playbook_id, stage_name)
);

create table if not exists public.objections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  objection text not null,
  recommended_response text not null,
  alternative_response text,
  escalation_rule text,
  success_rate numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, objection)
);

create table if not exists public.ai_call_intelligence (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id bigint,
  call_id bigint,
  vapi_call_id text,
  transcript text,
  recording_bucket text,
  recording_path text,
  summary text,
  customer_intent text,
  sentiment text,
  budget text,
  industry text,
  timeline text,
  decision_maker text,
  interested_services text[] not null default '{}',
  pain_points text[] not null default '{}',
  competitor_mentioned text,
  objections text[] not null default '{}',
  meeting_booked boolean not null default false,
  lead_score integer,
  next_action text,
  crm_update jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_memories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id bigint,
  customer_key text,
  last_call_at timestamptz,
  past_objections text[] not null default '{}',
  budget text,
  requirements text,
  meeting_history jsonb not null default '[]'::jsonb,
  proposal_sent boolean not null default false,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.training_examples (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  call_intelligence_id uuid references public.ai_call_intelligence(id) on delete set null,
  transcript text,
  ai_response text,
  human_correction text,
  outcome text,
  customer_rating integer,
  meeting_success boolean,
  admin_feedback text,
  approval_status text not null default 'pending',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values
  ('knowledge-base', 'knowledge-base', false),
  ('call-recordings', 'call-recordings', false),
  ('training-artifacts', 'training-artifacts', false)
on conflict (id) do nothing;

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.business_profiles enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_document_versions enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.ai_training_jobs enable row level security;
alter table public.ai_training_sources enable row level security;
alter table public.sales_playbooks enable row level security;
alter table public.sales_playbook_stages enable row level security;
alter table public.objections enable row level security;
alter table public.ai_call_intelligence enable row level security;
alter table public.conversation_memories enable row level security;
alter table public.training_examples enable row level security;

create or replace function public.current_user_company_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select company_id
  from public.company_users
  where auth_user_id = auth.uid()
    and is_active = true
$$;

create policy "members can read companies"
on public.companies for select
using (id in (select public.current_user_company_ids()));

create policy "members can read company users"
on public.company_users for select
using (company_id in (select public.current_user_company_ids()));

create policy "members can access business profiles"
on public.business_profiles for all
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

create policy "members can access knowledge documents"
on public.knowledge_documents for all
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

create policy "members can access knowledge chunks"
on public.knowledge_chunks for all
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

create policy "members can access knowledge document versions"
on public.knowledge_document_versions for all
using (
  document_id in (
    select id from public.knowledge_documents
    where company_id in (select public.current_user_company_ids())
  )
)
with check (
  document_id in (
    select id from public.knowledge_documents
    where company_id in (select public.current_user_company_ids())
  )
);

create policy "members can access training jobs"
on public.ai_training_jobs for all
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

create policy "members can access training sources"
on public.ai_training_sources for all
using (
  training_job_id in (
    select id from public.ai_training_jobs
    where company_id in (select public.current_user_company_ids())
  )
)
with check (
  training_job_id in (
    select id from public.ai_training_jobs
    where company_id in (select public.current_user_company_ids())
  )
);

create policy "members can access sales playbooks"
on public.sales_playbooks for all
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

create policy "members can access sales playbook stages"
on public.sales_playbook_stages for all
using (
  playbook_id in (
    select id from public.sales_playbooks
    where company_id in (select public.current_user_company_ids())
  )
)
with check (
  playbook_id in (
    select id from public.sales_playbooks
    where company_id in (select public.current_user_company_ids())
  )
);

create policy "members can access objections"
on public.objections for all
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

create policy "members can access call intelligence"
on public.ai_call_intelligence for all
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

create policy "members can access conversation memories"
on public.conversation_memories for all
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

create policy "members can access training examples"
on public.training_examples for all
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));
