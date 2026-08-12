import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.borrow import BorrowRequest
from app.models.payment import Payment

SQLALCHEMY_DATABASE_URL = "sqlite:///backend/sqlite.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Find the bat request
reqs = db.query(BorrowRequest).all()
for r in reqs:
    p = db.query(Payment).filter(Payment.borrow_request_id == r.id).first()
    title = r.resource.title if r.resource else 'Unknown'
    p_status = p.status if p else 'No Payment'
    print(f"Request: {r.id}, Resource: {title}, Status: {r.status}, Payment Status: {p_status}")

