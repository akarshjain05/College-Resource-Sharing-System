import re

with open("backend/app/routers/admin.py", "r") as f:
    code = f.read()

new_endpoint = """
@router.get("/analytics", response_model=None)
def get_analytics_dashboard(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    from sqlalchemy import func
    from datetime import datetime, timedelta
    from app.models.user import User
    from app.models.resource import Resource
    from app.models.borrow import BorrowRequest
    from app.models.complaint import Complaint
    from app.models.enums import ResourceStatus, BorrowStatus, ComplaintStatus
    from app.models.category import Category
    from app.schemas.analytics import AnalyticsResponse, KPIResponse, BorrowTrend, CategoryDistribution, RecentActivityItem
    
    # 1. KPIs
    total_active_users = db.query(User).filter(User.is_active == True).count()
    total_items_shared = db.query(Resource).filter(Resource.status != ResourceStatus.UNAVAILABLE).count()
    
    # Community Value (Sum of deposit amounts for active/completed borrows)
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
    # Create 12 weekly buckets
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
    
    # Recent Listings
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
        
    # Recent Returns
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
        
    # Recent Disputes
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
"""

code = code + "\n\n" + new_endpoint.strip() + "\n"

with open("backend/app/routers/admin.py", "w") as f:
    f.write(code)
print("Patched admin.py")
