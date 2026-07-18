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
def list_wanted_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Sort by newest first and only unfulfilled, excluding current user's own requests
    return db.query(WantedRequest).filter(
        WantedRequest.is_fulfilled == False,
        WantedRequest.user_id != current_user.id
    ).order_by(WantedRequest.created_at.desc()).all()


@router.get("/me", response_model=list[WantedResponse])
def my_wanted_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Sort by newest first, include both unfulfilled and fulfilled for own requests
    return db.query(WantedRequest).filter(
        WantedRequest.user_id == current_user.id
    ).order_by(WantedRequest.created_at.desc()).all()


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


from app.models.wanted import WantedRequest, WantedOffer
from app.schemas.wanted import WantedCreate, WantedResponse, WantedOfferCreate, WantedOfferResponse
from app.models.resource import Resource
from app.models.borrow import BorrowRequest
from app.models.enums import NotificationType, BorrowStatus


@router.post("/{wanted_id}/offer", response_model=WantedOfferResponse, status_code=status.HTTP_201_CREATED)
def offer_wanted_request(
    wanted_id: uuid.UUID,
    payload: WantedOfferCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.notification_service import create_notification

    wanted = db.query(WantedRequest).filter(WantedRequest.id == wanted_id).first()
    if not wanted:
        raise NotFoundException("Wanted request not found")
    if wanted.user_id == current_user.id:
        raise ForbiddenException("You cannot offer an item for your own request")
    if wanted.is_fulfilled:
        raise ForbiddenException("This request has already been fulfilled")

    resource = db.query(Resource).filter(Resource.id == payload.resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    if resource.owner_id != current_user.id:
        raise ForbiddenException("You can only offer your own resources")

    # Check if already offered
    existing_offer = db.query(WantedOffer).filter(
        WantedOffer.wanted_request_id == wanted.id,
        WantedOffer.offerer_id == current_user.id,
        WantedOffer.resource_id == resource.id
    ).first()
    if existing_offer:
        raise ForbiddenException("You have already offered this resource for this request")

    offer = WantedOffer(
        wanted_request_id=wanted.id,
        offerer_id=current_user.id,
        resource_id=resource.id,
        status="PENDING"
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    create_notification(
        db,
        user_id=wanted.user_id,
        notif_type=NotificationType.SYSTEM,
        title="Someone has the item you requested!",
        message=f"{current_user.full_name} has offered their item '{resource.title}' for your request '{wanted.title}'!",
        link=f"/wanted"  # Link them back to wanted page to see offers
    )

    return offer


@router.get("/{wanted_id}/offers", response_model=list[WantedOfferResponse])
def list_wanted_offers(
    wanted_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    wanted = db.query(WantedRequest).filter(WantedRequest.id == wanted_id).first()
    if not wanted:
        raise NotFoundException("Wanted request not found")
    
    offers = db.query(WantedOffer).filter(WantedOffer.wanted_request_id == wanted_id).order_by(WantedOffer.created_at.desc()).all()
    return offers


@router.post("/offers/{offer_id}/accept", response_model=WantedResponse)
def accept_wanted_offer(
    offer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.notification_service import create_notification

    offer = db.query(WantedOffer).filter(WantedOffer.id == offer_id).first()
    if not offer:
        raise NotFoundException("Offer not found")

    wanted = offer.wanted_request
    if wanted.user_id != current_user.id:
        raise ForbiddenException("Only the requester can accept an offer")
    
    if wanted.is_fulfilled:
        raise ForbiddenException("This request has already been fulfilled")

    offer.status = "ACCEPTED"
    wanted.is_fulfilled = True
    
    # Reject other offers
    other_offers = db.query(WantedOffer).filter(
        WantedOffer.wanted_request_id == wanted.id,
        WantedOffer.id != offer.id
    ).all()
    for other in other_offers:
        other.status = "REJECTED"

    db.commit()
    db.refresh(wanted)

    create_notification(
        db,
        user_id=offer.offerer_id,
        notif_type=NotificationType.SYSTEM,
        title="Your offer was accepted!",
        message=f"{current_user.full_name} has accepted your offer for '{offer.resource.title}'. They will create a borrow request soon.",
        link=f"/resources/{offer.resource_id}"
    )

    return wanted
