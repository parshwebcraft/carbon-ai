import os
import logging
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Quotation, User, Lead, Company, WhatsappMessage
from schemas import QuotationCreate, QuotationUpdate, QuotationOut
from deps import get_current_user
from services.automation_engine import trigger_automation
from services import whatsapp_cloud, pdf_generator

logger = logging.getLogger("facets.quotations")
router = APIRouter(prefix="/quotations", tags=["quotations"])


def _gen_number(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    count = db.query(Quotation).count() + 1
    return f"QT-{year}-{count:05d}"


@router.get("", response_model=List[QuotationOut])
def list_quotations(lead_id: Optional[int] = None, db: Session = Depends(get_db),
                    _: User = Depends(get_current_user)):
    q = db.query(Quotation)
    if lead_id is not None:
        q = q.filter(Quotation.lead_id == lead_id)
    return [QuotationOut.model_validate(i) for i in q.order_by(Quotation.created_at.desc()).all()]


@router.post("", response_model=QuotationOut, status_code=201)
def create_quotation(payload: QuotationCreate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    company_id = lead.company_id if lead else current_user.company_id

    q = Quotation(
        company_id=company_id,
        lead_id=payload.lead_id,
        amount=payload.amount,
        status=payload.status,
        quotation_number=_gen_number(db),
        notes=payload.notes,
        items_json=payload.items_json,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    try:
        trigger_automation(db, "quotation_generated", q.id)
    except Exception as e:
        logger.error("Failed to trigger quotation_generated automation: %s", e)
    return QuotationOut.model_validate(q)


@router.put("/{qid}", response_model=QuotationOut)
def update_quotation(qid: int, payload: QuotationUpdate, db: Session = Depends(get_db),
                     _: User = Depends(get_current_user)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(q, k, v)
    db.commit()
    db.refresh(q)
    return QuotationOut.model_validate(q)


@router.get("/{qid}/pdf")
def get_quotation_pdf(qid: int, db: Session = Depends(get_db),
                      _: User = Depends(get_current_user)):
    """Generate or download the quotation PDF document."""
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    lead = db.query(Lead).filter(Lead.id == q.lead_id).first()
    company = db.query(Company).filter(Company.id == q.company_id).first() if q.company_id else None

    pdf_path = pdf_generator.generate_quotation_pdf(
        quotation_data={
            "quotation_number": q.quotation_number,
            "amount": q.amount,
            "status": q.status,
            "created_at": q.created_at,
            "items_json": q.items_json,
        },
        lead_data={
            "name": lead.name if lead else f"Lead #{q.lead_id}",
            "phone": lead.phone if lead else "",
            "email": lead.email if lead else "",
            "city": lead.city if lead else "",
            "company": lead.company if lead else "",
        },
        company_data={
            "name": company.name if company else "ParshWebCraft Technologies"
        }
    )
    filename = f"Quotation_{q.quotation_number.replace('/', '_')}.pdf"
    return FileResponse(pdf_path, media_type="application/pdf", filename=filename)


@router.post("/{qid}/send-whatsapp")
def send_quotation_whatsapp(qid: int, db: Session = Depends(get_db),
                            _: User = Depends(get_current_user)):
    """Generate professional PDF for quotation and deliver via WhatsApp Cloud API."""
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    lead = db.query(Lead).filter(Lead.id == q.lead_id).first()
    if not lead or not lead.phone:
        raise HTTPException(400, "Lead has no phone number configured")

    company = db.query(Company).filter(Company.id == q.company_id).first() if q.company_id else None
    company_name = company.name if company else "ParshWebCraft Technologies"

    # Generate PDF
    pdf_path = pdf_generator.generate_quotation_pdf(
        quotation_data={
            "quotation_number": q.quotation_number,
            "amount": q.amount,
            "status": q.status,
            "created_at": q.created_at,
            "items_json": q.items_json,
        },
        lead_data={
            "name": lead.name,
            "phone": lead.phone,
            "email": lead.email or "",
            "city": lead.city or "",
            "company": lead.company or "",
        },
        company_data={
            "name": company_name
        }
    )

    public_base = os.environ.get("PUBLIC_BASE_URL", "https://api.parshagent.com").rstrip("/")
    filename = f"Quotation_{q.quotation_number.replace('/', '_')}.pdf"
    pdf_url = f"{public_base}/uploads/quotations/{q.quotation_number.replace('/', '_')}.pdf"

    caption = f"Official Quotation #{q.quotation_number} from {company_name} (Total: Rs. {q.amount:,.2f})."
    sent = None
    delivered_via_cloud = False

    try:
        if whatsapp_cloud.is_configured():
            sent = whatsapp_cloud.send_document(
                to=lead.phone,
                document_url=pdf_url,
                filename=filename,
                caption=caption,
                company_id=q.company_id or lead.company_id,
            )
            delivered_via_cloud = True
    except Exception as e:
        logger.error("Failed to send quotation document via WhatsApp: %s", e)
        raise HTTPException(502, f"WhatsApp send failed: {e}")

    # Update quotation record
    q.pdf_url = pdf_url
    q.status = "Sent"

    # Record message in conversation thread
    msg = WhatsappMessage(
        lead_id=lead.id,
        company_id=q.company_id or lead.company_id,
        direction="out",
        message=f"[DOCUMENT] {filename} - {caption}",
        media_type="document",
        media_url=pdf_url,
        media_filename=filename,
        media_caption=caption,
    )
    db.add(msg)
    db.commit()
    db.refresh(q)

    return {
        "ok": True,
        "delivered_via_cloud": delivered_via_cloud,
        "pdf_url": pdf_url,
        "filename": filename,
        "meta_response": sent,
    }


@router.delete("/{qid}", status_code=204)
def delete_quotation(qid: int, db: Session = Depends(get_db),
                     _: User = Depends(get_current_user)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    db.delete(q)
    db.commit()
    return None


@router.post("/delete-multiple", status_code=204)
def delete_multiple_quotations(qid_list: list[int], db: Session = Depends(get_db),
                               _: User = Depends(get_current_user)):
    db.query(Quotation).filter(Quotation.id.in_(qid_list)).delete(synchronize_session=False)
    db.commit()
    return None


@router.post("/delete-all", status_code=204)
def delete_all_quotations(db: Session = Depends(get_db),
                          _: User = Depends(get_current_user)):
    db.query(Quotation).delete(synchronize_session=False)
    db.commit()
    return None
