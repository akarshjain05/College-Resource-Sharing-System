import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict

from app.schemas.user import UserResponse
from app.schemas.resource import CategoryResponse, ResourceResponse


class WantedOfferCreate(BaseModel):
    resource_id: uuid.UUID


class WantedOfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    wanted_request_id: uuid.UUID
    offerer_id: uuid.UUID
    resource_id: uuid.UUID
    status: str
    created_at: datetime
    
    offerer: UserResponse
    resource: ResourceResponse



class WantedCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    category_id: uuid.UUID


class WantedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str] = None
    category_id: uuid.UUID
    is_fulfilled: bool
    created_at: datetime

    user: UserResponse
    category: CategoryResponse
