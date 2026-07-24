# ParshCall AI Development Checklist

## Foundation

- [x] Confirm foundation-first direction.
- [x] Keep existing JavaScript React app and current UI structure.
- [x] Keep existing custom login working.
- [x] Use placeholder Supabase environment variables.
- [x] Start with fresh seeded development data.
- [x] Make ParshWebCraft the default tenant.
- [x] Add initial architecture documentation.
- [x] Add initial Supabase migration and seed files.
- [ ] Apply Supabase migrations after credentials are supplied.
- [ ] Verify all existing modules against Supabase PostgreSQL.

## Module 1: Knowledge Base

- [ ] Create backend document metadata APIs.
- [ ] Add Supabase Storage upload support.
- [ ] Add document version history.
- [ ] Add folder and tag support.
- [ ] Add chunking and searchable text extraction.
- [ ] Add frontend Knowledge Base module.

## Module 2: Business Profile

- [ ] Create business profile APIs.
- [ ] Seed ParshWebCraft profile.
- [ ] Add frontend Business Settings screen.
- [ ] Feed profile into AI context builder.

## Module 3: AI Training Center

- [ ] Create training job APIs.
- [ ] Track documents used, embeddings count, token count, and progress.
- [ ] Add admin approval flow for training sources.
- [ ] Add frontend Training Center screen.

## Module 4: Sales Playbook

- [ ] Create sales playbook APIs.
- [ ] Seed default ParshWebCraft stages.
- [ ] Add admin editor.
- [ ] Connect playbook to voice-agent prompts.

## Module 5: Objection Library

- [ ] Create objection APIs.
- [ ] Seed default objections.
- [ ] Track success rate.
- [ ] Connect objection retrieval to AI calling flow.

## Module 6: AI Calling Intelligence

- [ ] Store structured call intelligence.
- [ ] Store transcript and recording references.
- [ ] Update CRM next actions after calls.
- [ ] Store learning-loop examples for admin approval.

## Guardrails

- [ ] Do not rewrite existing UI.
- [ ] Do not rename working routes.
- [ ] Do not remove existing APIs.
- [ ] Do not delete existing code.
- [ ] Keep PWA behavior working.
- [ ] Use environment variables for all Supabase, OpenAI, Vapi, and storage credentials.

