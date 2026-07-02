"""
Utilities for validating and persisting uploaded files (profile pictures, resource images).
"""
import os
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import AppException
from fastapi import status

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _ensure_upload_dir(subfolder: str) -> Path:
    upload_root = Path(settings.UPLOAD_DIR) / subfolder
    upload_root.mkdir(parents=True, exist_ok=True)
    return upload_root


def validate_image(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise AppException(
            f"Unsupported file type '{file.content_type}'. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_FILE_TYPE",
        )
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise AppException(
            f"Unsupported file extension '{ext}'.",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_FILE_EXTENSION",
        )


def save_upload_file(file: UploadFile, subfolder: str) -> str:
    """
    Validates, size-checks, and saves an uploaded image.
    Returns a relative URL path (e.g. /uploads/resources/<uuid>.jpg) the frontend can use directly.
    """
    validate_image(file)

    upload_dir = _ensure_upload_dir(subfolder)
    ext = Path(file.filename or "").suffix.lower()
    new_filename = f"{uuid.uuid4()}{ext}"
    destination = upload_dir / new_filename

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    size = 0
    with open(destination, "wb") as out_file:
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                out_file.close()
                os.remove(destination)
                raise AppException(
                    f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB}MB limit.",
                    status_code=status.HTTP_400_BAD_REQUEST,
                    error_code="FILE_TOO_LARGE",
                )
            out_file.write(chunk)

    return f"/uploads/{subfolder}/{new_filename}"
