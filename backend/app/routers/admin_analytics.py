from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.borrow import BorrowRequest
from app.models.resource import Resource
from app.models.user import User
from app.models.category import Category
from app.models.enums import BorrowStatus

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


@router.get("/overview")
def overview(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    total_users = db.query(func.count(User.id)).scalar()
    total_resources = db.query(func.count(Resource.id)).scalar()
    total_borrows = db.query(func.count(BorrowRequest.id)).scalar()
    pending_requests = (
        db.query(func.count(BorrowRequest.id)).filter(BorrowRequest.status == BorrowStatus.REQUESTED).scalar()
    )
    active_borrows = (
        db.query(func.count(BorrowRequest.id)).filter(BorrowRequest.status == BorrowStatus.APPROVED).scalar()
    )
    return {
        "total_users": total_users,
        "total_resources": total_resources,
        "total_borrows": total_borrows,
        "pending_requests": pending_requests,
        "active_borrows": active_borrows,
    }


@router.get("/most-borrowed-categories")
def most_borrowed_categories(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    rows = (
        db.query(Category.name, func.count(BorrowRequest.id).label("borrow_count"))
        .join(Resource, Resource.category_id == Category.id)
        .join(BorrowRequest, BorrowRequest.resource_id == Resource.id)
        .group_by(Category.name)
        .order_by(func.count(BorrowRequest.id).desc())
        .limit(10)
        .all()
    )
    return [{"category": name, "borrow_count": count} for name, count in rows]


@router.get("/top-contributors")
def top_contributors(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    rows = (
        db.query(User.full_name, func.count(Resource.id).label("resource_count"))
        .join(Resource, Resource.owner_id == User.id)
        .group_by(User.full_name)
        .order_by(func.count(Resource.id).desc())
        .limit(10)
        .all()
    )
    return [{"user": name, "resource_count": count} for name, count in rows]


@router.get("/department-usage")
def department_usage(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    rows = (
        db.query(User.department, func.count(BorrowRequest.id).label("borrow_count"))
        .join(BorrowRequest, BorrowRequest.borrower_id == User.id)
        .filter(User.department.isnot(None))
        .group_by(User.department)
        .order_by(func.count(BorrowRequest.id).desc())
        .all()
    )
    return [{"department": dept, "borrow_count": count} for dept, count in rows]
