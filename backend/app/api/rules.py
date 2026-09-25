from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.auth_models import User, UserRole, AuditLog
from app.models.rule_models import ComplianceRule, RuleVersion
from app.schemas.compliance_schemas import (
    ComplianceRuleCreate, ComplianceRuleOut, RuleVersionOut
)
from app.api.auth import get_current_user, require_role

router = APIRouter(prefix="/rules", tags=["Compliance Rules & Versioning"])

@router.get("", response_model=List[ComplianceRuleOut])
def list_rules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ComplianceRule).order_by(ComplianceRule.rule_code.asc()).all()

@router.post("", response_model=ComplianceRuleOut)
def create_rule(
    rule_in: ComplianceRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    existing = db.query(ComplianceRule).filter(ComplianceRule.rule_code == rule_in.rule_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Rule code already exists")

    new_rule = ComplianceRule(
        rule_code=rule_in.rule_code,
        rule_number=rule_in.rule_number,
        title=rule_in.title,
        description=rule_in.description,
        requirement_type=rule_in.requirement_type,
        is_mandatory=rule_in.is_mandatory,
        severity=rule_in.severity,
        validation_type=rule_in.validation_type,
        placement_requirement=rule_in.placement_requirement,
        font_requirement=rule_in.font_requirement,
        source_reference=rule_in.source_reference
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    version = RuleVersion(
        rule_id=new_rule.id,
        version_label=rule_in.initial_version_label,
        effective_from=datetime.utcnow(),
        rule_content=rule_in.description,
        validation_configuration=rule_in.validation_configuration
    )
    db.add(version)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="RULE_CREATED",
        target_entity="ComplianceRule",
        target_id=new_rule.rule_code,
        details={"title": new_rule.title}
    )
    db.add(audit)
    db.commit()
    db.refresh(new_rule)
    return new_rule

@router.get("/{rule_id}/versions", response_model=List[RuleVersionOut])
def list_rule_versions(rule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(RuleVersion).filter(RuleVersion.rule_id == rule_id).order_by(RuleVersion.effective_from.desc()).all()

@router.get("/gazette-index")
def get_gazette_index(current_user: User = Depends(get_current_user)):
    from app.services.legal.pdf_ingestor import LegalMetrologyPDFIngestor
    return {
        "total_pages": LegalMetrologyPDFIngestor.get_total_pages(),
        "rules": LegalMetrologyPDFIngestor.STATUTORY_INDEX
    }

@router.get("/lookup")
def lookup_legal_rules(q: str, current_user: User = Depends(get_current_user)):
    from app.services.legal.pdf_ingestor import LegalMetrologyPDFIngestor
    results = LegalMetrologyPDFIngestor.search_rules(q)
    return {"query": q, "results": results}

@router.get("/gazette-page/{page_number}")
def get_gazette_page_image(page_number: int):
    from fastapi.responses import Response
    from app.services.legal.pdf_ingestor import LegalMetrologyPDFIngestor
    img_bytes = LegalMetrologyPDFIngestor.render_page_image(page_number)
    if not img_bytes:
        raise HTTPException(status_code=404, detail=f"Page {page_number} not found or could not be rendered")
    return Response(content=img_bytes, media_type="image/png")

@router.get("/gazette-pdf")
def download_gazette_pdf():
    import os
    from fastapi.responses import FileResponse
    from app.services.legal.pdf_ingestor import LegalMetrologyPDFIngestor
    if not os.path.exists(LegalMetrologyPDFIngestor.PDF_PATH):
        raise HTTPException(status_code=404, detail="Gazette PDF file not found")
    return FileResponse(
        LegalMetrologyPDFIngestor.PDF_PATH,
        media_type="application/pdf",
        filename="legal_metrology_rules_consolidated.pdf"
    )

