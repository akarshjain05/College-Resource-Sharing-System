import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.enums import ResourceCondition, ResourceStatus, UserRole
from app.models.resource import Resource, ResourceImage
from app.models.user import User
from app.schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse, ResourceListResponse

router = APIRouter(prefix="/resources", tags=["Resources"])


@router.get("", response_model=ResourceListResponse)
def list_resources(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search title/description/tags"),
    category_id: Optional[uuid.UUID] = None,
    condition: Optional[ResourceCondition] = None,
    status_filter: Optional[ResourceStatus] = Query(None, alias="status"),
    department: Optional[str] = None,
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    sort_by: str = Query("created_at", pattern="^(created_at|average_rating|total_borrows|title)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = db.query(Resource)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(Resource.title.ilike(like), Resource.description.ilike(like), Resource.tags.ilike(like))
        )
    if category_id:
        query = query.filter(Resource.category_id == category_id)
    if condition:
        query = query.filter(Resource.condition == condition)
    if status_filter:
        query = query.filter(Resource.status == status_filter)
    if min_rating is not None:
        query = query.filter(Resource.average_rating >= min_rating)
    if department:
        query = query.join(User, Resource.owner_id == User.id).filter(User.department == department)

    total = query.count()

    sort_column = getattr(Resource, sort_by)
    sort_column = sort_column.desc() if sort_dir == "desc" else sort_column.asc()
    query = query.order_by(sort_column)

    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return ResourceListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(resource_id: uuid.UUID, db: Session = Depends(get_db)):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    resource.view_count += 1
    db.commit()
    db.refresh(resource)
    return resource


@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_resource(
    payload: ResourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = Resource(
        **payload.model_dump(),
        owner_id=current_user.id,
        quantity_available=payload.quantity,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.put("/{resource_id}", response_model=ResourceResponse)
def update_resource(
    resource_id: uuid.UUID,
    payload: ResourceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    if resource.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenException("You can only edit your own resources")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(resource, field, value)
    db.commit()
    db.refresh(resource)
    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    if resource.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenException("You can only delete your own resources")
    db.delete(resource)
    db.commit()
    return None


@router.post("/{resource_id}/images", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def add_resource_image(
    resource_id: uuid.UUID,
    image_url: str,
    is_primary: bool = False,
    current_user: User = Depends(get_current_user),
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
