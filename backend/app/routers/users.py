import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_my_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
def get_user_profile(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException("User not found")
    return user


@router.get("/{user_id}/public")
def get_public_profile(user_id: uuid.UUID, db: Session = Depends(get_db)):
    from app.schemas.user import PublicUserResponse
    from app.models.resource import Resource
    from app.schemas.resource import ResourceResponse
    from app.models.borrow import BorrowRequest
    from app.models.enums import BorrowStatus
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException("User not found")
        
    public_user = PublicUserResponse.model_validate(user)
    
    # Also fetch active resources this user is sharing
    shared_resources = (
        db.query(Resource)
        .filter(Resource.owner_id == user_id)
        .order_by(Resource.created_at.desc())
        .limit(10)
        .all()
    )

    # Calculate stats
    borrower_requests = db.query(BorrowRequest).filter(
        BorrowRequest.borrower_id == user_id, 
        BorrowRequest.status.in_([BorrowStatus.RETURNED, BorrowStatus.DAMAGED, BorrowStatus.LATE])
    ).all()
    
    total_borrows = len(borrower_requests)
    returned_on_time = sum(1 for br in borrower_requests if br.status == BorrowStatus.RETURNED and (br.actual_return_date and br.actual_return_date <= br.requested_end_date))
    rated_as_borrower = [br.borrower_rating for br in borrower_requests if br.borrower_rating]
    avg_borrower_rating = sum(rated_as_borrower) / len(rated_as_borrower) if rated_as_borrower else 0

    lender_requests = db.query(BorrowRequest).filter(
        BorrowRequest.lender_id == user_id,
        BorrowRequest.status.in_([BorrowStatus.RETURNED, BorrowStatus.DAMAGED, BorrowStatus.LATE])
    ).all()
    
    total_lends = len(lender_requests)
    rated_as_lender = [br.lender_rating for br in lender_requests if br.lender_rating]
    avg_lender_rating = sum(rated_as_lender) / len(rated_as_lender) if rated_as_lender else 0
    
    stats = {
        "total_borrows": total_borrows,
        "returned_on_time": returned_on_time,
        "avg_borrower_rating": round(avg_borrower_rating, 1),
        "total_lends": total_lends,
        "avg_lender_rating": round(avg_lender_rating, 1),
    }
    
    recent_reviews = []
    
    # Reviews where this user was the borrower (so the LENDER left the review)
    borrower_reviews = db.query(BorrowRequest).filter(
        BorrowRequest.borrower_id == user_id,
        BorrowRequest.borrower_review.isnot(None)
    ).order_by(BorrowRequest.actual_return_date.desc()).limit(5).all()
    
    for br in borrower_reviews:
        recent_reviews.append({
            "id": str(br.id),
            "role": "borrower",
            "reviewer_name": br.lender.full_name,
            "rating": br.borrower_rating,
            "review": br.borrower_review,
            "date": br.actual_return_date.isoformat() if br.actual_return_date else None,
            "resource_title": br.resource.title
        })

    # Reviews where this user was the lender (so the BORROWER left the review)
    lender_reviews = db.query(BorrowRequest).filter(
        BorrowRequest.lender_id == user_id,
        BorrowRequest.lender_review.isnot(None)
    ).order_by(BorrowRequest.actual_return_date.desc()).limit(5).all()
    
    for br in lender_reviews:
        recent_reviews.append({
            "id": str(br.id),
            "role": "lender",
            "reviewer_name": br.borrower.full_name,
            "rating": br.lender_rating,
            "review": br.lender_review,
            "date": br.actual_return_date.isoformat() if br.actual_return_date else None,
            "resource_title": br.resource.title
        })
        
    # Sort by date descending
    recent_reviews.sort(key=lambda x: x["date"] or "", reverse=True)
    recent_reviews = recent_reviews[:10]
    
    return {
        "user": public_user,
        "shared_resources": shared_resources,
        "stats": stats,
        "recent_reviews": recent_reviews,
    }


@router.get("", response_model=list[UserResponse])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(User).offset(skip).limit(limit).all()


@router.post("/{user_id}/suspend", response_model=UserResponse)
def suspend_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException("User not found")
    user.is_suspended = True
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/unsuspend", response_model=UserResponse)
def unsuspend_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException("User not found")
    user.is_suspended = False
    db.commit()
    db.refresh(user)
    return user
