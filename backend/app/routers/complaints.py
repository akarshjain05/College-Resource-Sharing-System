import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.exceptions import NotFoundException
from app.models.misc import Complaint
from app.models.user import User
from app.schemas.complaint import ComplaintCreate, ComplaintAdminUpdate, ComplaintResponse

router = APIRouter(prefix="/complaints", tags=["Complaints & Support"])


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def file_complaint(
    payload: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = Complaint(**payload.model_dump(), filed_by_id=current_user.id)
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("/my-complaints", response_model=list[ComplaintResponse])
def my_complaints(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Complaint).filter(Complaint.filed_by_id == current_user.id).all()


@router.get("", response_model=list[ComplaintResponse])
def list_all_complaints(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    return db.query(Complaint).order_by(Complaint.created_at.desc()).all()


@router.put("/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(
    complaint_id: uuid.UUID,
    payload: ComplaintAdminUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise NotFoundException("Complaint not found")
    complaint.status = payload.status
    if payload.admin_response is not None:
        complaint.admin_response = payload.admin_response
    
    if payload.trust_score_penalty and payload.trust_score_penalty > 0 and complaint.against_user_id:
        offending_user = db.query(User).filter(User.id == complaint.against_user_id).first()
        if offending_user:
            offending_user.trust_score -= payload.trust_score_penalty

    db.commit()
    db.refresh(complaint)
    return complaint
