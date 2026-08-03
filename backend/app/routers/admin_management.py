from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.deps import require_admin, require_permissions, get_current_user
from app.models.resource import Resource
from app.models.borrow import BorrowRequest
from app.models.user import User
from app.models.misc import AuditLog
from app.models.enums import ResourceStatus, BorrowStatus, UserRole
from app.schemas.resource import ResourceListResponse
from app.schemas.borrow import BorrowRequestResponse
from app.core.exceptions import NotFoundException, ForbiddenException
from pydantic import BaseModel, ConfigDict
import uuid

router = APIRouter(prefix="/admin/management", tags=["Admin Management"])

class RoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: UserRole
    can_moderate_complaints: bool = False
    can_manage_users: bool = False
    can_resolve_damage_claims: bool = False

@router.patch("/users/{user_id}/role")
@limiter.limit("10/minute")
def update_user_role(
    request: Request,
    user_id: uuid.UUID,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_permissions("can_manage_users")),
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise NotFoundException("User not found")
        
    if target_user.id == current_admin.id:
        raise ForbiddenException("You cannot modify your own role")

    old_role = target_user.role.value
    target_user.role = payload.role
    target_user.can_moderate_complaints = payload.can_moderate_complaints
    target_user.can_manage_users = payload.can_manage_users
    target_user.can_resolve_damage_claims = payload.can_resolve_damage_claims
    
    # Audit logging
    log = AuditLog(
        actor_id=current_admin.id,
        action="update_role",
        entity_type="user",
        entity_id=str(target_user.id),
        details=f"Changed role from {old_role} to {payload.role.value}"
    )
    db.add(log)
    db.commit()
    
    return {"message": "User role updated successfully"}


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
        
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/borrows", response_model=list[BorrowRequestResponse])
def get_all_borrows(
    db: Session = Depends(get_db),
    _admin = Depends(require_admin),
    status: Optional[BorrowStatus] = None,
):
    query = db.query(BorrowRequest)
    if status:
        query = query.filter(BorrowRequest.status == status)
    items = query.order_by(BorrowRequest.created_at.desc()).all()
    for item in items:
        if item.resource:
            item.resource.is_wishlisted = False
            
    return items
