from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Quotation, User
from schemas import QuotationCreate, QuotationUpdate, QuotationOut
from deps import get_current_user

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
                     _: User = Depends(get_current_user)):
    q = Quotation(
        lead_id=payload.lead_id,
        amount=payload.amount,
        status=payload.status,
        quotation_number=_gen_number(db),
    )
    db.add(q)
    db.commit()
    db.refresh(q)
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


@router.delete("/{qid}", status_code=204)
def delete_quotation(qid: int, db: Session = Depends(get_db),
                     _: User = Depends(get_current_user)):
    q = db.query(Quotation).filter(Quotation.id == qid).first()
    if not q:
        raise HTTPException(404, "Quotation not found")
    db.delete(q)
    db.commit()
    return None
