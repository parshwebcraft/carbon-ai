from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Appointment, User
from schemas import AppointmentCreate, AppointmentUpdate, AppointmentOut
from deps import get_current_user

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("", response_model=List[AppointmentOut])
def list_appointments(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    items = db.query(Appointment).order_by(Appointment.appointment_date.desc()).all()
    return [AppointmentOut.model_validate(a) for a in items]


@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db),
                       _: User = Depends(get_current_user)):
    a = Appointment(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return AppointmentOut.model_validate(a)


@router.put("/{aid}", response_model=AppointmentOut)
def update_appointment(aid: int, payload: AppointmentUpdate,
                       db: Session = Depends(get_db),
                       _: User = Depends(get_current_user)):
    a = db.query(Appointment).filter(Appointment.id == aid).first()
    if not a:
        raise HTTPException(404, "Appointment not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return AppointmentOut.model_validate(a)


@router.delete("/{aid}", status_code=204)
def delete_appointment(aid: int, db: Session = Depends(get_db),
                       _: User = Depends(get_current_user)):
    a = db.query(Appointment).filter(Appointment.id == aid).first()
    if not a:
        raise HTTPException(404, "Appointment not found")
    db.delete(a)
    db.commit()
    return None
