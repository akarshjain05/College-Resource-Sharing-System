import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ResourceCondition, ResourceStatus
from app.schemas.user import UserResponse
from app.schemas.category import CategoryResponse


class ResourceImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    image_url: str
    is_primary: bool


class ResourceBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    condition: ResourceCondition = ResourceCondition.GOOD
    quantity: int = Field(1, ge=1)
    pickup_location: Optional[str] = None
    tags: Optional[str] = None
    deposit_amount: Optional[float] = Field(0, ge=0)
    max_borrow_days: int = Field(7, ge=1, le=90)
    category_id: uuid.UUID


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[ResourceCondition] = None
    quantity: Optional[int] = None
    pickup_location: Optional[str] = None
    tags: Optional[str] = None
    deposit_amount: Optional[float] = None
    max_borrow_days: Optional[int] = None
    status: Optional[ResourceStatus] = None
    category_id: Optional[uuid.UUID] = None


class ResourceResponse(ResourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: ResourceStatus
    quantity_available: int
    barcode: Optional[str] = None
    qr_code_url: Optional[str] = None
    average_rating: float
    total_borrows: int
    view_count: int
    owner: UserResponse
    category: CategoryResponse
    images: List[ResourceImageResponse] = []
    created_at: datetime


class ResourceListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ResourceResponse]
