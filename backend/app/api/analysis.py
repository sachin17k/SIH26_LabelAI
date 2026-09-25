import asyncio
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db, SessionLocal
from app.models.auth_models import User
from app.models.inspection_models import (
    Product, ProductImage, AnalysisJob, AnalysisJobStatus, ComplianceStatus
)
from app.models.ai_models import OCRResult, ExtractedDeclaration
from app.schemas.inspection_schemas import AnalysisJobOut
from app.services.vision.ocr_engine import OCREngine
from app.services.vision.readability import ReadabilityAnalyzer
from app.services.extractor.declaration_parser import DeclarationParser
from app.services.extractor.multi_side_merger import MultiSideMerger
from app.services.compliance.engine import ComplianceEngine
from app.api.auth import get_current_user

router = APIRouter(prefix="/analysis", tags=["AI Vision & Compliance Pipeline"])

def execute_pipeline(product_id: int, job_id: int):
    """
    Background worker executing OCR, multi-side parsing, and compliance checking.
    """
    db = SessionLocal()
    try:
        job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
        product = db.query(Product).filter(Product.id == product_id).first()
        if not job or not product:
            return

        job.status = AnalysisJobStatus.PROCESSING
        job.progress_pct = 15
        job.current_step = "Running image quality & OCR on package sides..."
        db.commit()

        images = db.query(ProductImage).filter(ProductImage.product_id == product_id).all()
        if not images:
            job.status = AnalysisJobStatus.FAILED
            job.error_message = "No package images uploaded for analysis."
            db.commit()
            return

        all_declarations = []
        total_conf = 0.0
        ocr_count = 0
        readability_scores = []

        # Step 1: Run OCR on each package side
        for idx, img in enumerate(images):
            # Resolve actual file path on disk
            fname = img.file_path.split("/")[-1]
            local_path = settings.UPLOAD_DIR / fname
            
            ocr_out = OCREngine.run_ocr(str(local_path))
            
            # Save OCRResult record
            ocr_record = OCRResult(
                product_image_id=img.id,
                raw_text=ocr_out["raw_text"],
                boxes_json=ocr_out["boxes"],
                mean_confidence=ocr_out["mean_confidence"],
                engine_name=ocr_out["engine"]
            )
            db.add(ocr_record)
            db.commit()

            # Readability evaluation for this image
            r_eval = ReadabilityAnalyzer.calculate_readability_score(
                blur_score=img.blur_score or 50.0,
                contrast=45.0,
                ocr_confidence=ocr_out["mean_confidence"],
                detected_text_length=len(ocr_out["raw_text"])
            )
            readability_scores.append(r_eval["readability_score"])

            # Step 2: Parse declarations for this side
            side_decls = DeclarationParser.parse_boxes(ocr_out["boxes"], image_id=img.id)
            for d in side_decls:
                ext_record = ExtractedDeclaration(
                    product_id=product.id,
                    declaration_type=d["declaration_type"],
                    raw_text=d["raw_text"],
                    normalized_value=d["normalized_value"],
                    confidence=d["confidence"],
                    source_image_id=img.id,
                    bounding_box=d["bounding_box"],
                    extraction_method="HYBRID_REGEX_PATTERN"
                )
                db.add(ext_record)
                all_declarations.append(d)

            total_conf += ocr_out["mean_confidence"]
            ocr_count += 1
            job.progress_pct = int(20 + (idx + 1) / len(images) * 40)
            db.commit()

        job.progress_pct = 70
        job.current_step = "Merging multi-side declarations and detecting conflicts..."
        db.commit()

        # Step 3: Multi-side synthesis
        merged_profile = MultiSideMerger.merge_declarations(all_declarations)
        product.structured_data = merged_profile
        product.overall_confidence = round(total_conf / ocr_count, 3) if ocr_count > 0 else 0.0

        # Readability aggregate
        avg_readability = round(sum(readability_scores) / len(readability_scores), 1) if readability_scores else 70.0
        product.readability_score = avg_readability
        if avg_readability >= 75.0:
            product.readability_grade = "HIGH"
        elif avg_readability >= 50.0:
            product.readability_grade = "MEDIUM"
        else:
            product.readability_grade = "LOW"

        # Level 2 Font Size evaluation if calibrated
        net_qty = merged_profile.get("net_quantity")
        if product.calibration_factor and net_qty:
            font_eval = ReadabilityAnalyzer.evaluate_physical_font_size(
                net_quantity_val=net_qty.get("value"),
                net_quantity_unit=net_qty.get("unit"),
                char_box_height_px=30.0, # Average numeral px height
                pixels_per_mm=product.calibration_factor
            )
            product.font_size_status = font_eval["status"]

        db.commit()

        # Step 4: Run Compliance Engine
        job.progress_pct = 85
        job.current_step = "Executing versioned compliance rule engine..."
        db.commit()

        # Clear any prior unreviewed findings for re-analysis
        db.query(ComplianceFinding).filter(
            ComplianceFinding.product_id == product.id,
            ComplianceFinding.status == "FLAGGED_BY_AI"
        ).delete()

        inspection_date = product.inspection.scheduled_date if product.inspection else datetime.utcnow()
        new_findings = ComplianceEngine.evaluate_product(product, inspection_date, db)
        for nf in new_findings:
            db.add(nf)

        job.progress_pct = 100
        job.status = AnalysisJobStatus.COMPLETED
        job.current_step = "Analysis Complete"
        job.completed_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        db.rollback()
        job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
        if job:
            job.status = AnalysisJobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()

@router.post("/trigger/{product_id}", response_model=AnalysisJobOut)
def trigger_analysis(
    product_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    job = AnalysisJob(
        product_id=product_id,
        status=AnalysisJobStatus.QUEUED,
        progress_pct=5,
        current_step="Analysis queued"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Launch in background worker to not block HTTP request
    background_tasks.add_task(execute_pipeline, product_id, job.id)
    return job

@router.get("/status/{product_id}", response_model=AnalysisJobOut)
def get_analysis_status(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(AnalysisJob).filter(
        AnalysisJob.product_id == product_id
    ).order_by(AnalysisJob.started_at.desc()).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="No analysis job found for this product")
    return job
