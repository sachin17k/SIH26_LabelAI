from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from app.models.inspection_models import InspectionStatus, ComplianceStatus, PackageSide, AnalysisJobStatus

class EstablishmentCreate(BaseModel):
    name: str
    license_number: Optional[str] = None
    address: str
    city: str
    state: str
    pincode: Optional[str] = None
    establishment_type: str = "Retail Store"
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None

class EstablishmentOut(EstablishmentCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    product_name: str
    category: str = "Food & Beverages"
    brand: Optional[str] = None
    barcode: Optional[str] = None
    package_height_mm: Optional[float] = None
    package_width_mm: Optional[float] = None

class ProductImageOut(BaseModel):
    id: int
    product_id: int
    package_side: PackageSide
    file_path: str
    file_name: str
    file_size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    blur_score: Optional[float] = None
    quality_status: str
    processed_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

from app.schemas.compliance_schemas import ComplianceFindingOut

class ProductOut(BaseModel):
    id: int
    inspection_id: int
    product_name: str
    category: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    structured_data: Optional[dict] = None
    compliance_status: ComplianceStatus
    overall_confidence: float
    readability_score: float
    readability_grade: str
    font_size_status: str
    package_height_mm: Optional[float] = None
    package_width_mm: Optional[float] = None
    calibration_factor: Optional[float] = None
    images: List[ProductImageOut] = []
    findings: List[ComplianceFindingOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InspectionCreate(BaseModel):
    establishment_id: Optional[int] = None
    establishment_data: Optional[EstablishmentCreate] = None
    scheduled_date: Optional[datetime] = None
    officer_notes: Optional[str] = None

class InspectionUpdate(BaseModel):
    status: Optional[InspectionStatus] = None
    officer_notes: Optional[str] = None
    supervisor_id: Optional[int] = None

class InspectionOut(BaseModel):
    id: int
    inspection_number: str
    establishment_id: int
    inspector_id: int
    supervisor_id: Optional[int] = None
    status: InspectionStatus
    scheduled_date: datetime
    finalized_date: Optional[datetime] = None
    officer_notes: Optional[str] = None
    establishment: Optional[EstablishmentOut] = None
    products: List[ProductOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AnalysisJobOut(BaseModel):
    id: int
    product_id: int
    status: AnalysisJobStatus
    progress_pct: int
    current_step: str
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
