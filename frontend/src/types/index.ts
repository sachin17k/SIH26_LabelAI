export type UserRole = 'ADMIN' | 'INSPECTOR' | 'SUPERVISOR';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  badge_number?: string;
  jurisdiction?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export type InspectionStatus = 
  | 'DRAFT' 
  | 'IN_PROGRESS' 
  | 'ANALYSIS_COMPLETE' 
  | 'UNDER_REVIEW' 
  | 'FINALIZED' 
  | 'CLOSED';

export type ComplianceStatus = 
  | 'COMPLIANT' 
  | 'POTENTIAL_NON_COMPLIANCE' 
  | 'OFFICER_REVIEW_REQUIRED' 
  | 'CONFIRMED_NON_COMPLIANCE';

export type AnalysisJobStatus = 
  | 'QUEUED' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED';

export type PackageSide = 
  | 'FRONT' 
  | 'BACK' 
  | 'LEFT' 
  | 'RIGHT' 
  | 'TOP' 
  | 'BOTTOM' 
  | 'LABEL_CLOSEUP' 
  | 'MRP_AREA' 
  | 'CALIBRATION_CARD' 
  | 'ADDITIONAL_EVIDENCE';

export interface Establishment {
  id: number;
  name: string;
  license_number?: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  establishment_type: string;
  contact_person?: string;
  contact_phone?: string;
}

export interface ProductImage {
  id: number;
  product_id: number;
  package_side: PackageSide;
  file_path: string;
  file_name: string;
  width?: number;
  height?: number;
  blur_score?: number;
  quality_status: string;
  processed_path?: string;
}

export interface CompliantRule {
  rule_number: string;
  rule_code: string;
  requirement: string;
  status: 'COMPLIANT' | string;
  gazette_page_number?: number;
  verified_value?: string;
  details?: string;
}

export interface Product {
  id: number;
  inspection_id: number;
  product_name: string;
  category: string;
  brand?: string;
  barcode?: string;
  structured_data?: any;
  compliance_status: ComplianceStatus;
  overall_confidence: number;
  readability_score: number;
  readability_grade: string;
  font_size_status: string;
  package_height_mm?: number;
  package_width_mm?: number;
  calibration_factor?: number;
  images: ProductImage[];
  findings?: ComplianceFinding[];
  compliant_rules?: CompliantRule[];
  created_at?: string;
}

export interface Inspection {
  id: number;
  inspection_number: string;
  establishment_id: number;
  inspector_id: number;
  supervisor_id?: number;
  status: InspectionStatus;
  scheduled_date: string;
  finalized_date?: string;
  officer_notes?: string;
  establishment?: Establishment;
  products: Product[];
  created_at: string;
}

export type FindingSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'ADVISORY';

export type FindingCategory = 
  | 'MISSING_DECLARATION'
  | 'INVALID_FORMAT'
  | 'INVALID_UNIT'
  | 'MRP_ISSUE'
  | 'CONFLICTING_INFORMATION'
  | 'LOW_READABILITY'
  | 'POSSIBLE_FONT_SIZE_VIOLATION'
  | 'POSSIBLE_PLACEMENT_ISSUE'
  | 'UNABLE_TO_DETERMINE'
  | 'MANUAL_REVIEW_REQUIRED';

export type FindingStatus = 
  | 'FLAGGED_BY_AI'
  | 'CONFIRMED_BY_OFFICER'
  | 'REJECTED_BY_OFFICER'
  | 'WAIVED';

export type OfficerDecisionType = 
  | 'CONFIRMED_VIOLATION'
  | 'REJECTED_FALSE_POSITIVE'
  | 'WAIVED'
  | 'MANUAL_OVERRIDE';

export interface OfficerDecision {
  id: number;
  finding_id: number;
  officer_id: number;
  decision: OfficerDecisionType;
  officer_remarks: string;
  evidence_notes?: string;
  created_at: string;
}

export interface ComplianceFinding {
  id: number;
  product_id: number;
  rule_id?: number;
  requirement: string;
  category: FindingCategory;
  status: FindingStatus;
  severity: FindingSeverity;
  reason: string;
  evidence_data?: any;
  source_image_id?: number;
  bounding_box?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] %
  ai_confidence: number;
  created_at: string;
  officer_decisions: OfficerDecision[];
  gazette_page_number?: number;
  gazette_citation?: string;
  statutory_text?: string;
  penalty_section?: string;
}

export interface ComplianceRule {
  id: number;
  rule_code: string;
  rule_number: string;
  title: string;
  description: string;
  requirement_type: string;
  is_mandatory: boolean;
  severity: FindingSeverity;
  validation_type: string;
  source_reference: string;
  is_active: boolean;
  versions: {
    id: number;
    version_label: string;
    effective_from: string;
    rule_content: string;
    validation_configuration: any;
  }[];
}

export interface LegalDocument {
  id: number;
  title: string;
  document_type: string;
  notification_number?: string;
  publication_date?: string;
  effective_date: string;
  description?: string;
}

export interface DashboardSummary {
  total_inspections: number;
  total_products_scanned: number;
  compliant_count: number;
  potential_violations_count: number;
  confirmed_violations_count: number;
  pending_review_count: number;
  compliance_rate: number;
  violations_by_category: { category: string; severity: string; count: number }[];
  repeat_offenders: {
    brand_or_manufacturer: string;
    violation_count: number;
    recent_inspection_id: number;
    common_violations: string[];
  }[];
  recent_inspections: {
    id: number;
    inspection_number: string;
    establishment_name: string;
    city: string;
    status: string;
    date: string;
    products_count: number;
  }[];
}
