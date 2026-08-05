import uuid
from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ResourceCondition, ResourceStatus
from app.schemas.user import UserResponse
from app.schemas.category import CategoryResponse
from app.utils.validation import SafeStr


class ResourceImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    image_url: str
    is_primary: bool


class ResourceBase(BaseModel):
    title: SafeStr = Field(..., min_length=3, max_length=200)
    description: SafeStr = Field(..., min_length=10, max_length=5000)
    condition: ResourceCondition = ResourceCondition.GOOD
    quantity: int = Field(1, ge=1)
    pickup_location: Optional[SafeStr] = Field(None, max_length=200)
    tags: Optional[SafeStr] = Field(None, max_length=200)
    deposit_amount: Optional[float] = Field(0, ge=0)
    max_borrow_days: int = Field(7, ge=1, le=90)
    available_from: Optional[date] = None
    available_to: Optional[date] = None
    category_id: uuid.UUID


class ResourceCreate(ResourceBase):
    status: Optional[ResourceStatus] = None


class ResourceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[SafeStr] = Field(None, min_length=3, max_length=200)
    description: Optional[SafeStr] = Field(None, min_length=10, max_length=5000)
    condition: Optional[ResourceCondition] = None
    status: Optional[ResourceStatus] = None
    quantity: Optional[int] = Field(None, ge=1)
    pickup_location: Optional[SafeStr] = Field(None, max_length=200)
    tags: Optional[SafeStr] = Field(None, max_length=200)
    deposit_amount: Optional[float] = Field(None, ge=0)
    max_borrow_days: Optional[int] = Field(None, ge=1, le=90)
    available_from: Optional[date] = None
    available_to: Optional[date] = None
    category_id: Optional[uuid.UUID] = None


class ResourceResponse(ResourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: ResourceStatus
    quantity_available: int
    barcode: Optional[str] = None
    qr_code_url: Optional[str] = None
    average_rating: float = 0.0
    total_borrows: int = 0
    view_count: int = 0
    owner: UserResponse
    category: CategoryResponse
    images: List[ResourceImageResponse] = []
    is_wishlisted: Optional[bool] = False
    created_at: datetime


class ResourceListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ResourceResponse]
