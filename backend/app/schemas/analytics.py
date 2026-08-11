from typing import List
from pydantic import BaseModel
from datetime import datetime

class KPIResponse(BaseModel):
    total_active_users: int
    total_items_shared: int
    community_value_inr: float
    active_disputes: int

class BorrowTrend(BaseModel):
    week: str
    items_borrowed: int

class CategoryDistribution(BaseModel):
    name: str
    value: int
    percentage: str

class RecentActivityItem(BaseModel):
    id: str
    type: str  # "listing", "return", "dispute"
    title: str
    user: str
    timestamp: datetime
    icon: str  # e.g. "laptop", "check", "gavel"

class AnalyticsResponse(BaseModel):
    kpis: KPIResponse
    borrowing_trends: List[BorrowTrend]
    popular_categories: List[CategoryDistribution]
    recent_activity: List[RecentActivityItem]
