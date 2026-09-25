from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.auth_models import User
from app.models.inspection_models import Inspection, Product, ComplianceStatus
from app.schemas.inspection_schemas import ProductCreate, ProductOut
from app.api.auth import get_current_user

router = APIRouter(prefix="/products", tags=["Products Under Inspection"])

@router.post("/inspection/{inspection_id}", response_model=ProductOut)
def add_product_to_inspection(
    inspection_id: int,
    prod_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    product = Product(
        inspection_id=inspection_id,
        product_name=prod_in.product_name,
        category=prod_in.category,
        brand=prod_in.brand,
        barcode=prod_in.barcode,
        package_height_mm=prod_in.package_height_mm,
        package_width_mm=prod_in.package_width_mm,
        compliance_status=ComplianceStatus.OFFICER_REVIEW_REQUIRED
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.get("", response_model=List[ProductOut])
@router.get("/", response_model=List[ProductOut])
def list_products(
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Product.product_name.ilike(term)) | (Product.brand.ilike(term))
        )
    if status and status.strip() and status.upper() != "ALL":
        s = status.strip().upper()
        if s in ["NON_COMPLIANT", "POTENTIAL_NON_COMPLIANCE"]:
            query = query.filter(Product.compliance_status.in_([
                ComplianceStatus.POTENTIAL_NON_COMPLIANCE,
                ComplianceStatus.CONFIRMED_NON_COMPLIANCE
            ]))
        elif s in ["PENDING", "PENDING_REVIEW", "OFFICER_REVIEW_REQUIRED"]:
            query = query.filter(Product.compliance_status == ComplianceStatus.OFFICER_REVIEW_REQUIRED)
        elif s == "COMPLIANT":
            query = query.filter(Product.compliance_status == ComplianceStatus.COMPLIANT)
        else:
            query = query.filter(Product.compliance_status == s)
    return query.order_by(Product.created_at.desc()).all()

@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return prod

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    from app.models.ai_models import ExtractedDeclaration, OCRResult
    from app.models.rule_models import ComplianceFinding, OfficerDecision
    from app.models.inspection_models import AnalysisJob, ProductImage

    # Delete extracted declarations
    db.query(ExtractedDeclaration).filter(ExtractedDeclaration.product_id == prod.id).delete()

    # Delete findings and decisions
    findings = db.query(ComplianceFinding).filter(ComplianceFinding.product_id == prod.id).all()
    for f in findings:
        db.query(OfficerDecision).filter(OfficerDecision.finding_id == f.id).delete()
        db.delete(f)

    # Delete analysis jobs
    db.query(AnalysisJob).filter(AnalysisJob.product_id == prod.id).delete()

    # Delete product images and OCR results
    images = db.query(ProductImage).filter(ProductImage.product_id == prod.id).all()
    for img in images:
        db.query(OCRResult).filter(OCRResult.product_image_id == img.id).delete()
        db.delete(img)

    db.delete(prod)
    db.commit()
    return {"message": "Product removed successfully", "id": product_id}
