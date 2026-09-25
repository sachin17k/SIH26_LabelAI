from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from app.models.rule_models import (
    RuleSeverity, FindingCategory, FindingStatus, OfficerDecisionType,
    DocumentType, RuleChangeType
)

class OfficerDecisionCreate(BaseModel):
    finding_id: int
    decision: OfficerDecisionType
    officer_remarks: str
    evidence_notes: Optional[str] = None

class OfficerDecisionOut(BaseModel):
    id: int
    finding_id: int
    officer_id: int
    decision: OfficerDecisionType
    officer_remarks: str
    evidence_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field, model_validator

class ComplianceFindingOut(BaseModel):
    id: int
    product_id: int
    rule_id: Optional[int] = None
    requirement: str
    category: FindingCategory
    status: FindingStatus
    severity: RuleSeverity
    reason: str
    evidence_data: Optional[dict] = None
    source_image_id: Optional[int] = None
    bounding_box: Optional[Any] = None
    ai_confidence: float
    created_at: datetime
    officer_decisions: List[OfficerDecisionOut] = []
    gazette_page_number: Optional[int] = None
    gazette_citation: Optional[str] = None
    statutory_text: Optional[str] = None
    penalty_section: Optional[str] = None

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def extract_gazette_meta(cls, data: Any):
        if hasattr(data, "evidence_data") and isinstance(data.evidence_data, dict):
            ev = data.evidence_data
            if not getattr(data, "gazette_page_number", None):
                object.__setattr__(data, "gazette_page_number", ev.get("gazette_page_number"))
            if not getattr(data, "gazette_citation", None):
                object.__setattr__(data, "gazette_citation", ev.get("gazette_citation"))
            if not getattr(data, "statutory_text", None):
                object.__setattr__(data, "statutory_text", ev.get("statutory_text"))
            if not getattr(data, "penalty_section", None):
                object.__setattr__(data, "penalty_section", ev.get("penalty_section"))
        elif isinstance(data, dict):
            ev = data.get("evidence_data") or {}
            if "gazette_page_number" not in data or data["gazette_page_number"] is None:
                data["gazette_page_number"] = ev.get("gazette_page_number")
            if "gazette_citation" not in data or data["gazette_citation"] is None:
                data["gazette_citation"] = ev.get("gazette_citation")
            if "statutory_text" not in data or data["statutory_text"] is None:
                data["statutory_text"] = ev.get("statutory_text")
            if "penalty_section" not in data or data["penalty_section"] is None:
                data["penalty_section"] = ev.get("penalty_section")
        return data

class ComplianceRuleCreate(BaseModel):
    rule_code: str
    rule_number: str
    title: str
    description: str
    requirement_type: str
    is_mandatory: bool = True
    severity: RuleSeverity = RuleSeverity.CRITICAL
    validation_type: str
    placement_requirement: Optional[str] = None
    font_requirement: Optional[str] = None
    source_reference: str = "Legal Metrology (Packaged Commodities) Rules, 2011"
    initial_version_label: str = "2011-Original"
    validation_configuration: dict = {}

class RuleVersionOut(BaseModel):
    id: int
    rule_id: int
    version_label: str
    effective_from: datetime
    effective_to: Optional[datetime] = None
    rule_content: str
    validation_configuration: dict
    created_at: datetime

    class Config:
        from_attributes = True

class ComplianceRuleOut(BaseModel):
    id: int
    rule_code: str
    rule_number: str
    title: str
    description: str
    requirement_type: str
    is_mandatory: bool
    severity: RuleSeverity
    validation_type: str
    placement_requirement: Optional[str] = None
    font_requirement: Optional[str] = None
    source_reference: str
    is_active: bool
    versions: List[RuleVersionOut] = []
    created_at: datetime

    class Config:
        from_attributes = True

class LegalDocumentCreate(BaseModel):
    title: str
    document_type: DocumentType = DocumentType.BASE_RULE
    notification_number: Optional[str] = None
    publication_date: Optional[datetime] = None
    effective_date: datetime
    description: Optional[str] = None

class LegalDocumentOut(BaseModel):
    id: int
    title: str
    document_type: DocumentType
    notification_number: Optional[str] = None
    publication_date: Optional[datetime] = None
    effective_date: datetime
    file_path: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ReportGenerateRequest(BaseModel):
    inspection_id: int
    report_format: str = "PDF" # PDF or DOCX

class ReportOut(BaseModel):
    id: int
    inspection_id: int
    report_number: str
    report_format: str
    file_path: str
    file_name: str
    generated_by: int
    summary: Optional[dict] = None
    qr_hash: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
