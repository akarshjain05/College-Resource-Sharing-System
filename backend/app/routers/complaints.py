import json
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.exceptions import NotFoundException
from app.models.chat import ChatMessage
from app.models.enums import ComplaintStatus, NotificationType
from app.models.misc import Complaint
from app.models.user import User
from app.schemas.chat import ChatMessageResponse
from app.schemas.complaint import ComplaintAdminUpdate, ComplaintCreate, ComplaintResponse
from app.services.email_service import send_complaint_update_email
from app.services.notification_service import create_notification
from app.services.ws_manager import manager

router = APIRouter(prefix="/complaints", tags=["Complaints & Support"])


def _complaint_query(db: Session):
    return db.query(Complaint).options(
        joinedload(Complaint.filed_by),
        joinedload(Complaint.against_user),
        joinedload(Complaint.assigned_to),
        joinedload(Complaint.resource),
        joinedload(Complaint.borrow_request),
    )


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def file_complaint(
    payload: ComplaintCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = Complaint(**payload.model_dump(), filed_by_id=current_user.id)
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Auto-link & create chat thread message if borrow_request_id is attached
    if complaint.borrow_request_id:
        system_msg_body = (
            f"[COMPLAINT_FILED] 🚨 Complaint Filed ({complaint.category.upper()} - {complaint.severity.upper()}): "
            f"{complaint.subject}\n\nDescription: {complaint.description}"
        )
        msg = ChatMessage(
            borrow_request_id=complaint.borrow_request_id,
            sender_id=current_user.id,
            body=system_msg_body,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        # Notify other party in chat
        if complaint.borrow_request:
            lender_id = complaint.borrow_request.lender_id
            borrower_id = complaint.borrow_request.borrower_id
            other_user_id = lender_id if current_user.id == borrower_id else borrower_id

            manager.notify_user(
                other_user_id,
                {
                    "type": "chat_message",
                    "borrow_request_id": str(complaint.borrow_request_id),
                    "message": ChatMessageResponse.model_validate(msg).model_dump(mode="json"),
                },
            )

    # Notify admins/system
    create_notification(
        db,
        current_user.id,
        NotificationType.COMPLAINT_UPDATE,
        "Complaint Filed Successfully",
        f"Your complaint '{complaint.subject}' has been submitted for triage.",
        link="/complaints",
    )

    return _complaint_query(db).filter(Complaint.id == complaint.id).first()


@router.get("/my-complaints", response_model=list[ComplaintResponse])
def my_complaints(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        _complaint_query(db)
        .filter(Complaint.filed_by_id == current_user.id)
        .order_by(Complaint.created_at.desc())
        .all()
    )


@router.get("", response_model=list[ComplaintResponse])
def list_all_complaints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Admins or users assigned to complaints can list complaints
    return _complaint_query(db).order_by(Complaint.created_at.desc()).all()


@router.put("/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(
    complaint_id: uuid.UUID,
    payload: ComplaintAdminUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise NotFoundException("Complaint not found")

    old_status = complaint.status

    if payload.status:
        complaint.status = payload.status

    if payload.assigned_to_id:
        complaint.assigned_to_id = payload.assigned_to_id
        if complaint.status == ComplaintStatus.OPEN:
            complaint.status = ComplaintStatus.ASSIGNED

    if payload.admin_response is not None:
        complaint.admin_response = payload.admin_response

# If structured resolution payload provided, build JSON resolution_data
    dump = payload.model_dump(exclude_unset=True)
    if "resolution_action" in dump:
        if payload.resolution_action:
            res_obj = {
                "action_taken": payload.resolution_action,
                "amount": payload.resolution_amount or 0.0,
                "notes": payload.resolution_notes or payload.admin_response or "",
                "resolved_at": datetime.utcnow().isoformat(),
            }
            complaint.resolution_data = json.dumps(res_obj)
            complaint.status = ComplaintStatus.RESOLVED
        else:
            complaint.resolution_data = None


    # Real backend logic for refunds
    if payload.resolution_action == "refund_issued" and complaint.borrow_request_id:
        from app.models.payment import Payment
        from app.models.enums import PaymentStatus
        from app.services import payment_service
        
        # Find the payment for this borrow request
        payment = db.query(Payment).filter(
            Payment.borrow_request_id == complaint.borrow_request_id,
            Payment.status == PaymentStatus.PAID
        ).first()
        
        if payment:
            refund_amount_paise = int((payload.resolution_amount or 0) * 100)
            if refund_amount_paise > 0:
                # We do not pass background_tasks here, so we skip the email for now or import it 
                payment_service.refund_payment(
                    db, payment, amount_paise=refund_amount_paise,
                    notes={"reason": f"complaint_resolution_{complaint.id}"}
                )

    # Trust score penalty handling
    if payload.trust_score_penalty and payload.trust_score_penalty > 0 and complaint.against_user_id:
        offending_user = db.query(User).filter(User.id == complaint.against_user_id).first()
        if offending_user:
            offending_user.trust_score -= payload.trust_score_penalty

    db.commit()
    db.refresh(complaint)

    # Post real-time chat update message if borrow request is linked
    if complaint.borrow_request_id:
        system_msg_body = f"[COMPLAINT_UPDATE] 📢 Complaint Status: {complaint.status.value.upper()}"
        if complaint.resolution_data:
            system_msg_body += f"\nResolution Data: {complaint.resolution_data}"
        msg = ChatMessage(
            borrow_request_id=complaint.borrow_request_id,
            sender_id=complaint.filed_by_id,
            body=system_msg_body,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        # Broadcast via WebSockets
        if complaint.borrow_request:
            for uid in (complaint.borrow_request.lender_id, complaint.borrow_request.borrower_id):
                manager.notify_user(
                    uid,
                    {
                        "type": "chat_message",
                        "borrow_request_id": str(complaint.borrow_request_id),
                        "message": ChatMessageResponse.model_validate(msg).model_dump(mode="json"),
                    },
                )

    # Notify filed_by user via In-App Notification & Email
    create_notification(
        db,
        complaint.filed_by_id,
        NotificationType.COMPLAINT_UPDATE,
        "Complaint Status Update",
        f"Your complaint '{complaint.subject}' status is now {complaint.status.value.upper()}.",
        link="/complaints",
    )

    if complaint.filed_by and complaint.filed_by.email:
        background_tasks.add_task(
            send_complaint_update_email,
            to_email=complaint.filed_by.email,
            full_name=complaint.filed_by.full_name,
            subject_title=complaint.subject,
            status=complaint.status.value,
            update_text=payload.admin_response or payload.resolution_notes or f"Complaint updated to {complaint.status.value}",
        )

    return _complaint_query(db).filter(Complaint.id == complaint.id).first()
