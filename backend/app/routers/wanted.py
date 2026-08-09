import uuid
import threading
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_active_verified_user
from app.core.exceptions import NotFoundException, ForbiddenException, AppException
from app.models.user import User
from app.models.wanted import WantedRequest
from app.models.category import Category
from app.schemas.wanted import WantedCreate, WantedUpdate, WantedResponse
from app.models.enums import NotificationType

router = APIRouter(prefix="/wanted", tags=["Wanted Requests"])


def _notify_new_wanted_bg(poster_id: uuid.UUID, poster_name: str, wanted_id: uuid.UUID, title: str) -> None:
    """Fan out a notification to all other users about the new wanted post (runs in a background thread)."""
    from app.core.database import SessionLocal
    from app.services.notification_service import create_notification

    db = SessionLocal()
    try:
        other_users = db.query(User).filter(User.id != poster_id).all()
        for user in other_users:
            create_notification(
                db=db,
                user_id=user.id,
                notif_type=NotificationType.SYSTEM,
                title="New Campus Need Posted",
                message=f"{poster_name} is looking for: '{title}'. Can you help?",
                link=f"/wanted",
                event_type="wanted.new",
            )
    finally:
        db.close()


@router.post("", response_model=WantedResponse, status_code=status.HTTP_201_CREATED)
def create_wanted_request(
    payload: WantedCreate,
    current_user: User = Depends(get_current_active_verified_user),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(Category.id == payload.category_id).first()
    if not category:
        raise NotFoundException("Category not found")

    if payload.end_date < payload.start_date:
        raise AppException("End date cannot be before start date", status_code=status.HTTP_400_BAD_REQUEST)

    wanted = WantedRequest(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category_id=payload.category_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    db.add(wanted)
    db.commit()
    db.refresh(wanted)

    # Notify all other users in the background so this response stays fast.
    threading.Thread(
        target=_notify_new_wanted_bg,
        args=(current_user.id, current_user.full_name, wanted.id, wanted.title),
        daemon=True,
    ).start()

    return wanted


@router.get("", response_model=list[WantedResponse])
def list_wanted_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.wanted import WantedOffer
    from sqlalchemy.orm import joinedload

    requests = db.query(WantedRequest).options(
        joinedload(WantedRequest.user),
        joinedload(WantedRequest.category)
    ).filter(
        WantedRequest.is_fulfilled == False,
        WantedRequest.user_id != current_user.id
    ).order_by(WantedRequest.created_at.desc()).all()

    valid_requests = [r for r in requests if r.user is not None and r.category is not None]

    for r in valid_requests:
        r.has_offered = db.query(WantedOffer).filter(
            WantedOffer.wanted_request_id == r.id,
            WantedOffer.offerer_id == current_user.id
        ).first() is not None

    return valid_requests


@router.get("/me", response_model=list[WantedResponse])
def my_wanted_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import joinedload

    requests = db.query(WantedRequest).options(
        joinedload(WantedRequest.user),
        joinedload(WantedRequest.category)
    ).filter(
        WantedRequest.user_id == current_user.id
    ).order_by(WantedRequest.created_at.desc()).all()

    return [r for r in requests if r.user is not None and r.category is not None]


@router.put("/{wanted_id}", response_model=WantedResponse)
def update_wanted_request(
    wanted_id: uuid.UUID,
    payload: WantedUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wanted = db.query(WantedRequest).filter(WantedRequest.id == wanted_id).first()
    if not wanted:
        raise NotFoundException("Wanted request not found")
    if wanted.user_id != current_user.id:
        raise ForbiddenException("Only the owner can edit this request")

    if payload.start_date and payload.end_date:
        if payload.end_date < payload.start_date:
            raise AppException("End date cannot be before start date", status_code=status.HTTP_400_BAD_REQUEST)
    elif payload.start_date:
        if wanted.end_date and wanted.end_date < payload.start_date:
            raise AppException("End date cannot be before start date", status_code=status.HTTP_400_BAD_REQUEST)
    elif payload.end_date:
        if wanted.start_date and payload.end_date < wanted.start_date:
            raise AppException("End date cannot be before start date", status_code=status.HTTP_400_BAD_REQUEST)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(wanted, field, value)
    
    db.commit()
    db.refresh(wanted)
    return wanted


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

    wanted.is_fulfilled = not wanted.is_fulfilled
    db.commit()
    db.refresh(wanted)
    return wanted


@router.delete("/{wanted_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wanted_request(
    wanted_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.borrow import BorrowRequest

    wanted = db.query(WantedRequest).filter(WantedRequest.id == wanted_id).first()
    if not wanted:
        raise NotFoundException("Wanted request not found")
    if wanted.user_id != current_user.id and current_user.role != "admin":
        raise ForbiddenException("Only the owner or an admin can delete this request")

    # Disassociate any auto-created or linked borrow request so FK constraint is satisfied
    db.query(BorrowRequest).filter(BorrowRequest.wanted_request_id == wanted_id).update(
        {"wanted_request_id": None}, synchronize_session=False
    )

    db.delete(wanted)
    db.commit()


@router.delete("/offers/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_wanted_offer(
    offer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offer = db.query(WantedOffer).filter(WantedOffer.id == offer_id).first()
    if not offer:
        raise NotFoundException("Offer not found")

    wanted = offer.wanted_request
    if offer.offerer_id != current_user.id and wanted.user_id != current_user.id and current_user.role != "admin":
        raise ForbiddenException("You cannot cancel this offer")

    if offer.status == "ACCEPTED":
        raise ForbiddenException("Accepted offers cannot be deleted. Manage the active borrow request instead.")

    if wanted.user_id == current_user.id:
        from app.services.notification_service import create_notification
        create_notification(
            db,
            user_id=offer.offerer_id,
            notif_type=NotificationType.SYSTEM,
            title="Offer Declined",
            message=f"Your offer for '{wanted.title}' was declined by the requester.",
            link=f"/wanted"
        )

    db.delete(offer)
    db.commit()



from app.models.wanted import WantedRequest, WantedOffer
from app.schemas.wanted import WantedCreate, WantedUpdate, WantedResponse, WantedOfferCreate, WantedOfferResponse
from app.models.resource import Resource
from app.models.borrow import BorrowRequest
from app.models.enums import NotificationType, BorrowStatus, ResourceStatus


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

    # Strict rule: A user can only send 1 offer per wanted request
    existing_offer = db.query(WantedOffer).filter(
        WantedOffer.wanted_request_id == wanted.id,
        WantedOffer.offerer_id == current_user.id
    ).first()
    if existing_offer:
        raise ForbiddenException("You have already sent an offer for this request. One user can only offer once.")

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
        link=f"/my-needs?id={wanted.id}"  # Link them back to their needs page to see offers
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
    from app.services.availability import is_resource_available_for_dates
    from datetime import date, timedelta

    offer = db.query(WantedOffer).filter(WantedOffer.id == offer_id).first()
    if not offer:
        raise NotFoundException("Offer not found")

    wanted = offer.wanted_request
    if wanted.user_id != current_user.id:
        raise ForbiddenException("Only the requester can accept an offer")
    
    if wanted.is_fulfilled:
        raise ForbiddenException("This request has already been fulfilled")

    # Lock resource to prevent concurrent borrows
    resource = db.query(Resource).filter(Resource.id == offer.resource_id).with_for_update().first()
    if not resource:
        raise NotFoundException("Resource not found")
        
    start_date = date.today()
    end_date = start_date + timedelta(days=resource.max_borrow_days)

    if not is_resource_available_for_dates(db, resource.id, start_date, end_date, resource.quantity):
        raise AppException("This resource is no longer available", status_code=status.HTTP_409_CONFLICT, error_code="OUT_OF_STOCK")

    offer.status = "ACCEPTED"
    wanted.is_fulfilled = True
    
    # Auto-create BorrowRequest

    
    borrow_request = BorrowRequest(
        resource_id=resource.id,
        borrower_id=wanted.user_id,
        lender_id=offer.offerer_id,
        status=BorrowStatus.APPROVED,
        requested_start_date=start_date,
        requested_end_date=end_date,
        purpose=f"Auto-generated for wanted request: {wanted.title}",
        deposit_paid=0,
        wanted_request_id=wanted.id
    )
    db.add(borrow_request)
    
    # Reject other offers & notify each offerer
    other_offers = db.query(WantedOffer).filter(
        WantedOffer.wanted_request_id == wanted.id,
        WantedOffer.id != offer.id
    ).all()
    for other in other_offers:
        other.status = "REJECTED"
        create_notification(
            db,
            user_id=other.offerer_id,
            notif_type=NotificationType.SYSTEM,
            title="Offer status update",
            message=f"Your offer for '{wanted.title}' was automatically declined because another offer was selected.",
            link=f"/wanted"
        )

    db.commit()
    db.refresh(wanted)
    db.refresh(borrow_request)

    create_notification(
        db,
        user_id=offer.offerer_id,
        notif_type=NotificationType.SYSTEM,
        title="Your offer was accepted!",
        message=f"{current_user.full_name} has accepted your offer for '{resource.title}'. A borrow request has been auto-created.",
        link=f"/my-bookings?id={borrow_request.id}"
    )
    
    create_notification(
        db,
        user_id=wanted.user_id,
        notif_type=NotificationType.SYSTEM,
        title="Borrow request created",
        message=f"A borrow request for '{resource.title}' has been auto-created based on your accepted offer.",
        link=f"/my-bookings?id={borrow_request.id}"
    )

    return wanted
