import os
import uuid
import aiofiles
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.auth_models import User
from app.models.inspection_models import Product, ProductImage, PackageSide
from app.schemas.inspection_schemas import ProductImageOut
from app.services.vision.preprocessor import ImagePreprocessor
from app.api.auth import get_current_user

router = APIRouter(prefix="/images", tags=["Package Images"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

@router.post("/upload/{product_id}", response_model=ProductImageOut)
async def upload_package_image(
    product_id: int,
    package_side: PackageSide = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: JPG, PNG, WEBP."
        )

    # Save raw file
    unique_filename = f"prod_{product_id}_{package_side.value.lower()}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = settings.UPLOAD_DIR / unique_filename

    file_size = 0
    async with aiofiles.open(dest_path, 'wb') as out_file:
        while content := await file.read(1024 * 1024):
            file_size += len(content)
            if file_size > MAX_FILE_SIZE:
                dest_path.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="File exceeds maximum allowed size (25MB)")
            await out_file.write(content)

    # Assess quality using OpenCV
    quality = ImagePreprocessor.assess_quality(str(dest_path))

    # Generate enhanced OCR version
    enhanced_filename = f"enhanced_{unique_filename}"
    enhanced_path = settings.UPLOAD_DIR / enhanced_filename
    ImagePreprocessor.preprocess_for_ocr(str(dest_path), str(enhanced_path))

    # Calculate calibration factor if this is a calibration card or if package dimensions are known
    if product.package_height_mm and quality["height"] > 0:
        product.calibration_factor = round(quality["height"] / product.package_height_mm, 2)
        db.commit()

    product_image = ProductImage(
        product_id=product_id,
        package_side=package_side,
        file_path=f"/api/v1/images/file/{unique_filename}",
        file_name=file.filename,
        file_size=file_size,
        width=quality["width"],
        height=quality["height"],
        blur_score=quality["blur_score"],
        quality_status=quality["quality_status"],
        processed_path=f"/api/v1/images/file/{enhanced_filename}"
    )
    db.add(product_image)
    db.commit()
    db.refresh(product_image)
    return product_image

@router.get("/file/{filename}")
def serve_image(filename: str):
    file_path = settings.UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")
    return FileResponse(file_path)

@router.delete("/{image_id}")
def delete_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    img = db.query(ProductImage).filter(ProductImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    db.delete(img)
    db.commit()
    return {"message": "Image deleted successfully"}
