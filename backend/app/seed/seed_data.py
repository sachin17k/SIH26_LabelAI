import os
from datetime import datetime, timedelta
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.core.config import settings
from app.models.auth_models import User, UserRole
from app.models.inspection_models import (
    Establishment, Inspection, Product, ProductImage,
    InspectionStatus, ComplianceStatus, PackageSide
)
from app.models.rule_models import (
    ComplianceRule, RuleVersion, LegalDocument, Amendment,
    RuleSeverity, DocumentType, ComplianceFinding, FindingCategory, FindingStatus
)

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Seed Users
    if not db.query(User).filter(User.email == "admin@labelguard.gov.in").first():
        admin = User(
            email="admin@labelguard.gov.in",
            hashed_password=get_password_hash("Admin@123"),
            full_name="Rajesh Verma (Chief Enforcement Admin)",
            role=UserRole.ADMIN,
            badge_number="LM-ADM-001",
            jurisdiction="Central Legal Metrology Division, New Delhi",
            is_active=True
        )
        db.add(admin)

    if not db.query(User).filter(User.email == "inspector@labelguard.gov.in").first():
        inspector = User(
            email="inspector@labelguard.gov.in",
            hashed_password=get_password_hash("Inspector@123"),
            full_name="Priya Sharma (Senior Metrology Inspector)",
            role=UserRole.INSPECTOR,
            badge_number="LM-INS-104",
            jurisdiction="Karnataka State - Bangalore Urban Division",
            is_active=True
        )
        db.add(inspector)

    if not db.query(User).filter(User.email == "supervisor@labelguard.gov.in").first():
        supervisor = User(
            email="supervisor@labelguard.gov.in",
            hashed_password=get_password_hash("Supervisor@123"),
            full_name="Anil K. Kulkarni (Joint Controller & Reviewer)",
            role=UserRole.SUPERVISOR,
            badge_number="LM-SUP-019",
            jurisdiction="Southern Enforcement Zone",
            is_active=True
        )
        db.add(supervisor)
    db.commit()

    # 2. Seed Legal Documents
    base_doc = db.query(LegalDocument).filter(LegalDocument.notification_number == "GSR 202(E)").first()
    if not base_doc:
        base_doc = LegalDocument(
            title="Legal Metrology (Packaged Commodities) Rules, 2011",
            document_type=DocumentType.BASE_RULE,
            notification_number="GSR 202(E)",
            publication_date=datetime(2011, 3, 7),
            effective_date=datetime(2011, 4, 1),
            description="Principal rulebook governing mandatory declarations on packaged commodities in India."
        )
        db.add(base_doc)
        db.commit()
        db.refresh(base_doc)

    amendment_doc = db.query(LegalDocument).filter(LegalDocument.notification_number == "GSR 779(E)").first()
    if not amendment_doc:
        amendment_doc = LegalDocument(
            title="Legal Metrology (Packaged Commodities) Amendment Rules, 2021",
            document_type=DocumentType.AMENDMENT,
            notification_number="GSR 779(E)",
            publication_date=datetime(2021, 11, 2),
            effective_date=datetime(2022, 1, 1),
            description="Mandates Unit Sale Price (USP) for packages exceeding 1kg/1L and rationalizes unit representations."
        )
        db.add(amendment_doc)
        db.commit()
        db.refresh(amendment_doc)

    # 3. Seed Compliance Rules
    rules_seed = [
        {
            "code": "LM-PC-R06-QTY",
            "number": "Rule 6(1)(c)",
            "title": "Net Quantity Declaration",
            "description": "Mandates plain declaration of net quantity in standard units of weight, measure, or number.",
            "req_type": "NET_QUANTITY",
            "val_type": "quantity_validation",
            "severity": RuleSeverity.CRITICAL,
            "version": "2011-Original",
            "config": {"allowed_units": ["g", "kg", "ml", "l", "m", "cm", "mm", "n", "u"], "forbid_units": ["gm", "gms", "cc"]}
        },
        {
            "code": "LM-PC-R06-MRP",
            "number": "Rule 6(1)(e)",
            "title": "Maximum Retail Price (MRP) & Taxes",
            "description": "Mandates retail sale price declaration inclusive of all taxes in Indian Rupees.",
            "req_type": "MRP",
            "val_type": "mrp_validation",
            "severity": RuleSeverity.CRITICAL,
            "version": "2011-Original",
            "config": {"require_inclusive_taxes": True, "currency": "INR"}
        },
        {
            "code": "LM-PC-R06-USP",
            "number": "Rule 6(11)",
            "title": "Unit Sale Price (USP) Requirement",
            "description": "Requires declaration of price per gram/kg/ml/litre for commodities packed in quantities >= 1kg or 1L.",
            "req_type": "UNIT_SALE_PRICE",
            "val_type": "usp_validation",
            "severity": RuleSeverity.MAJOR,
            "version": "2021-Amendment",
            "config": {"threshold_grams": 1000, "threshold_ml": 1000}
        },
        {
            "code": "LM-PC-R06-DATE",
            "number": "Rule 6(1)(d)",
            "title": "Month and Year of Manufacture or Packing",
            "description": "Mandates explicit month and year of packing, manufacture, or import.",
            "req_type": "MFG_DATE",
            "val_type": "date_validation",
            "severity": RuleSeverity.CRITICAL,
            "version": "2011-Original",
            "config": {"format_regex": r"^(?:0[1-9]|1[0-2]|[a-zA-Z]{3,9})[\/\.\-\s]+(?:20\d{2}|\d{2})$"}
        },
        {
            "code": "LM-PC-R06-MFG",
            "number": "Rule 6(1)(a)",
            "title": "Manufacturer / Packer / Importer Details",
            "description": "Mandates complete corporate name and physical registered address.",
            "req_type": "MANUFACTURER",
            "val_type": "presence_check",
            "severity": RuleSeverity.CRITICAL,
            "version": "2011-Original",
            "config": {}
        },
        {
            "code": "LM-PC-R06-CARE",
            "number": "Rule 6(1)(f)",
            "title": "Consumer Care Redressal Details",
            "description": "Mandates telephone helpline, email, and address for consumer complaints.",
            "req_type": "CONSUMER_CARE",
            "val_type": "presence_check",
            "severity": RuleSeverity.MAJOR,
            "version": "2011-Original",
            "config": {}
        },
        {
            "code": "LM-PC-R13-UNIT",
            "number": "Rule 13",
            "title": "Standard SI Units of Weight & Measure",
            "description": "Prohibits non-standard symbols such as 'gm', 'gms', 'cc', 'kilo', etc.",
            "req_type": "NET_QUANTITY",
            "val_type": "unit_validation",
            "severity": RuleSeverity.MAJOR,
            "version": "2011-Original",
            "config": {}
        },
        {
            "code": "LM-PC-R18-CONF",
            "number": "Rule 18",
            "title": "Prohibition of Dual / Conflicting Declarations",
            "description": "Strictly forbids conflicting declarations of MRP, weight, or dates across packaging.",
            "req_type": "CONFLICT",
            "val_type": "conflict_detection",
            "severity": RuleSeverity.CRITICAL,
            "version": "2011-Original",
            "config": {}
        },
        {
            "code": "LM-PC-SCH1-FONT",
            "number": "First Schedule",
            "title": "Minimum Height of Numerals",
            "description": "Mandates minimum physical millimeter height for numeral declarations based on net content.",
            "req_type": "FONT_SIZE",
            "val_type": "font_size_validation",
            "severity": RuleSeverity.MAJOR,
            "version": "2011-Original",
            "config": {"brackets": [(50, 1.0), (200, 2.0), (1000, 4.0), (999999, 6.0)]}
        }
    ]

    for r_data in rules_seed:
        existing_rule = db.query(ComplianceRule).filter(ComplianceRule.rule_code == r_data["code"]).first()
        if not existing_rule:
            new_rule = ComplianceRule(
                rule_code=r_data["code"],
                rule_number=r_data["number"],
                title=r_data["title"],
                description=r_data["description"],
                requirement_type=r_data["req_type"],
                validation_type=r_data["val_type"],
                severity=r_data["severity"],
                source_reference="Legal Metrology (Packaged Commodities) Rules, 2011"
            )
            db.add(new_rule)
            db.commit()
            db.refresh(new_rule)

            # Add Version
            version = RuleVersion(
                rule_id=new_rule.id,
                version_label=r_data["version"],
                effective_from=datetime(2011, 4, 1),
                rule_content=r_data["description"],
                validation_configuration=r_data["config"],
                legal_document_id=base_doc.id if base_doc else None
            )
            db.add(version)
            db.commit()

    # 4. Seed Demo Establishment & Inspection
    est = db.query(Establishment).filter(Establishment.name == "Metro Wholesale & Hypermarket").first()
    if not est:
        est = Establishment(
            name="Metro Wholesale & Hypermarket",
            license_number="LM-RET-KA-2024-8891",
            address="Plot 42, Outer Ring Road, Mahadevapura",
            city="Bengaluru",
            state="Karnataka",
            pincode="560048",
            establishment_type="Supermarket / Wholesale Hub",
            contact_person="Ramesh Rao",
            contact_phone="+91 98450 12345"
        )
        db.add(est)
        db.commit()
        db.refresh(est)

    inspector_user = db.query(User).filter(User.email == "inspector@labelguard.gov.in").first()
    insp = db.query(Inspection).filter(Inspection.inspection_number == "INS-2026-0904-001").first()
    if not insp and inspector_user:
        insp = Inspection(
            inspection_number="INS-2026-0904-001",
            establishment_id=est.id,
            inspector_id=inspector_user.id,
            status=InspectionStatus.ANALYSIS_COMPLETE,
            scheduled_date=datetime.utcnow() - timedelta(hours=2),
            officer_notes="Surprise enforcement drive on packaged food commodities under Legal Metrology Rules."
        )
        db.add(insp)
        db.commit()
        db.refresh(insp)

        # Seed Demo Product 1: Non-Compliant (Missing USP for 1kg pack + Non-standard unit "gm")
        p1 = Product(
            inspection_id=insp.id,
            product_name="Golden Harvest Basmati Rice 1kg",
            category="Food & Beverages",
            brand="Golden Harvest Agro",
            barcode="8901234567890",
            compliance_status=ComplianceStatus.POTENTIAL_NON_COMPLIANCE,
            overall_confidence=0.94,
            readability_score=88.5,
            readability_grade="HIGH",
            font_size_status="PASS",
            structured_data={
                "product_name": "Golden Harvest Basmati Rice",
                "net_quantity": {"value": 1000.0, "unit": "gm", "is_standard_si": False, "has_space_delimiter": True},
                "mrp": {"value": 180.0, "currency": "INR", "inclusive_of_all_taxes": True},
                "unit_sale_price": None, # Missing Unit Sale Price for 1kg pack!
                "mfg_date": {"date_string": "07/2026", "is_valid_format": True},
                "manufacturer": {"text": "Golden Harvest Agro Ltd, NH-44, Sonipat, Haryana"},
                "consumer_care": {"phone": "1800-200-8899", "email": "care@goldenharvest.in"},
                "country_of_origin": {"country": "India"},
                "conflicts": []
            }
        )
        db.add(p1)
        db.commit()
        db.refresh(p1)

        # Attach demo product images
        img1 = ProductImage(
            product_id=p1.id,
            package_side=PackageSide.FRONT,
            file_path="/api/v1/images/file/sample_rice_front.jpg",
            file_name="sample_rice_front.jpg",
            file_size=145000,
            width=800,
            height=1000,
            blur_score=155.0,
            quality_status="ACCEPTABLE",
            processed_path="/api/v1/images/file/sample_rice_front.jpg"
        )
        img2 = ProductImage(
            product_id=p1.id,
            package_side=PackageSide.BACK,
            file_path="/api/v1/images/file/sample_rice_back.jpg",
            file_name="sample_rice_back.jpg",
            file_size=152000,
            width=800,
            height=1000,
            blur_score=162.0,
            quality_status="ACCEPTABLE",
            processed_path="/api/v1/images/file/sample_rice_back.jpg"
        )
        db.add_all([img1, img2])
        db.commit()

        # Seed Findings for Product 1
        qty_rule = db.query(ComplianceRule).filter(ComplianceRule.rule_code == "LM-PC-R13-UNIT").first()
        usp_rule = db.query(ComplianceRule).filter(ComplianceRule.rule_code == "LM-PC-R06-USP").first()
        
        f1 = ComplianceFinding(
            product_id=p1.id,
            rule_id=qty_rule.id if qty_rule else None,
            requirement="Rule 13 - Standard SI Units of Weight or Measure",
            category=FindingCategory.INVALID_UNIT,
            status=FindingStatus.FLAGGED_BY_AI,
            severity=RuleSeverity.MAJOR,
            reason="Non-standard unit 'gm' used. Rule 13 mandates standard SI symbol 'g' or 'kg'.",
            evidence_data={"detected_unit": "gm", "mandated_symbol": "g"},
            source_image_id=img1.id,
            bounding_box=[60.0, 10.0, 72.0, 92.5],
            ai_confidence=0.96
        )
        f2 = ComplianceFinding(
            product_id=p1.id,
            rule_id=usp_rule.id if usp_rule else None,
            requirement="Rule 6(11) - Unit Sale Price (USP)",
            category=FindingCategory.MISSING_DECLARATION,
            status=FindingStatus.FLAGGED_BY_AI,
            severity=RuleSeverity.MAJOR,
            reason="Commodity Net Quantity (1000.0 gm / 1kg) is 1kg or greater. Unit Sale Price declaration is legally mandatory under 2021/2022 Amendment.",
            evidence_data={"net_qty": "1kg", "mrp": 180.0},
            source_image_id=img1.id,
            bounding_box=[64.0, 10.0, 70.0, 92.5],
            ai_confidence=0.93
        )
        db.add_all([f1, f2])

        # Seed Demo Product 2: Fully Compliant
        p2 = Product(
            inspection_id=insp.id,
            product_name="Pure Desi Ghee 500ml",
            category="Dairy & Oils",
            brand="Nandini KMF",
            barcode="8901030456123",
            compliance_status=ComplianceStatus.COMPLIANT,
            overall_confidence=0.98,
            readability_score=94.0,
            readability_grade="HIGH",
            font_size_status="PASS",
            structured_data={
                "product_name": "Pure Desi Ghee",
                "net_quantity": {"value": 500.0, "unit": "ml", "is_standard_si": True, "has_space_delimiter": True},
                "mrp": {"value": 310.0, "currency": "INR", "inclusive_of_all_taxes": True},
                "mfg_date": {"date_string": "08/2026", "is_valid_format": True},
                "manufacturer": {"text": "Karnataka Co-operative Milk Producers' Federation Ltd, Bengaluru"},
                "consumer_care": {"phone": "1800-425-8030", "email": "customercare@kmfnandini.coop"},
                "country_of_origin": {"country": "India"},
                "conflicts": []
            }
        )
        db.add(p2)
        db.commit()
        db.refresh(p2)

        img3 = ProductImage(
            product_id=p2.id,
            package_side=PackageSide.FRONT,
            file_path="/api/v1/images/file/sample_ghee_front.jpg",
            file_name="sample_ghee_front.jpg",
            file_size=168000,
            width=800,
            height=1000,
            blur_score=170.0,
            quality_status="ACCEPTABLE",
            processed_path="/api/v1/images/file/sample_ghee_front.jpg"
        )
        db.add(img3)
        db.commit()

    db.close()
    print("LabelGuard AI Database Seeded Successfully with Sample Images & Findings.")

if __name__ == "__main__":
    seed_database()
