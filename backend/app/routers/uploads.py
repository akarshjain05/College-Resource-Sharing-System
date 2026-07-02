import uuid

from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.resource import Resource, ResourceImage
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.resource import ResourceImageResponse
from app.schemas.user import UserResponse
from app.utils.file_upload import save_upload_file

router = APIRouter(prefix="/uploads", tags=["File Uploads"])


@router.post("/profile-picture", response_model=UserResponse)
def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    url = save_upload_file(file, "profiles")
    current_user.profile_picture_url = url
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post(
    "/resources/{resource_id}/image",
    response_model=ResourceImageResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_resource_image(
    resource_id: uuid.UUID,
    file: UploadFile = File(...),
    is_primary: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise NotFoundException("Resource not found")
    if resource.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenException("You can only upload images for your own resources")

    url = save_upload_file(file, "resources")

    if is_primary:
        for img in resource.images:
            img.is_primary = False

    image = ResourceImage(resource_id=resource.id, image_url=url, is_primary=is_primary)
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.delete("/resources/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource_image(
    image_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    image = db.query(ResourceImage).filter(ResourceImage.id == image_id).first()
    if not image:
        raise NotFoundException("Image not found")
    if image.resource.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenException("You can only delete images for your own resources")
    db.delete(image)
    db.commit()
    return None
