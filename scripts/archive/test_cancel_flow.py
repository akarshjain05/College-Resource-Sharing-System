import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.borrow import BorrowRequest
from app.models.payment import Payment
from app.models.enums import BorrowStatus, PaymentStatus
import uuid

# SQLite URL
SQLALCHEMY_DATABASE_URL = "sqlite:///backend/sqlite.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("Connected to DB")

