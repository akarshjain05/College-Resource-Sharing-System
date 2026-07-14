import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.user import User
from app.models.wanted import WantedRequest
from app.models.category import Category
from app.schemas.wanted import WantedCreate, WantedResponse

router = APIRouter(prefix="/wanted", tags=["Wanted Requests"])


@router.post("", response_model=WantedResponse, status_code=status.HTTP_201_CREATED)
def create_wanted_request(
    payload: WantedCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(Category.id == payload.category_id).first()
    if not category:
        raise NotFoundException("Category not found")

    wanted = WantedRequest(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category_id=payload.category_id,
    )
    db.add(wanted)
    db.commit()
    db.refresh(wanted)
    return wanted


@router.get("", response_model=list[WantedResponse])
def list_wanted_requests(db: Session = Depends(get_db)):
    # Sort by newest first and only unfulfilled
    return db.query(WantedRequest).filter(WantedRequest.is_fulfilled == False).order_by(WantedRequest.created_at.desc()).all()


@router.post("/{wanted_id}/fulfill", response_model=WantedResponse)
def fulfill_wanted_request(
    wanted_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wanted = db.query(WantedRequest).filter(WantedRequest.id == wanted_id).first()
    if not wanted:
        raise NotFoundException("Wanted request not found")
    if wanted.user_id != current_user.id:
        raise ForbiddenException("Only the owner can mark this as fulfilled")

    wanted.is_fulfilled = True
    db.commit()
    db.refresh(wanted)
    return wanted


@router.delete("/{wanted_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wanted_request(
    wanted_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wanted = db.query(WantedRequest).filter(WantedRequest.id == wanted_id).first()
    if not wanted:
        raise NotFoundException("Wanted request not found")
    if wanted.user_id != current_user.id and current_user.role != "admin":
        raise ForbiddenException("Only the owner or an admin can delete this request")

    db.delete(wanted)
    db.commit()
