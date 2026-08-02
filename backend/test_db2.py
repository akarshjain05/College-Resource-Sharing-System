from datetime import datetime, timezone
import uuid
from app.schemas.borrow import BorrowRequestResponse
from app.models.borrow import BorrowRequest
from app.models.resource import Resource
from app.models.user import User
from app.models.category import Category
from app.models.enums import BorrowStatus, ResourceCondition, ResourceStatus, AuthProvider

user = User(
    id=uuid.uuid4(), email="a@a.com", hashed_password="a", full_name="AUser",
    role="student", department="CS", created_at=datetime.now(timezone.utc),
    auth_provider=AuthProvider.LOCAL, is_verified=True, is_active=True, is_suspended=False,
    trust_score=100, sharing_score=0
)
category = Category(
    id=uuid.uuid4(), name="Tools", slug="tools", created_at=datetime.now(timezone.utc)
)
resource = Resource(
    id=uuid.uuid4(), title="Hammer", description="A great hammer", condition=ResourceCondition.GOOD,
    status=ResourceStatus.AVAILABLE, quantity=1, quantity_available=1,
    deposit_amount=10.0, max_borrow_days=7, average_rating=0.0, total_borrows=0, view_count=0,
    owner_id=user.id, category_id=category.id,
    owner=user, category=category, created_at=datetime.now(timezone.utc)
)
req = BorrowRequest(
    id=uuid.uuid4(),
    resource_id=resource.id,
    borrower_id=user.id,
    lender_id=user.id,
    status=BorrowStatus.REQUESTED,
    requested_start_date=datetime.now(timezone.utc),
    requested_end_date=datetime.now(timezone.utc),
    purpose="Test",
    deposit_paid=0.0,
    resource=resource,
    borrower=user,
    lender=user,
    created_at=datetime.now(timezone.utc)
)

try:
    print(BorrowRequestResponse.model_validate(req))
except Exception as e:
    import traceback
    traceback.print_exc()
