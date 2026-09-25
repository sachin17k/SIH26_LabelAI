from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.auth_models import User, AuditLog
from app.models.inspection_models import Product, ComplianceStatus
from app.models.rule_models import (
    ComplianceFinding, OfficerDecision, FindingStatus,
    OfficerDecisionType, RuleSeverity
)
from app.schemas.compliance_schemas import (
    ComplianceFindingOut, OfficerDecisionCreate, OfficerDecisionOut
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/compliance", tags=["Compliance & Officer Review"])

@router.get("/findings/{product_id}", response_model=List[ComplianceFindingOut])
def get_product_findings(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    findings = db.query(ComplianceFinding).filter(
        ComplianceFinding.product_id == product_id
    ).all()
    return findings

@router.post("/review/{finding_id}", response_model=OfficerDecisionOut)
def submit_officer_decision(
    finding_id: int,
    review_in: OfficerDecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    finding = db.query(ComplianceFinding).filter(ComplianceFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Compliance finding not found")

    decision = OfficerDecision(
        finding_id=finding_id,
        officer_id=current_user.id,
        decision=review_in.decision,
        officer_remarks=review_in.officer_remarks,
        evidence_notes=review_in.evidence_notes
    )
    db.add(decision)

    # Update Finding status based on officer review
    if review_in.decision == OfficerDecisionType.CONFIRMED_VIOLATION:
        finding.status = FindingStatus.CONFIRMED_BY_OFFICER
    elif review_in.decision == OfficerDecisionType.REJECTED_FALSE_POSITIVE:
        finding.status = FindingStatus.REJECTED_BY_OFFICER
    elif review_in.decision == OfficerDecisionType.WAIVED:
        finding.status = FindingStatus.WAIVED
    else:
        finding.status = FindingStatus.CONFIRMED_BY_OFFICER

    # Update Product compliance status
    product = db.query(Product).filter(Product.id == finding.product_id).first()
    if product:
        all_findings = db.query(ComplianceFinding).filter(ComplianceFinding.product_id == product.id).all()
        confirmed_count = sum(1 for f in all_findings if f.status == FindingStatus.CONFIRMED_BY_OFFICER)
        flagged_count = sum(1 for f in all_findings if f.status == FindingStatus.FLAGGED_BY_AI)
        
        if confirmed_count > 0:
            product.compliance_status = ComplianceStatus.CONFIRMED_NON_COMPLIANCE
        elif flagged_count > 0:
            product.compliance_status = ComplianceStatus.POTENTIAL_NON_COMPLIANCE
        else:
            product.compliance_status = ComplianceStatus.COMPLIANT

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="OFFICER_REVIEW_SUBMITTED",
        target_entity="ComplianceFinding",
        target_id=str(finding_id),
        details={
            "decision": str(review_in.decision),
            "remarks": review_in.officer_remarks
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(decision)
    return decision
