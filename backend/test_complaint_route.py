import asyncio
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User
from app.models.complaint import Complaint
from app.schemas.complaint import ComplaintAdminUpdate
from app.routers.complaints import update_complaint
from fastapi import BackgroundTasks

db = SessionLocal()
complaint = db.query(Complaint).first()
if complaint:
    admin = db.query(User).filter(User.email == "akarshjain9575@gmail.com").first()
    payload = ComplaintAdminUpdate(
        status="resolved",
        admin_response="Replacement item provided to borrower.",
        resolution_action="replacement_provided",
        resolution_notes="Replacement item provided to borrower."
    )
    bt = BackgroundTasks()
    try:
        res = update_complaint(complaint.id, payload, bt, db, admin)
        print("SUCCESS:", res.id)
    except Exception as e:
        print("ERROR:", e)
else:
    print("NO COMPLAINTS")
