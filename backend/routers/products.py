from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Product, User
from schemas import ProductCreate, ProductUpdate, ProductOut
from deps import get_current_user, require_roles

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=List[ProductOut])
def list_products(
    category: Optional[str] = None,
    metal_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Product)
    if category:
        q = q.filter(Product.category == category)
    if metal_type:
        q = q.filter(Product.metal_type == metal_type)
    if search:
        q = q.filter(Product.product_name.ilike(f"%{search}%"))
    return [ProductOut.model_validate(p) for p in q.order_by(Product.created_at.desc()).all()]


@router.get("/{pid}", response_model=ProductOut)
def get_product(pid: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    p = db.query(Product).filter(Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Product not found")
    return ProductOut.model_validate(p)


@router.post("", response_model=ProductOut, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db),
                   _: User = Depends(require_roles("Admin", "Manager"))):
    p = Product(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return ProductOut.model_validate(p)


@router.put("/{pid}", response_model=ProductOut)
def update_product(pid: int, payload: ProductUpdate, db: Session = Depends(get_db),
                   _: User = Depends(require_roles("Admin", "Manager"))):
    p = db.query(Product).filter(Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Product not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return ProductOut.model_validate(p)


@router.delete("/{pid}", status_code=204)
def delete_product(pid: int, db: Session = Depends(get_db),
                   _: User = Depends(require_roles("Admin"))):
    p = db.query(Product).filter(Product.id == pid).first()
    if not p:
        raise HTTPException(404, "Product not found")
    db.delete(p)
    db.commit()
    return None
