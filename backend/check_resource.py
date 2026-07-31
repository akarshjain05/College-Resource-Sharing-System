from app.core.database import SessionLocal
from app.models.resource import Resource
import json

db = SessionLocal()
r = db.query(Resource).filter(Resource.title == "file").first()
if r:
    print(f"Resource owner avg_response_seconds: {r.owner.avg_response_seconds}")
    print(f"Resource owner response_count: {r.owner.response_count}")
db.close()
