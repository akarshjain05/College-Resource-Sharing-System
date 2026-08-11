import re

with open("backend/app/routers/complaints.py", "r") as f:
    code = f.read()

refund_logic = """
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

    # Trust score penalty handling"""

code = code.replace("    # Trust score penalty handling", refund_logic)

with open("backend/app/routers/complaints.py", "w") as f:
    f.write(code)
print("Patched complaints.py")
