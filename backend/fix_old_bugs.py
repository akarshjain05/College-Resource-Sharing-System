from app.core.database import SessionLocal
from app.models.resource import Resource
from app.models.borrow import BorrowRequest
from app.models.enums import BorrowStatus, ResourceStatus

db = SessionLocal()
borrows = db.query(BorrowRequest).filter(BorrowRequest.status.in_([BorrowStatus.APPROVED, BorrowStatus.ACTIVE])).all()
for b in borrows:
    r = db.query(Resource).filter(Resource.id == b.resource_id).first()
    if r.status == ResourceStatus.AVAILABLE:
        r.quantity_available = 0
        r.status = ResourceStatus.BORROWED
        print(f"Fixed {r.title}")
db.commit()
db.close()
