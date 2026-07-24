"""Supabase foundation configuration.

This module intentionally does not initialize the Supabase client yet. The current
CRM login remains active while Supabase Auth/Storage are introduced in parallel.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class SupabaseSettings:
    url: str
    anon_key: str
    service_role_key: str
    default_company_slug: str
    knowledge_bucket: str
    call_recordings_bucket: str
    training_artifacts_bucket: str

    @property
    def configured(self) -> bool:
        return bool(self.url and self.anon_key and self.service_role_key)


def get_supabase_settings() -> SupabaseSettings:
    return SupabaseSettings(
        url=os.environ.get("SUPABASE_URL", "").strip(),
        anon_key=os.environ.get("SUPABASE_ANON_KEY", "").strip(),
        service_role_key=os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip(),
        default_company_slug=os.environ.get("DEFAULT_COMPANY_SLUG", "parshwebcraft").strip(),
        knowledge_bucket=os.environ.get("SUPABASE_KNOWLEDGE_BUCKET", "knowledge-base").strip(),
        call_recordings_bucket=os.environ.get("SUPABASE_CALL_RECORDINGS_BUCKET", "call-recordings").strip(),
        training_artifacts_bucket=os.environ.get("SUPABASE_TRAINING_ARTIFACTS_BUCKET", "training-artifacts").strip(),
    )

