from datetime import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, Field
from app.utils.validation import SafeStr


class ChatMessageBase(BaseModel):
    body: SafeStr = Field(..., max_length=1000)
    message_type: str = Field(default="text", max_length=50)
    metadata_payload: Optional[dict] = None


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageResponse(ChatMessageBase):
    id: uuid.UUID
    borrow_request_id: uuid.UUID
    sender_id: uuid.UUID
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
