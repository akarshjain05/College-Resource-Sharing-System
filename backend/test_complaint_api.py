import requests
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User
from app.models.complaint import Complaint
from app.core.security import create_access_token

db = SessionLocal()
admin = db.query(User).filter(User.email == "akarshjain9575@gmail.com").first()
complaint = db.query(Complaint).first()
if admin and complaint:
    token = create_access_token(admin.id)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "status": "resolved",
        "admin_response": "Replacement item provided to borrower.",
        "resolution_action": "replacement_provided",
        "resolution_notes": "Replacement item provided to borrower."
    }
    url = f"http://localhost:8000/api/v1/complaints/{complaint.id}"
    resp = requests.put(url, json=payload, headers=headers)
    print("STATUS:", resp.status_code)
    print("BODY:", resp.text)
else:
    print("Admin or Complaint not found")
