from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.resource import Resource
from app.models.borrow import BorrowRequest
from app.models.enums import ResourceStatus, BorrowStatus
from app.schemas.resource import ResourceListResponse
from app.schemas.borrow import BorrowRequestResponse

router = APIRouter(prefix="/admin/management", tags=["Admin Management"])

@router.get("/resources", response_model=ResourceListResponse)
def get_all_resources(
    db: Session = Depends(get_db),
    _admin = Depends(require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: Optional[ResourceStatus] = None,
):
    query = db.query(Resource)
    if status:
        query = query.filter(Resource.status == status)
        
    total = query.count()
    items = query.order_by(Resource.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    # We do not populate is_wishlisted for admin view as it's not relevant
    for item in items:
        item.is_wishlisted = False
        
    return {"items": items, "total": total}

@router.get("/borrows", response_model=list[BorrowRequestResponse])
def get_all_borrows(
    db: Session = Depends(get_db),
    _admin = Depends(require_admin),
    status: Optional[BorrowStatus] = None,
):
    query = db.query(BorrowRequest)
    if status:
        query = query.filter(BorrowRequest.status == status)
        
    return query.order_by(BorrowRequest.created_at.desc()).all()
