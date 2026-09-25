import pytest
from app.services.extractor.declaration_parser import DeclarationParser
from app.services.compliance.validators import ComplianceValidators
from app.services.vision.readability import ReadabilityAnalyzer
from app.models.rule_models import FindingCategory, RuleSeverity

def test_net_quantity_extraction():
    sample_boxes = [
        {"text": "Net Quantity: 500 g", "box": [10, 10, 20, 30], "confidence": 0.98},
        {"text": "MRP Rs. 140.00 (incl. of all taxes)", "box": [30, 10, 40, 50], "confidence": 0.95},
        {"text": "Pkd: 08/2026", "box": [50, 10, 60, 30], "confidence": 0.92},
        {"text": "Manufactured by: Sri Organic Foods Pvt Ltd, Industrial Area, Bangalore", "box": [70, 10, 80, 80], "confidence": 0.90},
        {"text": "Consumer Care: 1800-425-9900 or email support@sriorganic.in", "box": [85, 10, 95, 80], "confidence": 0.94}
    ]
    
    decls = DeclarationParser.parse_boxes(sample_boxes)
    decl_types = [d["declaration_type"] for d in decls]
    
    assert "NET_QUANTITY" in decl_types
    assert "MRP" in decl_types
    assert "MFG_DATE" in decl_types
    assert "MANUFACTURER" in decl_types
    assert "CONSUMER_CARE" in decl_types

    # Validate Net Qty extraction values
    qty_decl = next(d for d in decls if d["declaration_type"] == "NET_QUANTITY")
    assert qty_decl["normalized_value"]["value"] == 500.0
    assert qty_decl["normalized_value"]["unit"] == "g"
    assert qty_decl["normalized_value"]["is_standard_si"] is True

def test_non_standard_unit_violation():
    # Test illegal unit "gm" under Rule 13
    bad_qty = {"value": 500.0, "unit": "gm", "is_standard_si": False, "has_space_delimiter": True}
    findings = ComplianceValidators.validate_net_quantity(bad_qty)
    
    assert len(findings) > 0
    assert any(f["category"] == FindingCategory.INVALID_UNIT for f in findings)
    assert any("Rule 13" in f["requirement"] for f in findings)

def test_mrp_inclusive_taxes_violation():
    # Test MRP without statutory inclusive of all taxes
    bad_mrp = {"value": 250.0, "inclusive_of_all_taxes": False}
    findings = ComplianceValidators.validate_mrp(bad_mrp, {"value": 500, "unit": "g"}, None)
    
    assert len(findings) > 0
    assert any("inclusive of all taxes" in f["reason"].lower() for f in findings)

def test_unit_sale_price_requirement_for_large_pack():
    # Test package >= 1kg missing Unit Sale Price (USP) under 2021/2022 Amendment
    mrp_data = {"value": 300.0, "inclusive_of_all_taxes": True}
    qty_data = {"value": 1.5, "unit": "kg"}
    usp_data = None # Missing!
    
    findings = ComplianceValidators.validate_mrp(mrp_data, qty_data, usp_data)
    assert any("Unit Sale Price" in f["requirement"] for f in findings)

def test_readability_metrics():
    # Test Level 1 readability score calculation
    eval_res = ReadabilityAnalyzer.calculate_readability_score(
        blur_score=160.0,
        contrast=60.0,
        ocr_confidence=0.95,
        detected_text_length=120
    )
    assert eval_res["readability_score"] >= 80.0
    assert eval_res["readability_grade"] == "HIGH"

def test_first_schedule_font_calibration():
    # Test Level 2 physical font size calibration
    # 500g requires minimum 4.0mm height
    calib_factor = 10.0 # 10 pixels per mm
    char_px = 50.0 # 50 px / 10 = 5.0 mm -> PASS
    res = ReadabilityAnalyzer.evaluate_physical_font_size(
        net_quantity_val=500.0,
        net_quantity_unit="g",
        char_box_height_px=char_px,
        pixels_per_mm=calib_factor
    )
    assert res["status"] == "PASS"
    assert res["estimated_mm"] == 5.0
    assert res["required_mm"] == 4.0
