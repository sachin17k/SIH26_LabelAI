import os
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.auth_models import User, AuditLog
from app.models.inspection_models import Inspection
from app.models.rule_models import Report
from app.schemas.compliance_schemas import ReportGenerateRequest, ReportOut
from app.services.reporting.pdf_generator import InspectionPDFReportGenerator
from app.services.reporting.docx_generator import InspectionDOCXReportGenerator
from app.api.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Inspection Reports"])

@router.post("/generate", response_model=ReportOut)
def generate_report(
    req: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insp = db.query(Inspection).filter(Inspection.id == req.inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")

    # Serialize inspection data for report generator
    inspection_dict = {
        "inspection_number": insp.inspection_number,
        "scheduled_date": insp.scheduled_date.strftime("%Y-%m-%d %H:%M") if insp.scheduled_date else "",
        "status": insp.status.value,
        "establishment": {
            "name": insp.establishment.name if insp.establishment else "N/A",
            "address": insp.establishment.address if insp.establishment else "N/A",
            "city": insp.establishment.city if insp.establishment else "",
            "pincode": insp.establishment.pincode if insp.establishment else "",
            "license_number": insp.establishment.license_number if insp.establishment else "N/A"
        },
        "inspector": {
            "full_name": insp.inspector.full_name if insp.inspector else current_user.full_name,
            "badge_number": insp.inspector.badge_number if insp.inspector else "LM-OFF",
            "jurisdiction": insp.inspector.jurisdiction if insp.inspector else "State Enforcement Division"
        },
        "products": []
    }

    for p in insp.products:
        prod_data = {
            "product_name": p.product_name,
            "category": p.category,
            "brand": p.brand or "N/A",
            "compliance_status": p.compliance_status.value,
            "readability_score": p.readability_score,
            "readability_grade": p.readability_grade,
            "findings": [],
            "compliant_rules": (p.structured_data or {}).get("compliant_rules", []) if isinstance(p.structured_data, dict) else []
        }
        for f in p.findings:
            f_data = {
                "requirement": f.requirement,
                "category": f.category.value,
                "severity": f.severity.value,
                "reason": f.reason,
                "officer_decisions": [
                    {
                        "decision": od.decision.value,
                        "officer_remarks": od.officer_remarks
                    } for od in f.officer_decisions
                ]
            }
            prod_data["findings"].append(f_data)
        inspection_dict["products"].append(prod_data)

    unique_suffix = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    report_num = f"REP-{insp.inspection_number}-{unique_suffix}"
    
    if req.report_format.upper() == "DOCX":
        fname = f"{report_num}.docx"
        fpath = InspectionDOCXReportGenerator.generate(inspection_dict, fname)
    else:
        fname = f"{report_num}.pdf"
        fpath = InspectionPDFReportGenerator.generate(inspection_dict, fname)

    report = Report(
        inspection_id=insp.id,
        report_number=report_num,
        report_format=req.report_format.upper(),
        file_path=fpath,
        file_name=fname,
        generated_by=current_user.id,
        summary={"product_count": len(insp.products)}
    )
    db.add(report)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="REPORT_GENERATED",
        target_entity="Report",
        target_id=report_num,
        details={"format": req.report_format.upper()}
    )
    db.add(audit)
    db.commit()
    db.refresh(report)
    return report

@router.get("/download/{report_id}")
def download_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
        
    media_type = "application/pdf" if report.report_format == "PDF" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(
        report.file_path,
        media_type=media_type,
        filename=report.file_name
    )

@router.get("/inspection/{inspection_id}", response_model=List[ReportOut])
def list_inspection_reports(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Report).filter(Report.inspection_id == inspection_id).all()
