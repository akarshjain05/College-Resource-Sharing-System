import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status, BackgroundTasks, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_active_verified_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.enums import ResourceCondition, ResourceStatus, UserRole, BorrowStatus
from app.models.resource import Resource, ResourceImage
from app.models.user import User
from app.models.wishlist import WishlistItem
from app.models.borrow import BorrowRequest
from app.schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse, ResourceListResponse
from app.core.deps import get_current_user_optional
from app.services.notification_service import notify_all_except_owner_bg
from app.services.availability import get_blocked_dates
from app.core.rate_limit import limiter
from datetime import date
router = APIRouter(prefix="/resources", tags=["Resources"])


@router.get("", response_model=ResourceListResponse)
def list_resources(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search title/description/tags/owner"),
    category_id: Optional[uuid.UUID] = None,
    condition: Optional[ResourceCondition] = None,
    status_filter: Optional[ResourceStatus] = Query(None, alias="status"),
    department: Optional[str] = None,
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    owner_id: Optional[uuid.UUID] = None,
    exclude_owner_id: Optional[uuid.UUID] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|average_rating|total_borrows|title)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    from sqlalchemy.orm import joinedload
    query = db.query(Resource).options(
        joinedload(Resource.category),
        joinedload(Resource.owner)
    )

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Resource.title.ilike(like), 
                Resource.description.ilike(like), 
                Resource.tags.ilike(like),
                Resource.owner.has(User.full_name.ilike(like))
            )
        )
    if category_id:
        query = query.filter(Resource.category_id == category_id)
    if condition:
        query = query.filter(Resource.condition == condition)
    if status_filter:
        query = query.filter(Resource.status == status_filter)
    elif not owner_id:
        # Default to available for public explore page
        query = query.filter(Resource.status != ResourceStatus.UNAVAILABLE)
    if min_rating is not None:
        query = query.filter(Resource.average_rating >= min_rating)
    if owner_id:
        query = query.filter(Resource.owner_id == owner_id)
    if exclude_owner_id:
        query = query.filter(Resource.owner_id != exclude_owner_id)
    if department:
        query = query.join(User, Resource.owner_id == User.id).filter(User.department == department)

    total = query.count()

    sort_column = getattr(Resource, sort_by)
    sort_column = sort_column.desc() if sort_dir == "desc" else sort_column.asc()
    query = query.order_by(sort_column)

    items = query.offset((page - 1) * page_size).limit(page_size).all()

    # Populate is_wishlisted
    if current_user:
        wishlist_ids = {
            w.resource_id for w in db.query(WishlistItem).filter(WishlistItem.user_id == current_user.id).all()
        }
        for item in items:
            item.is_wishlisted = item.id in wishlist_ids
    else:
        for item in items:
            item.is_wishlisted = False

    return ResourceListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/my-listings-with-borrowers")
def get_my_listings_with_borrowers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch all resources listed by the current user along with complete borrower history,
    contact info, requested dates, actual return dates, and current borrow status.
    """
    from sqlalchemy.orm import joinedload

    resources = (
        db.query(Resource)
        .options(
            joinedload(Resource.category),
            joinedload(Resource.owner)
        )
        .filter(Resource.owner_id == current_user.id)
        .order_by(Resource.created_at.desc())
        .all()
    )

    resource_ids = [r.id for r in resources]
    borrow_requests = (
        db.query(BorrowRequest)
        .options(joinedload(BorrowRequest.borrower))
        .filter(BorrowRequest.resource_id.in_(resource_ids))
        .order_by(BorrowRequest.created_at.desc())
        .all()
    ) if resource_ids else []

    requests_by_resource = {}
    for br in borrow_requests:
        r_id = str(br.resource_id)
        if r_id not in requests_by_resource:
            requests_by_resource[r_id] = []
        
        borrower = br.borrower
        requests_by_resource[r_id].append({
            "id": str(br.id),
            "status": br.status.value if hasattr(br.status, "value") else str(br.status),
            "requested_start_date": br.requested_start_date.isoformat() if br.requested_start_date else None,
            "requested_end_date": br.requested_end_date.isoformat() if br.requested_end_date else None,
            "actual_return_date": br.actual_return_date.isoformat() if br.actual_return_date else None,
            "purpose": br.purpose,
            "deposit_paid": br.deposit_paid,
            "rejection_reason": br.rejection_reason,
            "borrower": {
                "id": str(borrower.id),
                "full_name": borrower.full_name,
                "email": borrower.email,
                "trust_score": borrower.trust_score,
                "college_domain": borrower.email.split("@")[1] if borrower.email and "@" in borrower.email else None,
            } if borrower else None,
            "created_at": br.created_at.isoformat() if br.created_at else None,
        })

    result = []
    for r in resources:
        res_data = ResourceResponse.model_validate(r).model_dump(mode="json")
        res_data["borrowers"] = requests_by_resource.get(str(r.id), [])
        result.append(res_data)

    return result


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(
    resource_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    from sqlalchemy.orm import joinedload
    resource = (
        db.query(Resource)
        .options(
            joinedload(Resource.category),
            joinedload(Resource.owner)
        )
        .filter(Resource.id == resource_id)
        .first()
    )
    if not resource:
        raise NotFoundException("Resource not found")
    resource.view_count += 1
    db.commit()
    db.refresh(resource)

    if current_user:
        w = db.query(WishlistItem).filter(WishlistItem.user_id == current_user.id, WishlistItem.resource_id == resource.id).first()
        resource.is_wishlisted = bool(w)
    else:
        resource.is_wishlisted = False

    return resource


@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/day")
def create_resource(
    request: Request,
    payload: ResourceCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_verified_user),
    db: Session = Depends(get_db),
):
    resource = Resource(
        **payload.model_dump(exclude_unset=True),
        owner_id=current_user.id,
        quantity_available=payload.quantity,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)

    if resource.status == ResourceStatus.AVAILABLE:
        background_tasks.add_task(
            notify_all_except_owner_bg,
            current_user.id,
            resource.id,
            resource.title,
            current_user.full_name,
        )

    return resource


@router.get("/{resource_id}/availability")
def get_availability(resource_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get all blocking bookings for a resource to show in the availability calendar."""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")

    return get_blocked_dates(db, resource.id)


@router.put("/{resource_id}", response_model=ResourceResponse)
def update_resource(
    resource_id: uuid.UUID,
    payload: ResourceUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_verified_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    if resource.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenException("You can only edit your own resources")

    old_status = resource.status
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(resource, field, value)
    db.commit()
    db.refresh(resource)

    if old_status != ResourceStatus.AVAILABLE and resource.status == ResourceStatus.AVAILABLE:
        background_tasks.add_task(
            notify_all_except_owner_bg,
            current_user.id,
            resource.id,
            resource.title,
            current_user.full_name,
        )

    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: uuid.UUID,
    current_user: User = Depends(get_current_active_verified_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    if resource.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenException("You can only delete your own resources")
        
    from app.models.enums import BorrowStatus
    from app.models.borrow import BorrowRequest
    
    active_statuses = [
        BorrowStatus.REQUESTED, BorrowStatus.APPROVED, BorrowStatus.HANDOVER_REQUESTED,
        BorrowStatus.ACTIVE, BorrowStatus.RETURN_REQUESTED, BorrowStatus.LATE
    ]
    
    active_bookings = db.query(BorrowRequest).filter(
        BorrowRequest.resource_id == resource_id,
        BorrowRequest.status.in_(active_statuses)
    ).count()
    
    if active_bookings > 0:
        from app.core.exceptions import BadRequestException
        raise BadRequestException(f"Cannot delete resource with {active_bookings} active or pending bookings. Please cancel or complete them first.")
        
    from app.models.wanted import WantedOffer
    from app.models.wishlist import WishlistItem
    from app.models.misc import Complaint

    # 1. Delete associated wishlist items
    db.query(WishlistItem).filter(WishlistItem.resource_id == resource_id).delete(synchronize_session=False)
    
    # 2. Delete associated wanted offers
    db.query(WantedOffer).filter(WantedOffer.resource_id == resource_id).delete(synchronize_session=False)
    
    # 3. Nullify resource_id in complaints to preserve the complaint record
    db.query(Complaint).filter(Complaint.resource_id == resource_id).update({"resource_id": None}, synchronize_session=False)

    db.delete(resource)
    db.commit()
    return None


@router.post("/{resource_id}/images", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def add_resource_image(
    resource_id: uuid.UUID,
    image_url: str,
    is_primary: bool = False,
    current_user: User = Depends(get_current_active_verified_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    if resource.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenException("You can only edit your own resources")

    if is_primary:
        for img in resource.images:
            img.is_primary = False

    image = ResourceImage(resource_id=resource.id, image_url=image_url, is_primary=is_primary)
    db.add(image)
    db.commit()
    db.refresh(resource)
    return resource
