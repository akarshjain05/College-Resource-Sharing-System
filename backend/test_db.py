from app.core.database import SessionLocal
from app.models.borrow import BorrowRequest
from app.schemas.borrow import BorrowRequestResponse
db = SessionLocal()
reqs = db.query(BorrowRequest).all()
for r in reqs:
    try:
        BorrowRequestResponse.model_validate(r)
    except Exception as e:
        print(f"Error on {r.id}: {e}")
print(f"Checked {len(reqs)} requests")
