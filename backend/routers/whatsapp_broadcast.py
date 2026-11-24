"""API endpoints for Bulk WhatsApp Broadcasts & Retargeting Campaigns."""
from __future__ import annotations

import csv
import io
import re
import json
import logging
from typing import Optional, List, Any, Union, Dict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from pydantic import BaseModel

from database import get_db
from models import WhatsAppBroadcast, WhatsAppBroadcastRecipient, Lead, User
from deps import get_current_user
from services.whatsapp_broadcast_runner import run_broadcast_job

logger = logging.getLogger("facets.whatsapp_broadcast")
router = APIRouter(prefix="/whatsapp/broadcasts", tags=["whatsapp_broadcasts"])


class BroadcastButtonIn(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    display_text: Optional[str] = None
    url: Optional[str] = None
    header: Optional[str] = None
    footer: Optional[str] = None


class CreateBroadcastIn(BaseModel):
    name: str
    message_template: str
    lead_ids: Optional[List[int]] = None
    filter_status: Optional[str] = None
    filter_source: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # document | image
    media_filename: Optional[str] = None
    buttons: Optional[Any] = None
    interactive_type: Optional[str] = None  # button | cta_url | template
    delay_seconds: Optional[int] = 3


class AudiencePreviewIn(BaseModel):
    lead_ids: Optional[List[int]] = None
    filter_status: Optional[str] = None
    filter_source: Optional[str] = None


class UploadedContactIn(BaseModel):
    name: str
    phone: str
    city: Optional[str] = None
    company: Optional[str] = None


class ImportAndLaunchBroadcastIn(BaseModel):
    name: str
    message_template: str
    recipients: List[UploadedContactIn]
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    media_filename: Optional[str] = None
    buttons: Optional[Any] = None
    interactive_type: Optional[str] = None
    delay_seconds: Optional[int] = 3
    save_to_leads: Optional[bool] = True


def sanitize_phone(raw_val: Any) -> Optional[str]:
    """Sanitize and validate an Indian or international mobile phone number."""
    if raw_val is None:
        return None
    val_str = str(raw_val).strip()
    if val_str.endswith(".0"):
        val_str = val_str[:-2]
    # Remove any non-digit characters
    digits = re.sub(r"[^\d]", "", val_str)
    if not digits:
        return None
    if len(digits) == 10:
        return f"+91{digits}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    elif len(digits) >= 10:
        return f"+{digits}"
    return None


def parse_contacts_file(contents: bytes, filename: str) -> Dict[str, Any]:
    """Parse Excel (.xlsx, .xls) or CSV sheet into validated recipients list."""
    fn = filename.lower()
    rows = []

    if fn.endswith(".csv"):
        text = None
        for enc in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
            try:
                text = contents.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if not text:
            raise HTTPException(400, "Unable to decode CSV file. Please ensure it is saved in UTF-8 or Standard CSV format.")

        reader = csv.DictReader(io.StringIO(text))
        for r in reader:
            if any(r.values()):
                rows.append(r)

    elif fn.endswith((".xlsx", ".xls")):
        try:
            import pandas as pd
            df = pd.read_excel(io.BytesIO(contents))
            df = df.fillna("")
            rows = df.to_dict(orient="records")
        except Exception as e:
            logger.error("Failed to parse Excel file: %s", e)
            raise HTTPException(400, f"Failed to read Excel file: {str(e)}")
    else:
        raise HTTPException(400, "Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.")

    if not rows:
        raise HTTPException(400, "The uploaded file contains no data rows.")

    sample_keys = list(rows[0].keys())
    name_col = None
    first_name_col = None
    last_name_col = None
    phone_cols = []
    city_col = None
    company_col = None

    for k in sample_keys:
        k_str = str(k).strip()
        k_clean = re.sub(r"[^a-zA-Z0-9]", "", k_str.lower())

        # Phone column detection (handles standard Phone/Mobile, and Google Contacts 'Phone 1 - Value')
        if any(p in k_clean for p in ["phone", "mobile", "contact", "whatsapp", "cell"]):
            if "type" not in k_clean:  # Skip 'Phone 1 - Type'
                phone_cols.append(k)

        # Name column detection
        if not name_col and k_clean in ["name", "fullname", "leadname", "customername", "client"]:
            name_col = k
        elif not first_name_col and any(f in k_clean for f in ["firstname", "givenname"]):
            first_name_col = k
        elif not last_name_col and any(l in k_clean for l in ["lastname", "familyname", "surname"]):
            last_name_col = k
        elif not name_col and any(n in k_clean for n in ["name", "lead", "client", "customer", "person"]):
            name_col = k

        # City & Company
        if not city_col and any(c in k_clean for c in ["city", "location", "place", "state", "town", "address"]):
            city_col = k
        elif not company_col and any(co in k_clean for co in ["company", "organizationname", "organization", "business", "firm", "agency", "org"]):
            company_col = k

    if not phone_cols:
        raise HTTPException(
            400,
            f"Could not find a 'Phone' or 'Mobile' column. Found columns: {', '.join(str(k) for k in sample_keys[:6])}. Please rename your contact number column to 'Phone' or 'Mobile'."
        )

    valid_recipients = []
    seen_phones = set()
    invalid_count = 0

    for r in rows:
        # Check phone across detected phone columns (e.g. Phone 1 - Value, Phone 2 - Value)
        raw_phone = None
        for pcol in phone_cols:
            val = r.get(pcol)
            if val and str(val).strip():
                raw_phone = val
                break

        clean_phone = sanitize_phone(raw_phone)
        if not clean_phone or clean_phone in seen_phones:
            invalid_count += 1
            continue

        seen_phones.add(clean_phone)

        # Construct name (combines First Name + Last Name if exported from Google Contacts)
        raw_name = ""
        if name_col:
            raw_name = str(r.get(name_col) or "").strip()
        elif first_name_col or last_name_col:
            fn_part = str(r.get(first_name_col) or "").strip() if first_name_col else ""
            ln_part = str(r.get(last_name_col) or "").strip() if last_name_col else ""
            raw_name = f"{fn_part} {ln_part}".strip()

        if not raw_name or raw_name.lower() in ("nan", "none", "null", "undefined"):
            raw_name = f"Customer {clean_phone[-4:]}"

        city_val = str(r.get(city_col) or "").strip() if city_col else ""
        if city_val.lower() in ("nan", "none", "null"):
            city_val = ""

        company_val = str(r.get(company_col) or "").strip() if company_col else ""
        if company_val.lower() in ("nan", "none", "null"):
            company_val = ""

        valid_recipients.append({
            "name": raw_name,
            "phone": clean_phone,
            "city": city_val,
            "company": company_val,
        })

    return {
        "filename": filename,
        "total_rows": len(rows),
        "valid_count": len(valid_recipients),
        "invalid_count": invalid_count,
        "detected_columns": {
            "name": name_col or f"{first_name_col} + {last_name_col}",
            "phone": phone_cols[0] if phone_cols else None,
            "city": city_col,
            "company": company_col,
        },
        "sample": valid_recipients[:10],
        "recipients": valid_recipients,
    }


def _resolve_leads(db: Session, company_id: Optional[str], lead_ids: Optional[List[int]], filter_status: Optional[str], filter_source: Optional[str]) -> List[Lead]:
    q = db.query(Lead).filter(Lead.phone.isnot(None), Lead.phone != "")
    if company_id:
        q = q.filter(Lead.company_id == company_id)

    if lead_ids:
        q = q.filter(Lead.id.in_(lead_ids))
        return q.all()

    if filter_status and filter_status != "all":
        statuses = [s.strip() for s in filter_status.split(",") if s.strip()]
        if statuses:
            q = q.filter(Lead.status.in_(statuses))

    if filter_source and filter_source != "all":
        sources = [s.strip() for s in filter_source.split(",") if s.strip()]
        if sources:
            q = q.filter(Lead.source.in_(sources))

    return q.all()


@router.get("")
def list_broadcasts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all WhatsApp broadcast campaigns for the current company."""
    cid = current_user.company_id
    q = db.query(WhatsAppBroadcast)
    if cid:
        q = q.filter(WhatsAppBroadcast.company_id == cid)
    items = q.order_by(desc(WhatsAppBroadcast.created_at)).all()

    # Calculate summary stats
    total_broadcasts = len(items)
    total_sent = sum(b.sent_count or 0 for b in items)
    total_delivered = sum(b.delivered_count or 0 for b in items)
    total_read = sum(b.read_count or 0 for b in items)
    total_replied = sum(getattr(b, "replied_count", 0) or 0 for b in items)

    return {
        "items": [
            {
                "id": b.id,
                "name": b.name,
                "message_template": b.message_template,
                "media_type": b.media_type,
                "media_url": b.media_url,
                "media_filename": b.media_filename,
                "interactive_type": b.interactive_type,
                "status": b.status,
                "total_recipients": b.total_recipients,
                "sent_count": b.sent_count,
                "delivered_count": b.delivered_count,
                "read_count": b.read_count,
                "replied_count": getattr(b, "replied_count", 0) or 0,
                "failed_count": b.failed_count,
                "delay_seconds": b.delay_seconds,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "started_at": b.started_at.isoformat() if b.started_at else None,
                "completed_at": b.completed_at.isoformat() if b.completed_at else None,
            }
            for b in items
        ],
        "summary": {
            "total_broadcasts": total_broadcasts,
            "total_sent": total_sent,
            "total_delivered": total_delivered,
            "total_read": total_read,
            "total_replied": total_replied,
        }
    }


@router.post("/preview-audience")
def preview_audience(
    payload: AudiencePreviewIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview matching lead count and sample recipients before dispatching a broadcast."""
    leads = _resolve_leads(db, current_user.company_id, payload.lead_ids, payload.filter_status, payload.filter_source)
    return {
        "count": len(leads),
        "sample": [
            {
                "id": l.id,
                "name": l.name,
                "phone": l.phone,
                "status": l.status,
                "source": l.source,
                "city": l.city,
            }
            for l in leads[:10]
        ]
    }


@router.get("/sample-template")
def download_sample_template(format: str = "xlsx"):
    """Return a ready-made sample Excel (.xlsx) or CSV template for bulk WhatsApp broadcasts."""
    if format == "csv":
        sample_csv = (
            "Name,Phone,City,Company\n"
            "Gauransh Jaroli,9810439560,Jaipur,ParshWebCraft\n"
            "Muskan Pachori,7878202183,Indore,Creative Studio\n"
            "Celina Sagore,8269894771,Bhopal,Sagore Tech\n"
            "Nupur Jaroli,7878373338,Jaipur,Enterprise Client\n"
            "Rahul Sharma,9876543210,Delhi,Sharma Enterprises\n"
        )
        return Response(
            content=sample_csv,
            media_type="text/csv",
            headers={
                "Content-Disposition": 'attachment; filename="ParshAgent_Broadcast_Sample.csv"'
            }
        )

    # Return Styled Excel (.xlsx)
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Broadcast Contacts"

        headers = ["Name", "Phone", "City", "Company"]
        ws.append(headers)

        header_fill = PatternFill(start_color="107C41", end_color="107C41", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")

        samples = [
            ["Gauransh Jaroli", "9810439560", "Jaipur", "ParshWebCraft"],
            ["Muskan Pachori", "7878202183", "Indore", "Creative Studio"],
            ["Celina Sagore", "8269894771", "Bhopal", "Sagore Tech"],
            ["Nupur Jaroli", "7878373338", "Jaipur", "Enterprise Client"],
            ["Rahul Sharma", "9876543210", "Delhi", "Sharma Enterprises"],
        ]
        for row in samples:
            ws.append(row)

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 15)

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return Response(
            content=stream.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": 'attachment; filename="ParshAgent_Broadcast_Sample.xlsx"'
            }
        )
    except Exception as e:
        logger.error("Failed to generate sample Excel: %s", e)
        sample_csv = "Name,Phone,City,Company\nGauransh Jaroli,9810439560,Jaipur,ParshWebCraft\n"
        return Response(
            content=sample_csv,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="ParshAgent_Broadcast_Sample.csv"'}
        )


@router.post("/parse-file")
async def parse_contacts_upload(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload and parse an Excel (.xlsx, .xls) or CSV file containing audience contacts."""
    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Uploaded file is empty")
    return parse_contacts_file(contents, file.filename or "contacts.csv")


@router.post("/import-and-launch")
def import_and_launch_broadcast(
    payload: ImportAndLaunchBroadcastIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import contacts from parsed Excel/CSV, optionally save them to Leads CRM, and launch broadcast."""
    if not payload.name or not payload.name.strip():
        raise HTTPException(400, "Campaign name is required")
    if not payload.message_template or not payload.message_template.strip():
        raise HTTPException(400, "Message template is required")
    if not payload.recipients or len(payload.recipients) == 0:
        raise HTTPException(400, "At least one recipient contact is required")

    cid = current_user.company_id

    # Format buttons payload if provided
    buttons_json_str = None
    if payload.buttons:
        if isinstance(payload.buttons, dict):
            buttons_json_str = json.dumps(payload.buttons)
        elif payload.interactive_type == "cta_url" and isinstance(payload.buttons, list) and len(payload.buttons) > 0:
            b = payload.buttons[0]
            if isinstance(b, dict):
                buttons_json_str = json.dumps({
                    "display_text": b.get("display_text") or b.get("title") or "Open Link",
                    "url": b.get("url") or "https://parshwebcraft.com",
                    "header": b.get("header"),
                    "footer": b.get("footer"),
                })
        elif isinstance(payload.buttons, list):
            clean_btns = []
            for i, b in enumerate(payload.buttons[:3]):
                if isinstance(b, dict):
                    clean_btns.append({"id": b.get("id") or f"btn_{i+1}", "title": (b.get("title") or f"Option {i+1}")[:20]})
                else:
                    clean_btns.append({"id": b.id or f"btn_{i+1}", "title": (b.title or f"Option {i+1}")[:20]})
            buttons_json_str = json.dumps(clean_btns)

    broadcast = WhatsAppBroadcast(
        company_id=cid,
        name=payload.name.strip(),
        message_template=payload.message_template.strip(),
        media_url=payload.media_url,
        media_type=payload.media_type,
        media_filename=payload.media_filename,
        buttons_json=buttons_json_str,
        interactive_type=payload.interactive_type,
        filter_status="Excel Upload",
        filter_source="Excel Import",
        delay_seconds=max(1, min(15, payload.delay_seconds or 3)),
        total_recipients=len(payload.recipients),
        sent_count=0,
        delivered_count=0,
        read_count=0,
        replied_count=0,
        failed_count=0,
        status="running",
        created_by=current_user.id,
    )
    db.add(broadcast)
    db.commit()
    db.refresh(broadcast)

    # Resolve or create CRM Leads for seamless two-way replies & chat history
    save_leads = payload.save_to_leads if payload.save_to_leads is not None else True
    lead_map: Dict[str, Lead] = {}
    if save_leads:
        phones = [r.phone for r in payload.recipients]
        existing_leads = db.query(Lead).filter(
            Lead.company_id == cid if cid else True,
            Lead.phone.in_(phones)
        ).all()
        for el in existing_leads:
            lead_map[el.phone] = el

    queued_recipients = []
    for r in payload.recipients:
        lead_id = None
        if save_leads:
            target_lead = lead_map.get(r.phone)
            if not target_lead:
                target_lead = Lead(
                    company_id=cid,
                    name=r.name,
                    phone=r.phone,
                    city=r.city,
                    source="Excel Import",
                    status="New",
                )
                db.add(target_lead)
                db.flush()
                lead_map[r.phone] = target_lead
            lead_id = target_lead.id

        rec = WhatsAppBroadcastRecipient(
            broadcast_id=broadcast.id,
            lead_id=lead_id,
            name=r.name,
            phone=r.phone,
            status="pending",
        )
        queued_recipients.append(rec)

    db.add_all(queued_recipients)
    db.commit()

    # Trigger background worker runner
    background_tasks.add_task(run_broadcast_job, broadcast.id)

    logger.info("Broadcast %s launched with %d imported recipients (save_to_leads=%s)", broadcast.id, len(payload.recipients), save_leads)

    return {
        "ok": True,
        "broadcast_id": broadcast.id,
        "total_recipients": len(payload.recipients),
        "status": "running"
    }


@router.get("/{broadcast_id}")
def get_broadcast(
    broadcast_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full details and recipient logs of a broadcast campaign."""
    b = db.query(WhatsAppBroadcast).filter(WhatsAppBroadcast.id == broadcast_id).first()
    if not b:
        raise HTTPException(404, "Broadcast not found")

    recipients = (
        db.query(WhatsAppBroadcastRecipient)
        .filter(WhatsAppBroadcastRecipient.broadcast_id == broadcast_id)
        .order_by(WhatsAppBroadcastRecipient.id.asc())
        .all()
    )

    tot = max(1, b.total_recipients or len(recipients) or 1)
    sent_cnt = b.sent_count or 0
    deliv_cnt = b.delivered_count or 0
    read_cnt = b.read_count or 0
    replied_cnt = getattr(b, "replied_count", 0) or 0
    failed_cnt = b.failed_count or 0

    return {
        "id": b.id,
        "name": b.name,
        "message_template": b.message_template,
        "media_type": b.media_type,
        "media_url": b.media_url,
        "media_filename": b.media_filename,
        "buttons_json": b.buttons_json,
        "interactive_type": b.interactive_type,
        "status": b.status,
        "total_recipients": b.total_recipients,
        "sent_count": sent_cnt,
        "delivered_count": deliv_cnt,
        "read_count": read_cnt,
        "replied_count": replied_cnt,
        "failed_count": failed_cnt,
        "sent_pct": round((sent_cnt / tot) * 100),
        "delivered_pct": round((deliv_cnt / tot) * 100),
        "read_pct": round((read_cnt / tot) * 100),
        "replied_pct": round((replied_cnt / tot) * 100),
        "failed_pct": round((failed_cnt / tot) * 100),
        "estimated_cost": round(sent_cnt * 0.80, 2),
        "delay_seconds": b.delay_seconds,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "started_at": b.started_at.isoformat() if b.started_at else None,
        "completed_at": b.completed_at.isoformat() if b.completed_at else None,
        "recipients": [
            {
                "id": r.id,
                "lead_id": r.lead_id,
                "name": r.name,
                "phone": r.phone,
                "status": r.status,
                "wa_message_id": r.wa_message_id,
                "error_message": r.error_message,
                "rendered_message": r.rendered_message,
                "sent_at": r.sent_at.isoformat() if r.sent_at else None,
                "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
                "read_at": r.read_at.isoformat() if r.read_at else None,
                "replied_at": r.replied_at.isoformat() if getattr(r, "replied_at", None) else None,
            }
            for r in recipients
        ]
    }


@router.post("")
def create_and_trigger_broadcast(
    payload: CreateBroadcastIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new WhatsApp Broadcast Campaign and trigger background sending."""
    if not payload.name or not payload.name.strip():
        raise HTTPException(400, "Campaign name is required")
    if not payload.message_template or not payload.message_template.strip():
        raise HTTPException(400, "Message template is required")

    cid = current_user.company_id
    leads = _resolve_leads(db, cid, payload.lead_ids, payload.filter_status, payload.filter_source)
    if not leads:
        raise HTTPException(400, "No leads matched the selected criteria with valid phone numbers")

    buttons_json_str = None
    if payload.buttons:
        if isinstance(payload.buttons, dict):
            buttons_json_str = json.dumps(payload.buttons)
        elif payload.interactive_type == "cta_url" and isinstance(payload.buttons, list) and len(payload.buttons) > 0:
            b = payload.buttons[0]
            if isinstance(b, dict):
                buttons_json_str = json.dumps({
                    "display_text": b.get("display_text") or b.get("title") or "Open Link",
                    "url": b.get("url") or "https://parshwebcraft.com",
                    "header": b.get("header"),
                    "footer": b.get("footer"),
                })
            else:
                buttons_json_str = json.dumps({
                    "display_text": b.display_text or b.title or "Open Link",
                    "url": b.url or "https://parshwebcraft.com",
                    "header": b.header,
                    "footer": b.footer,
                })
        elif isinstance(payload.buttons, list):
            clean_btns = []
            for i, b in enumerate(payload.buttons[:3]):
                if isinstance(b, dict):
                    clean_btns.append({"id": b.get("id") or f"btn_{i+1}", "title": (b.get("title") or f"Option {i+1}")[:20]})
                else:
                    clean_btns.append({"id": b.id or f"btn_{i+1}", "title": (b.title or f"Option {i+1}")[:20]})
            buttons_json_str = json.dumps(clean_btns)

    broadcast = WhatsAppBroadcast(
        company_id=cid,
        name=payload.name.strip(),
        message_template=payload.message_template.strip(),
        media_url=payload.media_url,
        media_type=payload.media_type,
        media_filename=payload.media_filename,
        buttons_json=buttons_json_str,
        interactive_type=payload.interactive_type,
        filter_status=payload.filter_status,
        filter_source=payload.filter_source,
        delay_seconds=max(1, min(15, payload.delay_seconds or 3)),
        total_recipients=len(leads),
        sent_count=0,
        delivered_count=0,
        read_count=0,
        failed_count=0,
        status="running",
        created_by=current_user.id,
    )
    db.add(broadcast)
    db.commit()
    db.refresh(broadcast)

    # Queue recipients
    for lead in leads:
        rec = WhatsAppBroadcastRecipient(
            broadcast_id=broadcast.id,
            lead_id=lead.id,
            name=lead.name or "Valued Client",
            phone=lead.phone,
            status="pending",
        )
        db.add(rec)
    db.commit()

    # Launch execution task in background
    background_tasks.add_task(run_broadcast_job, broadcast.id)

    return {
        "ok": True,
        "broadcast_id": broadcast.id,
        "total_recipients": len(leads),
        "message": f"Broadcast '{broadcast.name}' triggered for {len(leads)} recipients"
    }


@router.post("/{broadcast_id}/cancel")
def cancel_broadcast(
    broadcast_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a running broadcast."""
    b = db.query(WhatsAppBroadcast).filter(WhatsAppBroadcast.id == broadcast_id).first()
    if not b:
        raise HTTPException(404, "Broadcast not found")

    b.status = "cancelled"
    db.commit()
    return {"ok": True, "message": "Broadcast marked as cancelled"}


@router.delete("/{broadcast_id}")
def delete_broadcast(
    broadcast_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a broadcast record."""
    b = db.query(WhatsAppBroadcast).filter(WhatsAppBroadcast.id == broadcast_id).first()
    if not b:
        raise HTTPException(404, "Broadcast not found")

    db.delete(b)
    db.commit()
    return {"ok": True}
