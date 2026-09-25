from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.auth_models import User
from app.models.inspection_models import Inspection, Product, ComplianceStatus
from app.models.rule_models import ComplianceFinding, FindingStatus
from app.schemas.dashboard_schemas import DashboardSummary, ViolationCount, RepeatOffender
from app.api.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Enforcement Analytics & Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_inspections = db.query(Inspection).count()
    total_products = db.query(Product).count()
    
    compliant_count = db.query(Product).filter(Product.compliance_status == ComplianceStatus.COMPLIANT).count()
    potential_count = db.query(Product).filter(Product.compliance_status == ComplianceStatus.POTENTIAL_NON_COMPLIANCE).count()
    confirmed_count = db.query(Product).filter(Product.compliance_status == ComplianceStatus.CONFIRMED_NON_COMPLIANCE).count()
    pending_count = db.query(Product).filter(Product.compliance_status == ComplianceStatus.OFFICER_REVIEW_REQUIRED).count()

    compliance_rate = round((compliant_count / total_products * 100), 1) if total_products > 0 else 100.0

    # Violations by category
    cat_counts = db.query(
        ComplianceFinding.category,
        ComplianceFinding.severity,
        func.count(ComplianceFinding.id)
    ).group_by(ComplianceFinding.category, ComplianceFinding.severity).all()

    violations_by_category = [
        ViolationCount(category=c[0].value, severity=c[1].value, count=c[2])
        for c in cat_counts
    ]

    # Repeat offenders (brands with non-compliant products)
    repeat_query = db.query(
        Product.brand,
        func.count(Product.id)
    ).filter(
        Product.compliance_status.in_([ComplianceStatus.CONFIRMED_NON_COMPLIANCE, ComplianceStatus.POTENTIAL_NON_COMPLIANCE]),
        Product.brand.isnot(None)
    ).group_by(Product.brand).having(func.count(Product.id) >= 1).all()

    repeat_offenders = []
    for brand, count in repeat_query:
        prod = db.query(Product).filter(Product.brand == brand).order_by(Product.created_at.desc()).first()
        repeat_offenders.append(RepeatOffender(
            brand_or_manufacturer=brand,
            violation_count=count,
            recent_inspection_id=prod.inspection_id if prod else 1,
            common_violations=["Rule 13 SI Units", "Rule 6(11) Unit Sale Price"]
        ))

    # Recent inspections
    recent_insps = db.query(Inspection).order_by(Inspection.created_at.desc()).limit(5).all()
    recent_list = []
    for insp in recent_insps:
        recent_list.append({
            "id": insp.id,
            "inspection_number": insp.inspection_number,
            "establishment_name": insp.establishment.name if insp.establishment else "N/A",
            "city": insp.establishment.city if insp.establishment else "N/A",
            "status": insp.status.value,
            "date": insp.scheduled_date.strftime("%Y-%m-%d %H:%M") if insp.scheduled_date else "",
            "products_count": len(insp.products)
        })

    return DashboardSummary(
        total_inspections=total_inspections,
        total_products_scanned=total_products,
        compliant_count=compliant_count,
        potential_violations_count=potential_count,
        confirmed_violations_count=confirmed_count,
        pending_review_count=pending_count,
        compliance_rate=compliance_rate,
        violations_by_category=violations_by_category,
        repeat_offenders=repeat_offenders,
        recent_inspections=recent_list
    )
