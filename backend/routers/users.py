from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserCreate, UserUpdate, UserOut
from auth_utils import hash_password
from deps import get_current_user, require_roles

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return [UserOut.model_validate(u) for u in db.query(User).order_by(User.created_at.asc()).all()]


@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db),
                _: User = Depends(require_roles("Admin"))):
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "Email already exists")
    u = User(
        name=payload.name, email=email, role=payload.role,
        is_active=payload.is_active,
        password_hash=hash_password(payload.password),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return UserOut.model_validate(u)


@router.put("/{uid}", response_model=UserOut)
def update_user(uid: int, payload: UserUpdate, db: Session = Depends(get_db),
                _: User = Depends(require_roles("Admin"))):
    u = db.query(User).filter(User.id == uid).first()
    if not u:
        raise HTTPException(404, "User not found")
    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        u.password_hash = hash_password(data.pop("password"))
    for k, v in data.items():
        setattr(u, k, v)
    db.commit()
    db.refresh(u)
    return UserOut.model_validate(u)


@router.delete("/{uid}", status_code=204)
def delete_user(uid: int, db: Session = Depends(get_db),
                _: User = Depends(require_roles("Admin"))):
    u = db.query(User).filter(User.id == uid).first()
    if not u:
        raise HTTPException(404, "User not found")
    db.delete(u)
    db.commit()
    return None
