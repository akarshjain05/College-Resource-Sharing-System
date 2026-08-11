import uuid
from app.schemas.complaint import ComplaintAdminUpdate

payload = {
    "status": "resolved",
    "admin_response": "Replacement item provided to borrower.",
    "resolution_action": "replacement_provided",
    "resolution_notes": "Replacement item provided to borrower."
}
update = ComplaintAdminUpdate(**payload)
print("SUCCESS:", update.model_dump())
