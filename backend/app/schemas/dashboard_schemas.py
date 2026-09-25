from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ViolationCount(BaseModel):
    category: str
    count: int
    severity: str

class RepeatOffender(BaseModel):
    brand_or_manufacturer: str
    violation_count: int
    recent_inspection_id: int
    common_violations: List[str]

class DashboardSummary(BaseModel):
    total_inspections: int
    total_products_scanned: int
    compliant_count: int
    potential_violations_count: int
    confirmed_violations_count: int
    pending_review_count: int
    compliance_rate: float
    violations_by_category: List[ViolationCount]
    repeat_offenders: List[RepeatOffender]
    recent_inspections: List[Dict[str, Any]]
