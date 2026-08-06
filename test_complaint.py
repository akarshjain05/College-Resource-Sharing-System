import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.schemas.complaint import ComplaintAdminUpdate
from pydantic import ValidationError

payload = {
    "status": "resolved",
    "admin_response": "",
    "resolution_action": "refund_issued",
    "resolution_amount": 200,
    "resolution_notes": "",
    "trust_score_penalty": 0
}

try:
    c = ComplaintAdminUpdate(**payload)
    print(c.model_dump())
except ValidationError as e:
    print(e.json())

