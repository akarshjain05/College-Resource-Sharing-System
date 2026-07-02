"""
Seed the database with demo categories, users, and resources.

Run inside the backend container after the app has started (so tables exist):

    docker compose exec backend python scripts/seed_data.py

Safe to re-run: skips creation if the admin account already exists.
"""
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User
from app.models.category import Category
from app.models.resource import Resource
from app.models.enums import UserRole, ResourceCondition


CATEGORIES = [
    ("Electronics", "Cameras, laptops, monitors, and gadgets", "cpu"),
    ("Lab Equipment", "Soldering stations, multimeters, sensors", "flask-conical"),
    ("Sports Equipment", "Balls, rackets, gym gear", "dumbbell"),
    ("Books & References", "Textbooks and reference material", "book-open"),
    ("Stationery & Tools", "Calculators, drafting tools, extension boards", "ruler"),
]

DEMO_USERS = [
    {
        "full_name": "Admin User",
        "email": "admin@crss.edu",
        "password": "AdminPass123!",
        "role": UserRole.ADMIN,
        "department": "Administration",
        "is_verified": True,
    },
    {
        "full_name": "Asha Rao",
        "email": "asha.rao@crss.edu",
        "password": "Password123!",
        "role": UserRole.STUDENT,
        "department": "Computer Science",
        "course": "B.Tech CSE",
        "year_of_study": 3,
        "student_id": "CSE2023001",
        "is_verified": True,
    },
    {
        "full_name": "Robotics Club",
        "email": "robotics.club@crss.edu",
        "password": "Password123!",
        "role": UserRole.CLUB,
        "department": "Robotics Club",
        "is_verified": True,
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "admin@crss.edu").first():
            print("Seed data already present. Skipping.")
            return

        category_objs = {}
        for name, description, icon in CATEGORIES:
            cat = Category(name=name, slug=name.lower().replace(" & ", "-").replace(" ", "-"), description=description, icon=icon)
            db.add(cat)
            db.flush()
            category_objs[name] = cat

        user_objs = {}
        for u in DEMO_USERS:
            user = User(
                full_name=u["full_name"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
                department=u.get("department"),
                course=u.get("course"),
                year_of_study=u.get("year_of_study"),
                student_id=u.get("student_id"),
                is_verified=u.get("is_verified", False),
            )
            db.add(user)
            db.flush()
            user_objs[u["email"]] = user

        demo_resources = [
            {
                "title": "Canon EOS 1500D DSLR Camera",
                "description": "18-55mm kit lens included. Great for club events and photography projects.",
                "condition": ResourceCondition.GOOD,
                "category": "Electronics",
                "owner": "asha.rao@crss.edu",
                "pickup_location": "Hostel Block C, Room 204",
                "max_borrow_days": 5,
                "deposit_amount": 500,
            },
            {
                "title": "Soldering Station Kit",
                "description": "Temperature-controlled soldering iron with stand, solder wire, and flux.",
                "condition": ResourceCondition.NEW,
                "category": "Lab Equipment",
                "owner": "robotics.club@crss.edu",
                "pickup_location": "Robotics Lab, Block D",
                "max_borrow_days": 3,
                "deposit_amount": 200,
            },
            {
                "title": "Scientific Calculator - Casio fx-991EX",
                "description": "Barely used, perfect for engineering coursework.",
                "condition": ResourceCondition.GOOD,
                "category": "Stationery & Tools",
                "owner": "asha.rao@crss.edu",
                "pickup_location": "Library Annex",
                "max_borrow_days": 14,
                "deposit_amount": 0,
            },
        ]

        for r in demo_resources:
            resource = Resource(
                title=r["title"],
                description=r["description"],
                condition=r["condition"],
                quantity=1,
                quantity_available=1,
                pickup_location=r["pickup_location"],
                max_borrow_days=r["max_borrow_days"],
                deposit_amount=r["deposit_amount"],
                owner_id=user_objs[r["owner"]].id,
                category_id=category_objs[r["category"]].id,
            )
            db.add(resource)

        db.commit()
        print("Seed data created successfully.")
        print("Admin login: admin@crss.edu / AdminPass123!")
        print("Student login: asha.rao@crss.edu / Password123!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
