import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.routers.admin_analytics import get_analytics_dashboard
from app.models.user import User

db = SessionLocal()
try:
    # Get any admin user for test
    admin = db.query(User).filter(User.role == "ADMIN").first()
    res = get_analytics_dashboard(db, admin)
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
