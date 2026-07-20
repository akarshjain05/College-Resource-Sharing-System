import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DamageClaimStatus
from app.schemas.user import UserResponse


class DamageClaimDispute(BaseModel):
    """Borrower submits a dispute against a damage claim."""
    dispute_reason: str = Field(..., min_length=10, max_length=2000)


class DamageClaimResolve(BaseModel):
    """Admin resolves a damage claim with a final verdict."""
    status: DamageClaimStatus = Field(
        ...,
        description="Must be one of: resolved_valid, resolved_invalid, resolved_partial",
    )
    admin_resolution: str = Field(..., min_length=5, max_length=2000)
    final_cost: Optional[float] = Field(None, ge=0, description="Final assessed damage cost")
    trust_penalty: int = Field(0, ge=0, le=50, description="Trust score points to deduct from the borrower")


class DamageClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    borrow_request_id: uuid.UUID
    description: str
    estimated_cost: Optional[float] = None
    dispute_reason: Optional[str] = None
    status: DamageClaimStatus
    admin_resolution: Optional[str] = None
    final_cost: Optional[float] = None
    trust_penalty_applied: int = 0
    filed_by: UserResponse
    against_user: UserResponse
    created_at: datetime
