import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.user import User
from app.models.borrow import BorrowRequest
from app.models.chat import ChatMessage
from app.models.enums import NotificationType
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.services.notification_service import create_notification
from app.core.rate_limit import limiter
from starlette.requests import Request
from app.services.ws_manager import manager

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
        link=f"/borrow-requests/{br.id}",
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
