import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class RuleSeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    MAJOR = "MAJOR"
    MINOR = "MINOR"
    ADVISORY = "ADVISORY"

class FindingCategory(str, enum.Enum):
    MISSING_DECLARATION = "MISSING_DECLARATION"
    INVALID_FORMAT = "INVALID_FORMAT"
    INVALID_UNIT = "INVALID_UNIT"
    MRP_ISSUE = "MRP_ISSUE"
    CONFLICTING_INFORMATION = "CONFLICTING_INFORMATION"
    LOW_READABILITY = "LOW_READABILITY"
    POSSIBLE_FONT_SIZE_VIOLATION = "POSSIBLE_FONT_SIZE_VIOLATION"
    POSSIBLE_PLACEMENT_ISSUE = "POSSIBLE_PLACEMENT_ISSUE"
    UNABLE_TO_DETERMINE = "UNABLE_TO_DETERMINE"
    MANUAL_REVIEW_REQUIRED = "MANUAL_REVIEW_REQUIRED"
    COMPLIANT_DECLARATION = "COMPLIANT_DECLARATION"

class FindingStatus(str, enum.Enum):
    FLAGGED_BY_AI = "FLAGGED_BY_AI"
    CONFIRMED_BY_OFFICER = "CONFIRMED_BY_OFFICER"
    REJECTED_BY_OFFICER = "REJECTED_BY_OFFICER"
    WAIVED = "WAIVED"

class OfficerDecisionType(str, enum.Enum):
    CONFIRMED_VIOLATION = "CONFIRMED_VIOLATION"
    REJECTED_FALSE_POSITIVE = "REJECTED_FALSE_POSITIVE"
    WAIVED = "WAIVED"
    MANUAL_OVERRIDE = "MANUAL_OVERRIDE"

class DocumentType(str, enum.Enum):
    BASE_RULE = "BASE_RULE"
    AMENDMENT = "AMENDMENT"
    NOTIFICATION = "NOTIFICATION"
    GUIDELINE = "GUIDELINE"
    GAZETTE = "GAZETTE"

class RuleChangeType(str, enum.Enum):
    INSERT = "INSERT"
    REPLACE = "REPLACE"
    DELETE = "DELETE"
    MODIFY = "MODIFY"

class LegalDocument(Base):
    __tablename__ = "legal_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    document_type = Column(Enum(DocumentType), default=DocumentType.BASE_RULE, nullable=False)
    notification_number = Column(String(100), nullable=True) # e.g. GSR 779(E)
    publication_date = Column(DateTime, nullable=True)
    effective_date = Column(DateTime, nullable=False)
    source_url = Column(String(500), nullable=True)
    file_path = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    amendments = relationship("Amendment", back_populates="document")

class ComplianceRule(Base):
    __tablename__ = "compliance_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. "LM-PC-R06-QTY"
    rule_number = Column(String(50), nullable=False) # e.g. "Rule 6(1)(c)"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    requirement_type = Column(String(100), nullable=False) # NET_QUANTITY, MRP, MANUFACTURER, DATE, etc.
    is_mandatory = Column(Boolean, default=True)
    severity = Column(Enum(RuleSeverity), default=RuleSeverity.CRITICAL)
    validation_type = Column(String(100), nullable=False) # unit_validation, mrp_validation, presence_check, date_validation
    placement_requirement = Column(String(255), nullable=True) # "Principal Display Panel"
    font_requirement = Column(String(255), nullable=True) # "First Schedule Height Specs"
    source_reference = Column(String(255), nullable=False) # "Legal Metrology (Packaged Commodities) Rules, 2011"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    versions = relationship("RuleVersion", back_populates="rule", cascade="all, delete-orphan")
    findings = relationship("ComplianceFinding", back_populates="rule")

class RuleVersion(Base):
    __tablename__ = "rule_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("compliance_rules.id"), nullable=False)
    version_label = Column(String(50), nullable=False) # e.g. "2011-Original", "2021-Amendment"
    effective_from = Column(DateTime, nullable=False)
    effective_to = Column(DateTime, nullable=True) # NULL means currently active
    rule_content = Column(Text, nullable=False)
    # Validation config JSON contains thresholds, regex lists, allowed units, etc.
    validation_configuration = Column(JSON, nullable=False)
    legal_document_id = Column(Integer, ForeignKey("legal_documents.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    rule = relationship("ComplianceRule", back_populates="versions")

class Amendment(Base):
    __tablename__ = "amendments"
    
    id = Column(Integer, primary_key=True, index=True)
    legal_document_id = Column(Integer, ForeignKey("legal_documents.id"), nullable=False)
    title = Column(String(255), nullable=False)
    year = Column(Integer, nullable=False)
    notification_reference = Column(String(100), nullable=False)
    publication_date = Column(DateTime, nullable=False)
    effective_date = Column(DateTime, nullable=False)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("LegalDocument", back_populates="amendments")
    rule_changes = relationship("RuleChange", back_populates="amendment")

class RuleChange(Base):
    __tablename__ = "rule_changes"
    
    id = Column(Integer, primary_key=True, index=True)
    amendment_id = Column(Integer, ForeignKey("amendments.id"), nullable=False)
    affected_rule_code = Column(String(50), nullable=False)
    change_type = Column(Enum(RuleChangeType), nullable=False)
    old_content = Column(Text, nullable=True)
    new_content = Column(Text, nullable=False)
    effective_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    amendment = relationship("Amendment", back_populates="rule_changes")

class ComplianceFinding(Base):
    __tablename__ = "compliance_findings"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    rule_id = Column(Integer, ForeignKey("compliance_rules.id"), nullable=True)
    requirement = Column(String(255), nullable=False)
    category = Column(Enum(FindingCategory), nullable=False)
    status = Column(Enum(FindingStatus), default=FindingStatus.FLAGGED_BY_AI, nullable=False)
    severity = Column(Enum(RuleSeverity), default=RuleSeverity.CRITICAL, nullable=False)
    reason = Column(Text, nullable=False)
    evidence_data = Column(JSON, nullable=True) # Extracted values, raw text, detected issues
    source_image_id = Column(Integer, ForeignKey("product_images.id"), nullable=True)
    bounding_box = Column(JSON, nullable=True) # [ymin, xmin, ymax, xmax] for visual highlight
    ai_confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="findings")
    rule = relationship("ComplianceRule", back_populates="findings")
    officer_decisions = relationship("OfficerDecision", back_populates="finding", cascade="all, delete-orphan")

class OfficerDecision(Base):
    __tablename__ = "officer_decisions"
    
    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(Integer, ForeignKey("compliance_findings.id"), nullable=False)
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decision = Column(Enum(OfficerDecisionType), nullable=False)
    officer_remarks = Column(Text, nullable=False)
    evidence_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    finding = relationship("ComplianceFinding", back_populates="officer_decisions")
    officer = relationship("User")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    report_number = Column(String(100), unique=True, index=True, nullable=False) # e.g. "REP-LM-2026-0001"
    report_format = Column(String(10), default="PDF") # PDF, DOCX
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    summary = Column(JSON, nullable=True)
    qr_hash = Column(String(100), nullable=True) # For tamper evidence
    created_at = Column(DateTime, default=datetime.utcnow)
    
    inspection = relationship("Inspection", back_populates="reports")
    generator = relationship("User")
