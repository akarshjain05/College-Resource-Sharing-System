import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import AppException, NotFoundException
from app.models.user import User
from app.models.resource import Resource
from app.models.wishlist import WishlistItem
from app.schemas.resource import ResourceResponse

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("", response_model=List[ResourceResponse])
def get_wishlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all resources the current user has wishlisted."""
    items = db.query(WishlistItem).filter(WishlistItem.user_id == current_user.id).all()
    # We can just return the resource of each item, the schema handles mapping
    return [item.resource for item in items]


@router.post("/{resource_id}", status_code=status.HTTP_201_CREATED)
def add_to_wishlist(
    resource_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a resource to the user's wishlist."""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    
    if resource.owner_id == current_user.id:
        raise AppException("You cannot wishlist your own resource", status_code=status.HTTP_400_BAD_REQUEST, error_code="INVALID_ACTION")

    item = WishlistItem(user_id=current_user.id, resource_id=resource_id)
    try:
        db.add(item)
        db.commit()
    except IntegrityError:
        db.rollback()
        # It's already in the wishlist, just return success
        pass

    return {"detail": "Added to wishlist"}


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_wishlist(
    resource_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a resource from the user's wishlist."""
    item = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.resource_id == resource_id
    ).first()
    
    if item:
        db.delete(item)
        db.commit()
        
    return None
