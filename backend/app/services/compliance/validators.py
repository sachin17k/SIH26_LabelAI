from typing import Dict, Any, List, Optional
from app.models.rule_models import FindingCategory, RuleSeverity

class ComplianceValidators:
    """
    Comprehensive Deterministic Legal Metrology Compliance Validation Engine.
    Executes deep statutory verification against the complete Legal Metrology
    (Packaged Commodities) Rules, 2011 & Official Gazette Amendments (2015-2024).
    """

    @staticmethod
    def validate_commodity_name(commodity_name: Optional[str]) -> List[Dict[str, Any]]:
        """
        Rule 6(1)(a) & Rule 6(2) - Name and Generic Identity of the Commodity.
        Every package shall bear a definite, plain, and conspicuous declaration
        of the name and generic identity of the commodity.
        """
        findings = []
        if not commodity_name or commodity_name.strip() in ["", "Packaged Commodity", "General Goods"]:
            findings.append({
                "category": FindingCategory.MISSING_DECLARATION,
                "severity": RuleSeverity.CRITICAL,
                "requirement": "Rule 6(1)(a) - Generic Identity of Commodity",
                "reason": "Name and generic identity of the commodity was not conspicuously declared on the package surface."
            })
        return findings

    @staticmethod
    def validate_manufacturer_packer(mfg: Optional[Dict[str, Any]], pkr: Optional[Dict[str, Any]], imp: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rule 6(1)(b) - Name and Complete Address of Manufacturer / Packer / Importer.
        Every package shall bear the name and complete postal address including
        premises/street, city/district, state, and Postal Index Number (PIN Code).
        """
        findings = []
        entity = mfg or pkr or imp
        if not entity or not entity.get("text"):
            findings.append({
                "category": FindingCategory.MISSING_DECLARATION,
                "severity": RuleSeverity.CRITICAL,
                "requirement": "Rule 6(1)(b) - Manufacturer / Packer Identity",
                "reason": "Neither manufacturer, packer, nor importer name and address was detected on the package."
            })
            return findings

        # Check for complete postal address (PIN code check)
        pin_code = entity.get("pin_code")
        text = entity.get("text", "")
        if not pin_code:
            findings.append({
                "category": FindingCategory.INVALID_FORMAT,
                "severity": RuleSeverity.MAJOR,
                "requirement": "Rule 6(1)(b) - Complete Postal Address (PIN Code)",
                "reason": "Manufacturer/Packer address lacks mandatory 6-digit Postal Index Number (PIN Code) required for statutory compliance."
            })

        return findings

    @staticmethod
    def validate_net_quantity(data: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rule 6(1)(c), Rule 13(1), Rule 13(3), Rule 13(4) - Net Quantity Declarations.
        - Must declare net quantity in standard SI metric units.
        - Mandates standard blank space separation between numeral and unit (Rule 13(3)).
        - Prohibits non-standard symbols like gm, gms, cc, kilo (Rule 13(4)).
        """
        findings = []
        if not data or data.get("value") is None:
            findings.append({
                "category": FindingCategory.MISSING_DECLARATION,
                "severity": RuleSeverity.CRITICAL,
                "requirement": "Rule 6(1)(c) - Net Quantity Declaration",
                "reason": "Net Quantity declaration was not detected on any package surface."
            })
            return findings

        val = data.get("value")
        unit = (data.get("unit") or "").lower()
        has_space = data.get("has_space_delimiter", True)

        # Rule 13(4): Prohibited non-standard metric symbols
        illegal_units_map = {
            "gm": "g",
            "gms": "g",
            "cc": "ml",
            "kilo": "kg",
            "ltr": "l",
            "liter": "l",
            "litre": "l"
        }

        if unit in illegal_units_map:
            findings.append({
                "category": FindingCategory.INVALID_UNIT,
                "severity": RuleSeverity.MAJOR,
                "requirement": "Rule 13(4) - Standard SI Unit Symbols",
                "reason": f"Non-standard unit symbol '{unit}' used. Rule 13(4) strictly prohibits '{unit}' and mandates standard SI symbol '{illegal_units_map[unit]}'."
            })

        # Rule 13(3): Blank space separation
        if not has_space:
            findings.append({
                "category": FindingCategory.INVALID_FORMAT,
                "severity": RuleSeverity.MINOR,
                "requirement": "Rule 13(3) - Blank Space between Numeral and Symbol",
                "reason": f"Numeral and symbol are conjoined without mandatory blank space separation: '{val}{unit}'. Prescribed format is '{val} {unit}'."
            })

        return findings

    @staticmethod
    def validate_mfg_date(data: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rule 6(1)(d) - Month and Year of Manufacture / Pre-packing / Import.
        Must indicate the month and year in which commodity is manufactured, packed, or imported.
        """
        findings = []
        if not data or not data.get("date_string"):
            findings.append({
                "category": FindingCategory.MISSING_DECLARATION,
                "severity": RuleSeverity.CRITICAL,
                "requirement": "Rule 6(1)(d) - Date of Packing or Manufacture",
                "reason": "Month and Year of manufacture or pre-packing was not detected on any package surface."
            })
            return findings

        if not data.get("is_valid_format", True):
            findings.append({
                "category": FindingCategory.INVALID_FORMAT,
                "severity": RuleSeverity.MINOR,
                "requirement": "Rule 6(1)(d) - Prescribed Date Format",
                "reason": f"Date declaration '{data.get('date_string')}' does not comply with prescribed MM/YYYY or Month Year format."
            })

        return findings

    @staticmethod
    def validate_mrp(
        mrp_data: Optional[Dict[str, Any]],
        qty_data: Optional[Dict[str, Any]] = None,
        usp_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Rule 6(1)(e), Rule 18(2), Rule 18(3) - Retail Sale Price (MRP).
        - Maximum Retail Price must be declared with numeric price.
        - Must declare statutory statement 'inclusive of all taxes'.
        - Prohibits price smudging, alteration, or non-declaration.
        """
        findings = []
        if not mrp_data:
            findings.append({
                "category": FindingCategory.MISSING_DECLARATION,
                "severity": RuleSeverity.CRITICAL,
                "requirement": "Rule 6(1)(e) - Maximum Retail Price (MRP)",
                "reason": "Maximum Retail Price (MRP) declaration was not detected on the package."
            })
            return findings

        val = mrp_data.get("value")
        incl_taxes = mrp_data.get("inclusive_of_all_taxes", False)

        if val is None:
            findings.append({
                "category": FindingCategory.MRP_ISSUE,
                "severity": RuleSeverity.CRITICAL,
                "requirement": "Rule 18(3) - Altered, Smudged or Omitted Retail Price",
                "reason": "MRP header was detected on package, but the numerical price is omitted, smudged, or obscured in violation of Rule 18(3)."
            })
        elif val <= 0:
            findings.append({
                "category": FindingCategory.MRP_ISSUE,
                "severity": RuleSeverity.CRITICAL,
                "requirement": "Rule 6(1)(e) - Non-positive Retail Price",
                "reason": f"Invalid non-positive retail price value detected: '{val}'."
            })

        # Mandatory statement: "inclusive of all taxes"
        if not incl_taxes:
            findings.append({
                "category": FindingCategory.MRP_ISSUE,
                "severity": RuleSeverity.MAJOR,
                "requirement": "Rule 6(1)(e) - 'Inclusive of All Taxes' Disclaimer",
                "reason": "Statutory declaration 'inclusive of all taxes' or 'incl. of all taxes' was not found alongside MRP."
            })

        # Backward compatibility: evaluate unit sale price if qty_data is provided
        if qty_data:
            findings.extend(ComplianceValidators.validate_unit_sale_price(qty_data, usp_data))

        return findings

    @staticmethod
    def validate_unit_sale_price(qty_data: Optional[Dict[str, Any]], usp_data: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rule 6(11) Amendment (G.S.R. 779(E) dated 2nd Nov 2021).
        Unit Sale Price (USP) is legally mandatory for all pre-packed commodities
        where net quantity > 1kg or > 1L, or for multi-packs.
        """
        findings = []
        if qty_data and qty_data.get("value") is not None:
            q_val = float(qty_data.get("value", 0))
            q_unit = (qty_data.get("unit") or "").lower()
            is_large_pack = (q_unit in ["kg", "l", "litre", "liter"] and q_val >= 1.0) or (q_unit in ["g", "ml"] and q_val >= 1000.0)

            if is_large_pack and not usp_data:
                findings.append({
                    "category": FindingCategory.MISSING_DECLARATION,
                    "severity": RuleSeverity.MAJOR,
                    "requirement": "Rule 6(11) - Unit Sale Price (USP)",
                    "reason": f"Package Net Quantity is {q_val} {q_unit} (>= 1kg/1L). Unit Sale Price (e.g. ₹ per g / ₹ per kg) declaration is mandatory under the 2021 Gazette Amendment."
                })
        return findings

    @staticmethod
    def validate_consumer_care(data: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rule 6(1)(f) - Consumer Care / Grievance Redressal Mechanism.
        Every package shall bear the name, address, telephone number, AND email address
        of the person or grievance redressal cell that can be contacted in case of consumer complaints.
        """
        findings = []
        if not data:
            findings.append({
                "category": FindingCategory.MISSING_DECLARATION,
                "severity": RuleSeverity.CRITICAL,
                "requirement": "Rule 6(1)(f) - Consumer Care Helpline & Grievance Address",
                "reason": "Consumer care telephone helpline and grievance contact details were not detected on package."
            })
            return findings

        phone = data.get("phone")
        email = data.get("email")

        if not phone:
            findings.append({
                "category": FindingCategory.MISSING_DECLARATION,
                "severity": RuleSeverity.MAJOR,
                "requirement": "Rule 6(1)(f) - Consumer Care Telephone Helpline",
                "reason": "Statutory consumer complaint telephone number or toll-free helpline is missing from consumer care panel."
            })

        if not email:
            findings.append({
                "category": FindingCategory.MISSING_DECLARATION,
                "severity": RuleSeverity.MAJOR,
                "requirement": "Rule 6(1)(f) - Consumer Care Email Address",
                "reason": "Statutory consumer grievance email address is missing (mandated under Gazette Amendment)."
            })

        return findings

    @staticmethod
    def validate_country_of_origin(data: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rule 6(1)(g) & Rule 10 - Country of Origin.
        Every package shall declare the country of origin or manufacture.
        """
        findings = []
        if not data or not data.get("country"):
            findings.append({
                "category": FindingCategory.MISSING_DECLARATION,
                "severity": RuleSeverity.MAJOR,
                "requirement": "Rule 6(1)(g) - Country of Origin Declaration",
                "reason": "Country of origin declaration (e.g. 'Made in India' / 'Country of Origin: ...') was not detected."
            })
        return findings

    @staticmethod
    def validate_first_schedule_height(qty_data: Optional[Dict[str, Any]], px_height: float, calibration_factor: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Rule 13(1) & First Schedule Table - Minimum Numeral Height for Net Quantity.
        Statutory Minimum Heights:
        - Net Qty <= 50g/ml: min 1.0 mm
        - 50g < Net Qty <= 200g/ml: min 2.0 mm
        - 200g < Net Qty <= 1kg/1L: min 4.0 mm
        - Net Qty > 1kg/1L: min 6.0 mm
        """
        findings = []
        if not qty_data or qty_data.get("value") is None:
            return findings

        q_val = float(qty_data.get("value", 0))
        q_unit = (qty_data.get("unit") or "").lower()

        # Convert to equivalent grams/ml
        weight_g = q_val * 1000.0 if q_unit in ["kg", "l", "litre"] else q_val

        if weight_g <= 50:
            min_mm = 1.0
        elif weight_g <= 200:
            min_mm = 2.0
        elif weight_g <= 1000:
            min_mm = 4.0
        else:
            min_mm = 6.0

        # If calibration factor exists (mm per pixel), calculate physical height
        if calibration_factor and calibration_factor > 0:
            physical_mm = round(px_height * calibration_factor, 2)
            if physical_mm < min_mm:
                findings.append({
                    "category": FindingCategory.POSSIBLE_FONT_SIZE_VIOLATION,
                    "severity": RuleSeverity.MAJOR,
                    "requirement": "Rule 13(1) & First Schedule - Minimum Numeral Height",
                    "reason": f"Net quantity numeral height ({physical_mm} mm) is below statutory minimum height of {min_mm} mm prescribed under First Schedule for {q_val} {q_unit} package."
                })

        return findings
