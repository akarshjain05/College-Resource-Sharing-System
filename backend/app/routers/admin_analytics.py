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
        db.query(func.count(BorrowRequest.id))
        .filter(BorrowRequest.status == BorrowStatus.ACTIVE)
        .scalar()
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

@router.get("/dashboard")
def get_analytics_dashboard(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    from sqlalchemy import func
    from datetime import datetime, timedelta
    from app.models.user import User
    from app.models.resource import Resource
    from app.models.borrow import BorrowRequest
    from app.models.misc import Complaint
    from app.models.enums import ResourceStatus, BorrowStatus, ComplaintStatus
    from app.models.category import Category
    from app.schemas.analytics import AnalyticsResponse, KPIResponse, BorrowTrend, CategoryDistribution, RecentActivityItem
    
    # 1. KPIs
    total_active_users = db.query(User).filter(User.is_active == True).count()
    total_items_shared = db.query(Resource).filter(Resource.status != ResourceStatus.UNAVAILABLE).count()
    
    val_result = db.query(func.sum(Resource.deposit_amount)).join(
        BorrowRequest, Resource.id == BorrowRequest.resource_id
    ).filter(
        BorrowRequest.status.in_([BorrowStatus.ACTIVE, BorrowStatus.RETURN_REQUESTED, BorrowStatus.RETURNED, BorrowStatus.LATE, BorrowStatus.DAMAGED])
    ).scalar()
    community_value_inr = float(val_result or 0.0)
    
    active_disputes = db.query(Complaint).filter(Complaint.status.in_([ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS])).count()
    
    # 2. Borrowing Trends (Last 12 weeks)
    trends = []
    now = datetime.utcnow()
    for i in range(11, -1, -1):
        start_date = now - timedelta(days=(i * 7) + 7)
        end_date = now - timedelta(days=(i * 7))
        count = db.query(BorrowRequest).filter(
            BorrowRequest.created_at >= start_date,
            BorrowRequest.created_at < end_date
        ).count()
        trends.append({
            "week": f"Week {12 - i}",
            "items_borrowed": count
        })
        
    # 3. Popular Categories
    cat_counts = db.query(
        Category.name,
        func.count(Resource.id).label("count")
    ).join(Resource, Category.id == Resource.category_id).group_by(Category.name).order_by(func.count(Resource.id).desc()).limit(5).all()
    
    total_resources = sum([c.count for c in cat_counts])
    popular_categories = []
    for c in cat_counts:
        pct = f"{(c.count / total_resources * 100):.0f}%" if total_resources > 0 else "0%"
        popular_categories.append({
            "name": c.name,
            "value": c.count,
            "percentage": pct
        })
        
    # 4. Recent Activity
    activities = []
    
    recent_resources = db.query(Resource).order_by(Resource.created_at.desc()).limit(10).all()
    for r in recent_resources:
        activities.append(RecentActivityItem(
            id=f"res_{r.id}",
            type="listing",
            title=f'New Listing: "{r.title}"',
            user=f"by {r.owner.full_name}",
            timestamp=r.created_at,
            icon="laptop"
        ))
        
    recent_returns = db.query(BorrowRequest).filter(
        BorrowRequest.status.in_([BorrowStatus.RETURNED, BorrowStatus.DAMAGED])
    ).order_by(BorrowRequest.actual_return_date.desc().nulls_last()).limit(10).all()
    for ret in recent_returns:
        activities.append(RecentActivityItem(
            id=f"ret_{ret.id}",
            type="return",
            title=f'Successful Return: "{ret.resource.title}"',
            user=f"from {ret.borrower.full_name}",
            timestamp=ret.actual_return_date or ret.updated_at,
            icon="check"
        ))
        
    recent_disputes = db.query(Complaint).filter(Complaint.status == ComplaintStatus.RESOLVED).order_by(Complaint.updated_at.desc()).limit(10).all()
    for disp in recent_disputes:
        activities.append(RecentActivityItem(
            id=f"disp_{disp.id}",
            type="dispute",
            title=f'Dispute Resolved: "{disp.borrow_request.resource.title}"',
            user=f"involving {disp.reporter.full_name}",
            timestamp=disp.updated_at,
            icon="gavel"
        ))
        
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    recent_activity = activities[:15]
    
    return AnalyticsResponse(
        kpis=KPIResponse(
            total_active_users=total_active_users,
            total_items_shared=total_items_shared,
            community_value_inr=community_value_inr,
            active_disputes=active_disputes
        ),
        borrowing_trends=[BorrowTrend(**t) for t in trends],
        popular_categories=[CategoryDistribution(**c) for c in popular_categories],
        recent_activity=recent_activity
    )
