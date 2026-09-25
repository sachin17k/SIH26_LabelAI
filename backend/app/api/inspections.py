import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.auth_models import User, UserRole, AuditLog
from app.models.inspection_models import Inspection, Establishment, InspectionStatus
from app.schemas.inspection_schemas import (
    InspectionCreate, InspectionUpdate, InspectionOut,
    EstablishmentCreate, EstablishmentOut
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/inspections", tags=["Inspections"])

@router.get("", response_model=List[InspectionOut])
def list_inspections(
    status: Optional[InspectionStatus] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Inspection)
    
    # If Inspector, allow viewing their own jurisdiction or assigned inspections
    if current_user.role == UserRole.INSPECTOR:
        query = query.filter(Inspection.inspector_id == current_user.id)
        
    if status:
        query = query.filter(Inspection.status == status)
        
    if search:
        query = query.join(Establishment).filter(
            (Inspection.inspection_number.ilike(f"%{search}%")) |
            (Establishment.name.ilike(f"%{search}%")) |
            (Establishment.city.ilike(f"%{search}%"))
        )
        
    inspections = query.order_by(Inspection.created_at.desc()).offset(skip).limit(limit).all()
    return inspections

@router.post("", response_model=InspectionOut)
def create_inspection(
    insp_in: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    establishment_id = insp_in.establishment_id
    
    # Create establishment if provided inline
    if not establishment_id and insp_in.establishment_data:
        est_data = insp_in.establishment_data
        est = Establishment(
            name=est_data.name,
            license_number=est_data.license_number,
            address=est_data.address,
            city=est_data.city,
            state=est_data.state,
            pincode=est_data.pincode,
            establishment_type=est_data.establishment_type,
            contact_person=est_data.contact_person,
            contact_phone=est_data.contact_phone
        )
        db.add(est)
        db.commit()
        db.refresh(est)
        establishment_id = est.id
        
    if not establishment_id:
        raise HTTPException(status_code=400, detail="Establishment ID or Establishment Data is required")
        
    # Generate unique inspection number
    date_str = datetime.utcnow().strftime("%Y%m%d")
    short_code = str(uuid.uuid4())[:4].upper()
    inspection_number = f"INS-{date_str}-{short_code}"

    new_insp = Inspection(
        inspection_number=inspection_number,
        establishment_id=establishment_id,
        inspector_id=current_user.id,
        status=InspectionStatus.IN_PROGRESS,
        scheduled_date=insp_in.scheduled_date or datetime.utcnow(),
        officer_notes=insp_in.officer_notes
    )
    db.add(new_insp)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="INSPECTION_CREATED",
        target_entity="Inspection",
        target_id=inspection_number,
        details={"establishment_id": establishment_id}
    )
    db.add(audit)
    db.commit()
    db.refresh(new_insp)
    return new_insp

@router.get("/{inspection_id}", response_model=InspectionOut)
def get_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return insp

@router.put("/{inspection_id}", response_model=InspectionOut)
def update_inspection(
    inspection_id: int,
    update_data: InspectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
        
    if update_data.status:
        insp.status = update_data.status
        if update_data.status == InspectionStatus.FINALIZED:
            insp.finalized_date = datetime.utcnow()
            
    if update_data.officer_notes is not None:
        insp.officer_notes = update_data.officer_notes
        
    if update_data.supervisor_id is not None:
        insp.supervisor_id = update_data.supervisor_id

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="INSPECTION_STATUS_UPDATED",
        target_entity="Inspection",
        target_id=insp.inspection_number,
        details={"new_status": str(insp.status)}
    )
    db.add(audit)
    db.commit()
    db.refresh(insp)
    return insp

@router.get("/establishments/list", response_model=List[EstablishmentOut])
def list_establishments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Establishment).order_by(Establishment.name.asc()).all()

@router.post("/instant-scan")
async def instant_photo_scan(
    files: List[UploadFile] = File(...),
    establishment_name: Optional[str] = Form(None),
    product_name: Optional[str] = Form(None),
    inspection_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Zero-typing Instant Photo Scan:
    Receives raw package photos, auto-detects commodity name & brand via OCR,
    extracts all mandatory statutory declarations, evaluates Legal Metrology rules,
    and returns complete visual evidence and findings.
    """
    import aiofiles
    from app.core.config import settings
    from app.models.inspection_models import Product, ProductImage, PackageSide, ComplianceStatus
    from app.models.ai_models import OCRResult, ExtractedDeclaration
    from app.services.vision.preprocessor import ImagePreprocessor
    from app.services.vision.ocr_engine import OCREngine
    from app.services.vision.readability import ReadabilityAnalyzer
    from app.services.extractor.declaration_parser import DeclarationParser
    from app.services.extractor.multi_side_merger import MultiSideMerger
    from app.services.compliance.engine import ComplianceEngine

    if not files:
        raise HTTPException(status_code=400, detail="At least one package image must be provided.")

    # 1. Resolve or create inspection
    target_insp = None
    if inspection_id:
        target_insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()

    if not target_insp:
        # Get or create establishment
        est = None
        if establishment_name:
            est = db.query(Establishment).filter(Establishment.name.ilike(f"%{establishment_name}%")).first()
        if not est:
            est = db.query(Establishment).first()
        if not est:
            est = Establishment(
                name="Central Retail Market",
                address="Market Surveillance Jurisdiction",
                city="Bengaluru",
                state="Karnataka"
            )
            db.add(est)
            db.commit()
            db.refresh(est)

        date_str = datetime.utcnow().strftime("%Y%m%d")
        short_code = str(uuid.uuid4())[:4].upper()
        target_insp = Inspection(
            inspection_number=f"INS-{date_str}-{short_code}",
            establishment_id=est.id,
            inspector_id=current_user.id,
            status=InspectionStatus.IN_PROGRESS,
            scheduled_date=datetime.utcnow(),
            officer_notes="Instant Photo Compliance Audit initiated via AI Vision."
        )
        db.add(target_insp)
        db.commit()
        db.refresh(target_insp)

    # 2. Temporary product placeholder before OCR title detection
    product = Product(
        inspection_id=target_insp.id,
        product_name="Scanning Packaged Commodity...",
        category="General",
        compliance_status=ComplianceStatus.OFFICER_REVIEW_REQUIRED
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    all_ocr_texts = []
    all_declarations = []
    total_conf = 0.0
    ocr_count = 0
    readability_scores = []

    # Map package sides in sequence: FRONT, BACK, MRP_AREA, etc.
    side_sequence = [
        PackageSide.FRONT, PackageSide.BACK, PackageSide.MRP_AREA,
        PackageSide.LEFT, PackageSide.RIGHT, PackageSide.LABEL_CLOSEUP
    ]

    for idx, f in enumerate(files):
        ext = os.path.splitext(f.filename)[1].lower() or ".jpg"
        side = side_sequence[idx % len(side_sequence)]
        unique_name = f"instant_prod_{product.id}_{side.value.lower()}_{uuid.uuid4().hex[:6]}{ext}"
        dest_path = settings.UPLOAD_DIR / unique_name

        file_size = 0
        async with aiofiles.open(dest_path, 'wb') as out_file:
            while content := await f.read(1024 * 1024):
                file_size += len(content)
                await out_file.write(content)

        # Quality assessment
        quality = ImagePreprocessor.assess_quality(str(dest_path))

        # Multi-angle OCR
        ocr_out = OCREngine.run_ocr(str(dest_path))
        all_ocr_texts.append(ocr_out["raw_text"])

        # Save ProductImage
        prod_img = ProductImage(
            product_id=product.id,
            package_side=side,
            file_path=f"/api/v1/images/file/{unique_name}",
            file_name=f.filename,
            file_size=file_size,
            width=quality["width"],
            height=quality["height"],
            blur_score=quality["blur_score"],
            quality_status=quality["quality_status"],
            processed_path=f"/api/v1/images/file/{unique_name}"
        )
        db.add(prod_img)
        db.commit()
        db.refresh(prod_img)

        # Save OCR Result
        ocr_record = OCRResult(
            product_image_id=prod_img.id,
            raw_text=ocr_out["raw_text"],
            boxes_json=ocr_out["boxes"],
            mean_confidence=ocr_out["mean_confidence"],
            engine_name=ocr_out["engine"]
        )
        db.add(ocr_record)

        # Readability metric
        r_eval = ReadabilityAnalyzer.calculate_readability_score(
            blur_score=quality["blur_score"] or 50.0,
            contrast=quality["contrast"] or 45.0,
            ocr_confidence=ocr_out["mean_confidence"],
            detected_text_length=len(ocr_out["raw_text"])
        )
        readability_scores.append(r_eval["readability_score"])

        # Parse declarations on this side
        side_decls = DeclarationParser.parse_boxes(ocr_out["boxes"], image_id=prod_img.id)
        for d in side_decls:
            ext_record = ExtractedDeclaration(
                product_id=product.id,
                declaration_type=d["declaration_type"],
                raw_text=d["raw_text"],
                normalized_value=d["normalized_value"],
                confidence=d["confidence"],
                source_image_id=prod_img.id,
                bounding_box=d["bounding_box"],
                extraction_method="WINOCR_HYBRID_REGEX"
            )
            db.add(ext_record)
            all_declarations.append(d)

        total_conf += ocr_out["mean_confidence"]
        ocr_count += 1
        db.commit()

    # 3. Auto-detect Product Name, Brand, Category from complete package text
    full_combined_text = "\n".join(all_ocr_texts)
    detected_meta = DeclarationParser.detect_commodity_and_brand(full_combined_text)

    if product_name and product_name.strip():
        product.product_name = product_name.strip()
    else:
        product.product_name = detected_meta["product_name"]
    product.brand = detected_meta["brand"]
    product.category = detected_meta["category"]

    # 4. Multi-side synthesis
    merged_profile = MultiSideMerger.merge_declarations(all_declarations)
    product.structured_data = merged_profile
    product.overall_confidence = round(total_conf / ocr_count, 3) if ocr_count > 0 else 0.85

    avg_readability = round(sum(readability_scores) / len(readability_scores), 1) if readability_scores else 75.0
    product.readability_score = avg_readability
    product.readability_grade = "HIGH" if avg_readability >= 75.0 else ("MEDIUM" if avg_readability >= 50.0 else "LOW")
    db.commit()

    # 5. Run Compliance Rule Engine
    new_findings = ComplianceEngine.evaluate_product(product, target_insp.scheduled_date, db)
    for nf in new_findings:
        db.add(nf)

    db.commit()
    db.refresh(product)

    serialized_findings = [
        {
            "id": nf.id,
            "requirement": nf.requirement,
            "category": nf.category.value,
            "severity": nf.severity.value,
            "status": nf.status.value,
            "reason": nf.reason,
            "evidence_data": nf.evidence_data,
            "ai_confidence": nf.ai_confidence,
            "gazette_page_number": (nf.evidence_data or {}).get("gazette_page_number") if isinstance(nf.evidence_data, dict) else None,
            "gazette_citation": (nf.evidence_data or {}).get("gazette_citation") if isinstance(nf.evidence_data, dict) else None,
            "statutory_text": (nf.evidence_data or {}).get("statutory_text") if isinstance(nf.evidence_data, dict) else None,
            "penalty_section": (nf.evidence_data or {}).get("penalty_section") if isinstance(nf.evidence_data, dict) else None,
        }
        for nf in new_findings
    ]

    compliant_rules = (product.structured_data or {}).get("compliant_rules", []) if isinstance(product.structured_data, dict) else []

    return {
        "inspection_id": target_insp.id,
        "product_id": product.id,
        "product_name": product.product_name,
        "brand": product.brand,
        "category": product.category,
        "compliance_status": product.compliance_status.value,
        "findings_count": len(new_findings),
        "compliant_count": len(compliant_rules),
        "readability_score": product.readability_score,
        "readability_grade": product.readability_grade,
        "structured_data": product.structured_data,
        "compliant_rules": compliant_rules,
        "findings": serialized_findings
    }

