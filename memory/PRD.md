# Facets Lifestyle Jewellery CRM — PRD

## Problem statement (verbatim, distilled)
Internal CRM MVP for Facets Lifestyle Jewellery. Manage leads end-to-end: capture,
qualify, call (manual + AI bulk), WhatsApp, products, appointments, quotations,
AI agent logs, dashboards. Multi-role (Admin / Manager / Sales). Designed to plug
into Vapi (voice) and Meta WhatsApp Cloud without code refactor.

## Architecture
- **Backend**: FastAPI 0.110, SQLAlchemy 2.0, SQLite (`/app/backend/facets.db`),
  JWT (HS256, 8h access / 7d refresh), bcrypt, Faker. Async background scheduler
  for follow-ups + an always-on **campaign engine** for bulk AI calling.
- **Frontend**: React 19, React Router 7, Tailwind, shadcn/ui, recharts, sonner.
  PWA (manifest + service worker + offline page).
- **Optional integrations** (graceful fallback when keys missing):
  - DeepSeek (`/api/ai/*`)
  - Vapi.ai voice (`/api/voice/*`, used by the campaign engine automatically when
    `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID` (+ optional `VAPI_ASSISTANT_ID`) are set)
  - Meta WhatsApp Cloud API

## User personas
1. **Admin** – manages users, settings, all data, all campaigns.
2. **Manager** – manages leads, campaigns, calling settings; reads everything.
3. **Sales** – owns assigned leads, tasks, calls, WhatsApp, appointments,
   quotations; cannot create/edit campaigns or modify global settings.

## Core requirements (static)
- Auth + RBAC (Admin / Manager / Sales).
- Leads CRUD + filters + pagination.
- Activities timeline per lead.
- Tasks + due dates + auto-creation from AI calls.
- Calls (manual + AI bulk via campaigns) with transcript / sentiment.
- WhatsApp threads (mocked + Cloud webhook).
- Products, Appointments, Quotations (auto QT-YYYY-#####).
- AI agent logs.
- Dashboard tiles + charts.
- **Bulk AI Calling Campaigns** (new this iteration):
  - Source: CRM leads (status/source/owner/city filters) **and/or** CSV upload.
  - Static campaign script + per-lead override.
  - Pacing: configurable daily cap, calling window (IST), calls/minute.
  - Engine processes pending targets through a pluggable dialer
    (`MockDialer` by default, `Vapi` when env keys are set — no code change).
  - Jewellery-specific outcome taxonomy: Bridal Inquiry, Gold Purchase, Diamond
    Purchase, Exchange Inquiry, Investment Gold, Appointment Booked, Quotation
    Requested, Not Interested.
  - Automations on completed calls: update Lead status (with precedence so we
    never downgrade), insert Activity timeline row, insert AIAgentLog, insert
    legacy Call row, auto-create follow-up Task on interested / showroom-visit /
    quotation / callback.
  - Analytics: total calls, connected, interested, appointments, quotations,
    conversion rate, sentiment + outcome distributions, average lead score.

## What's been implemented
**2026-01 (initial preview)**
- Repo (`carcon-ai-main.zip`) imported, env wired, deps installed, supervisor
  configured. All existing modules verified end-to-end.

**2026-01 (this iteration — Bulk AI Calling)**
- DB tables: `settings`, `campaigns`, `campaign_targets`.
- Services: `services/campaign_dialer.py` (Mock + Vapi auto-switch),
  `services/campaign_engine.py` (background loop, manual `/tick`, pacing,
  IST window, daily cap, automations with status-precedence).
- Routers: `routers/settings.py` and `routers/campaigns.py`.
- Frontend: `/campaigns` list + new-campaign wizard (filters + CSV + pacing),
  `/campaigns/:id` detail (7 headline tiles, outcome bar chart, sentiment donut,
  funnel chips, paginated queue, CSV upload, lifecycle actions).
- Tested: 30 new pytest cases + frontend Playwright runs. 98.7% backend (single
  failure is a pre-existing flaky iteration-2 test unrelated to this work),
  100% frontend.

## Prioritised backlog
**P0**
- (none — feature complete and tested)

**P1**
- Live attempts retry policy (retry busy/no_answer after N hours, max attempts).
- Per-campaign owner assignment + auto-route created leads to a specific user.
- Real Vapi integration testing (drop in keys + verify webhook flow).
- Bulk WhatsApp follow-up after a successful AI call.

**P2**
- Push notifications when "interested" outcome lands on an assigned lead.
- Razorpay/Stripe advance payments from quotations.
- CSV bulk lead import (outside campaigns) into the main Leads grid.
- Reports: funnel, agent revenue, source ROI.
- SQLite → SQL Server / Postgres migration.

## Next tasks
1. Decide if we want to enable Vapi in the preview (paste keys → switch).
2. Add retry policy + max attempts per target.
3. Push notifications for hot outcomes.
