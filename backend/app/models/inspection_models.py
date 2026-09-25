import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class InspectionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    ANALYSIS_COMPLETE = "ANALYSIS_COMPLETE"
    UNDER_REVIEW = "UNDER_REVIEW"
    FINALIZED = "FINALIZED"
    CLOSED = "CLOSED"

class ComplianceStatus(str, enum.Enum):
    COMPLIANT = "COMPLIANT"
    POTENTIAL_NON_COMPLIANCE = "POTENTIAL_NON_COMPLIANCE"
    OFFICER_REVIEW_REQUIRED = "OFFICER_REVIEW_REQUIRED"
    CONFIRMED_NON_COMPLIANCE = "CONFIRMED_NON_COMPLIANCE"

class PackageSide(str, enum.Enum):
    FRONT = "FRONT"
    BACK = "BACK"
    LEFT = "LEFT"
    RIGHT = "RIGHT"
    TOP = "TOP"
    BOTTOM = "BOTTOM"
    LABEL_CLOSEUP = "LABEL_CLOSEUP"
    MRP_AREA = "MRP_AREA"
    CALIBRATION_CARD = "CALIBRATION_CARD"
    ADDITIONAL_EVIDENCE = "ADDITIONAL_EVIDENCE"

class AnalysisJobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Establishment(Base):
    __tablename__ = "establishments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    license_number = Column(String(100), index=True, nullable=True)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=True)
    establishment_type = Column(String(100), default="Retail Store") # Retail, Supermarket, Warehouse, E-Commerce Hub
    contact_person = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    inspections = relationship("Inspection", back_populates="establishment")

class Inspection(Base):
    __tablename__ = "inspections"
    
    id = Column(Integer, primary_key=True, index=True)
    inspection_number = Column(String(100), unique=True, index=True, nullable=False) # e.g. "INS-2026-0904-001"
    establishment_id = Column(Integer, ForeignKey("establishments.id"), nullable=False)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(InspectionStatus), default=InspectionStatus.DRAFT, nullable=False)
    scheduled_date = Column(DateTime, default=datetime.utcnow)
    finalized_date = Column(DateTime, nullable=True)
    officer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    establishment = relationship("Establishment", back_populates="inspections")
    inspector = relationship("User", foreign_keys=[inspector_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
    products = relationship("Product", back_populates="inspection", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="inspection")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    product_name = Column(String(255), nullable=False)
    category = Column(String(100), default="Food & Beverages") # Food & Beverages, Cosmetics, Electronics, Household
    brand = Column(String(100), nullable=True)
    barcode = Column(String(100), nullable=True)
    
    # Declarations synthesized across package images
    structured_data = Column(JSON, nullable=True) # Merged declarations JSON
    compliance_status = Column(Enum(ComplianceStatus), default=ComplianceStatus.OFFICER_REVIEW_REQUIRED, nullable=False)
    overall_confidence = Column(Float, default=0.0)
    readability_score = Column(Float, default=0.0) # 0 to 100
    readability_grade = Column(String(20), default="MEDIUM") # HIGH, MEDIUM, LOW
    font_size_status = Column(String(50), default="UNABLE_TO_ACCURATELY_DETERMINE") # PASS, POSSIBLE_ISSUE, UNABLE_TO_ACCURATELY_DETERMINE
    
    # Calibration details
    package_height_mm = Column(Float, nullable=True)
    package_width_mm = Column(Float, nullable=True)
    calibration_factor = Column(Float, nullable=True) # px per mm
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    inspection = relationship("Inspection", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    findings = relationship("ComplianceFinding", back_populates="product", cascade="all, delete-orphan")
    analysis_jobs = relationship("AnalysisJob", back_populates="product", cascade="all, delete-orphan")

class ProductImage(Base):
    __tablename__ = "product_images"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    package_side = Column(Enum(PackageSide), default=PackageSide.FRONT, nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    blur_score = Column(Float, nullable=True) # Laplacian variance
    quality_status = Column(String(50), default="ACCEPTABLE") # ACCEPTABLE, BLURRY, POOR_CONTRAST
    processed_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="images")
    ocr_results = relationship("OCRResult", back_populates="image", cascade="all, delete-orphan")

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    status = Column(Enum(AnalysisJobStatus), default=AnalysisJobStatus.QUEUED, nullable=False)
    progress_pct = Column(Integer, default=0)
    current_step = Column(String(255), default="Initialized")
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    product = relationship("Product", back_populates="analysis_jobs")
