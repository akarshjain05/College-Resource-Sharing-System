import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.user import User
from app.models.borrow import BorrowRequest
from app.models.chat import ChatMessage
from app.models.misc import Complaint
from app.models.enums import NotificationType
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.services.notification_service import create_notification
from app.core.rate_limit import limiter
from starlette.requests import Request
from app.services.ws_manager import manager
from app.utils.moderation import check_chat_message_content

router = APIRouter(prefix="/borrow-requests/{request_id}/messages", tags=["Chat"])


def _get_authorized_request(request_id: uuid.UUID, current_user: User, db: Session) -> BorrowRequest:
    br = db.query(BorrowRequest).filter(BorrowRequest.id == request_id).first()
    if not br:
        raise NotFoundException("Request not found")
    if current_user.id not in (br.borrower_id, br.lender_id):
        raise ForbiddenException("Not part of this conversation")
    return br


@router.get("", response_model=list[ChatMessageResponse])
def list_messages(request_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    br = _get_authorized_request(request_id, current_user, db)
    return db.query(ChatMessage).filter(ChatMessage.borrow_request_id == br.id).order_by(ChatMessage.created_at).all()


@router.post("", response_model=ChatMessageResponse, status_code=201)
@limiter.limit("30/minute")
def send_message(
    request: Request,
    request_id: uuid.UUID,
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    br = _get_authorized_request(request_id, current_user, db)
    
    # Item 88: Message content moderation hook (blocks severe profanity/slurs & spam patterns)
    check_chat_message_content(payload.body)
    
    msg = ChatMessage(
        borrow_request_id=br.id, 
        sender_id=current_user.id, 
        body=payload.body.strip()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    other_user_id = br.lender_id if current_user.id == br.borrower_id else br.borrower_id
    
    create_notification(
        db, 
        other_user_id, 
        NotificationType.SYSTEM,
        title=f"New message from {current_user.full_name}",
        message=payload.body[:80],
        link=f"/my-bookings?id={br.id}",
    )
    
    manager.notify_user(other_user_id, {
        "type": "chat_message",
        "borrow_request_id": str(br.id),
        "message": ChatMessageResponse.model_validate(msg).model_dump(mode="json"),
    })
    
    return msg


@router.patch("/read")
def mark_read(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    br = _get_authorized_request(request_id, current_user, db)
    
    unread_messages = db.query(ChatMessage).filter(
        ChatMessage.borrow_request_id == br.id,
        ChatMessage.sender_id != current_user.id,
        ChatMessage.read_at == None
    ).all()
    
    now = datetime.utcnow()
    for msg in unread_messages:
        msg.read_at = now
        
    db.commit()
    
    return {"status": "ok", "marked_read": len(unread_messages)}


@router.post("/{message_id}/report", status_code=201)
def report_message(
    request_id: uuid.UUID,
    message_id: uuid.UUID,
    reason: str = Query("Inappropriate content"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Item 88: Allow a participant to report an abusive/harassing chat message to campus admins.
    """
    br = _get_authorized_request(request_id, current_user, db)
    msg = db.query(ChatMessage).filter(
        ChatMessage.id == message_id,
        ChatMessage.borrow_request_id == br.id
    ).first()
    if not msg:
        raise NotFoundException("Message not found")
        
    complaint = Complaint(
        filed_by_id=current_user.id,
        against_user_id=msg.sender_id,
        borrow_request_id=br.id,
        category="chat_abuse",
        severity="high",
        subject=f"Reported Chat Message #{msg.id}",
        description=f"Reason: {reason}\nMessage body: '{msg.body}'"
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return {"status": "reported", "complaint_id": str(complaint.id)}

