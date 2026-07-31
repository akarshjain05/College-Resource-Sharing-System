from app.core.database import SessionLocal
from app.models.user import User

db = SessionLocal()
vikash = db.query(User).filter(User.full_name == "B_U24CS145_VIKASH_KUMAR").first()
if vikash:
    print(f"Vikash avg_response_seconds: {vikash.avg_response_seconds}, response_count: {vikash.response_count}")
db.close()
