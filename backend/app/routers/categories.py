import re
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.exceptions import NotFoundException, ConflictException
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse

router = APIRouter(prefix="/categories", tags=["Categories"])


def slugify(value: str) -> str:
    value = re.sub(r"[^\w\s-]", "", value.lower()).strip()
    return re.sub(r"[\s_-]+", "-", value)


@router.get("", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    if not categories:
        default_cats = [
            ("Electronics", "electronics", "Cameras, laptops, monitors, and gadgets", "cpu"),
            ("Lab Equipment", "lab-equipment", "Soldering stations, multimeters, sensors", "flask-conical"),
            ("Sports Equipment", "sports-equipment", "Balls, rackets, gym gear", "dumbbell"),
            ("Books & References", "books-references", "Textbooks and reference material", "book-open"),
            ("Stationery & Tools", "stationery-tools", "Calculators, drafting tools, extension boards", "ruler"),
            ("Other", "other", "Miscellaneous campus items", "package"),
        ]
        for name, slug, description, icon in default_cats:
            cat = Category(name=name, slug=slug, description=description, icon=icon)
            db.add(cat)
        db.commit()
        categories = db.query(Category).all()
    return categories


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: uuid.UUID, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise NotFoundException("Category not found")
    return category


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    slug = slugify(payload.name)
    if db.query(Category).filter(Category.slug == slug).first():
        raise ConflictException("A category with this name already exists")
    category = Category(**payload.model_dump(), slug=slug)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise NotFoundException("Category not found")
    db.delete(category)
    db.commit()
    return None
