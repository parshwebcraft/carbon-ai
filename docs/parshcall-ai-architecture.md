# ParshCall AI Architecture

## Objective

ParshCall AI extends the existing ParshWebCraft CRM into a multi-company AI Business Operating System, beginning with an AI Sales Calling Agent. The current CRM modules, routes, UI structure, and login flow remain intact while Supabase PostgreSQL, Supabase Storage, and Supabase Auth are introduced in parallel.

## Migration Strategy

Phase 1 is foundation-first:

- Add Supabase PostgreSQL schema and migrations.
- Add multi-company tables with ParshWebCraft as the default tenant.
- Keep current FastAPI routes and custom JWT login working.
- Add Supabase Auth metadata in parallel without switching authentication yet.
- Use Supabase Storage for future Knowledge Base documents and call recordings.
- Start with fresh seeded development data.

The existing SQLite database remains useful for local continuity until Supabase credentials are supplied. No SQLite data migration is planned.

## Data Model

Core tenant tables:

- `companies`: tenant/business account.
- `company_users`: maps Supabase Auth users or legacy CRM users to a company and role.
- `business_profiles`: company-level AI context.

Knowledge and training:

- `knowledge_documents`: uploaded/imported/manual Knowledge Base documents.
- `knowledge_document_versions`: version history for each document.
- `knowledge_chunks`: searchable chunks with embedding metadata.
- `ai_training_jobs`: training runs and progress.
- `ai_training_sources`: documents/profiles/calls used by a training job.
- `training_examples`: approved learning-loop examples from calls and admin feedback.

Sales intelligence:

- `sales_playbooks`: editable company playbooks.
- `sales_playbook_stages`: stage-by-stage scripts and goals.
- `objections`: objection library with responses and escalation rules.
- `ai_call_intelligence`: structured call outcomes.
- `conversation_memories`: durable customer memory.

Existing CRM tables should later receive `company_id` in Supabase migrations so all data is tenant-scoped. During the transition, new AI OS tables are tenant-scoped first.

## Storage

Supabase Storage buckets:

- `knowledge-base`: PDFs, DOCX, TXT, Markdown, CSV, and imported website snapshots.
- `call-recordings`: Vapi/Twilio recordings.
- `training-artifacts`: generated summaries, approved datasets, and export files.

File metadata lives in PostgreSQL. Storage paths should include `company_id` and document/call identifiers.

## Auth

Current behavior:

- Existing `/api/auth/login`, `/api/auth/refresh`, `/api/auth/me`, and JWT tokens continue to work.

Supabase-ready behavior:

- Supabase Auth users map to `company_users.auth_user_id`.
- RLS policies use `auth.uid()` to restrict rows to companies where the user is a member.
- Cutover to Supabase Auth happens only after existing modules are verified against the Supabase database.

## API List

Existing APIs remain unchanged.

Foundation APIs:

- `GET /api/foundation/status`: shows Supabase readiness, default company slug, and planned module status.

Planned module APIs:

- `GET/POST /api/knowledge-base/documents`
- `GET/POST /api/knowledge-base/documents/{id}/versions`
- `POST /api/knowledge-base/documents/{id}/process`
- `GET/POST/PATCH /api/business-profile`
- `GET/POST /api/ai-training/jobs`
- `POST /api/ai-training/jobs/{id}/approve-source`
- `GET/POST/PATCH /api/sales-playbooks`
- `GET/POST/PATCH /api/objections`
- `GET /api/calling-intelligence/calls`
- `GET /api/conversation-memory/leads/{lead_id}`

## Folder Structure

```text
backend/
  routers/
    foundation.py
    knowledge_base.py        # planned
    business_profile.py      # planned
    ai_training.py           # planned
    sales_playbooks.py       # planned
    objections.py            # planned
    calling_intelligence.py  # planned
  services/
    supabase_config.py
    knowledge_base.py        # planned
    ai_training.py           # planned
    vapi_agent.py            # planned
  models.py
  schemas.py
docs/
  parshcall-ai-architecture.md
  parshcall-ai-development-checklist.md
supabase/
  migrations/
    202607230001_foundation.sql
  seed.sql
```

## Implementation Plan

1. Add architecture docs, Supabase migration files, and environment placeholders.
2. Add tenant-aware foundation models and status endpoint.
3. Implement Knowledge Base storage metadata, upload flow, and versioning.
4. Implement Business Profile editing and AI context retrieval.
5. Implement AI Training Center jobs, source selection, status display, and admin approval.
6. Implement Sales Playbook and Objection Library CRUD.
7. Implement AI Calling Intelligence storage for Vapi/Twilio call outcomes.
8. Add analytics views using the structured call intelligence tables.
9. Add Supabase Auth cutover path after current login and modules are stable.

