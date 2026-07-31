import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.models.enums import UserRole

def promote_to_admin(email: str):
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Error: User with email '{email}' not found.")
            sys.exit(1)
        
        user.role = UserRole.ADMIN
        db.commit()
        print(f"Success! {email} has been promoted to Admin.")
    except Exception as e:
        print(f"Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python promote_admin.py <your_campus_email>")
        sys.exit(1)
    
    target_email = sys.argv[1]
    promote_to_admin(target_email)
