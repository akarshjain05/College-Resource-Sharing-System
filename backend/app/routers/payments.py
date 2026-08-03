from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.payment import Payment, PaymentStatus
from app.schemas.payment import PaymentResponse, PaymentCreate

router = APIRouter(tags=["payments"])

@router.get("/my-payments", response_model=List[PaymentResponse])
def get_my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all payments associated with the current logged-in user.
    """
    payments = db.query(Payment).filter(Payment.user_id == current_user.id).order_by(Payment.created_at.desc()).all()
    return payments

@router.post("/{payment_id}/pay", response_model=PaymentResponse)
def simulate_pay(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mock endpoint to pay a pending payment.
    """
    payment = db.query(Payment).filter(Payment.id == payment_id, Payment.user_id == current_user.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.status != PaymentStatus.PENDING and payment.status != PaymentStatus.FAILED:
        raise HTTPException(status_code=400, detail=f"Cannot pay a payment with status {payment.status.value}")
        
    payment.status = PaymentStatus.COMPLETED
    db.commit()
    db.refresh(payment)
    return payment

@router.post("/{payment_id}/fail", response_model=PaymentResponse)
def simulate_fail(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mock endpoint to fail a pending payment (for testing).
    """
    payment = db.query(Payment).filter(Payment.id == payment_id, Payment.user_id == current_user.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.status != PaymentStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot fail a payment with status {payment.status.value}")
        
    payment.status = PaymentStatus.FAILED
    db.commit()
    db.refresh(payment)
    return payment

@router.post("/{payment_id}/cancel", response_model=PaymentResponse)
def cancel_payment(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint to cancel a pending payment.
    """
    payment = db.query(Payment).filter(Payment.id == payment_id, Payment.user_id == current_user.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.status != PaymentStatus.PENDING and payment.status != PaymentStatus.FAILED:
        raise HTTPException(status_code=400, detail=f"Cannot cancel a payment with status {payment.status.value}")
        
    payment.status = PaymentStatus.CANCELLED
    db.commit()
    db.refresh(payment)
    return payment

# Admin endpoint to create a manual payment/fine for a user
@router.post("/", response_model=PaymentResponse)
def create_payment(
    payment_in: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new payment request (e.g. Fine, Fee).
    In a real system this would be restricted to admins or system-generated, 
    but for testing purposes we allow it.
    """
    payment = Payment(
        user_id=payment_in.user_id,
        amount=payment_in.amount,
        reason=payment_in.reason,
        status=PaymentStatus.PENDING,
        borrow_request_id=payment_in.borrow_request_id
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
