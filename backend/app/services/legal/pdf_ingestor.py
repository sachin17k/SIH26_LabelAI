import os
import io
import json
from typing import Dict, List, Any, Optional
import pymupdf

class LegalMetrologyPDFIngestor:
    """
    Ingestion, page-level mapping, and high-performance renderer for the
    194-page consolidated Legal Metrology Rules and Amendments PDF.
    Operates 100% locally and offline.
    """

    POSSIBLE_PATHS = [
        os.path.abspath("d:/sri/labelai/legal_documents/legal_metrology_rules_consolidated.pdf"),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../legal_documents/legal_metrology_rules_consolidated.pdf")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../legal_documents/legal_metrology_rules_consolidated.pdf")),
        "D:/sri/metrology laws/legal_metrology_rules_consolidated.pdf"
    ]
    PDF_PATH = next((p for p in POSSIBLE_PATHS if os.path.exists(p)), POSSIBLE_PATHS[0])
    INDEX_JSON_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../legal_docs/legal_metrology_rules_index.json"))

    # Authoritative English Gazette mapping across the 194 pages
    STATUTORY_INDEX: List[Dict[str, Any]] = [
        {
            "rule_code": "LM-PC-R06-COMMODITY",
            "rule_number": "Rule 6(1)(a)",
            "title": "Name and Generic Identity of Commodity",
            "chapter": "Chapter II — Packages Intended for Retail Sale",
            "page_number": 39,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 39",
            "statutory_text": "Every package shall bear thereon or on a label securely affixed thereto, a definite, plain and conspicuous declaration of the name and generic identity of the commodity contained in the package.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009 — Fine up to ₹25,000 for first offence, up to ₹50,000 for second offence.",
            "keywords": ["commodity", "product name", "generic identity", "identity of commodity", "name of product"]
        },
        {
            "rule_code": "LM-PC-R06-MFG",
            "rule_number": "Rule 6(1)(b)",
            "title": "Name and Complete Address of Manufacturer / Packer / Importer",
            "chapter": "Chapter II — Packages Intended for Retail Sale",
            "page_number": 39,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 39",
            "statutory_text": "Every package shall bear the name and complete address of the manufacturer or where the manufacturer is not the packer, the name and complete address of the manufacturer and packer, and in case of imported packages, the name and complete address of the importer.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009.",
            "keywords": ["manufacturer", "packer", "importer", "address", "manufactured by", "imported by", "packed by"]
        },
        {
            "rule_code": "LM-PC-R06-QTY",
            "rule_number": "Rule 6(1)(c)",
            "title": "Net Quantity Declaration in Standard Metric Units",
            "chapter": "Chapter II — Packages Intended for Retail Sale",
            "page_number": 39,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 39",
            "statutory_text": "Every package shall bear the net quantity, in terms of the standard unit of weight or measure, of the commodity contained in the package or where the commodity is packed or sold by number, the number of the commodity contained in the package shall be mentioned.",
            "penalty_section": "Section 36(1) & (2) of Legal Metrology Act, 2009.",
            "keywords": ["net quantity", "net weight", "net content", "weight", "volume", "grams", "kilograms", "litres", "ml"]
        },
        {
            "rule_code": "LM-PC-R06-DATE",
            "rule_number": "Rule 6(1)(d)",
            "title": "Month and Year of Manufacture / Packing / Import",
            "chapter": "Chapter II — Packages Intended for Retail Sale",
            "page_number": 40,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 40",
            "statutory_text": "Every package shall bear the month and the year in which the commodity is manufactured or pre-packed or imported shall be mentioned in letters and numerals.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009.",
            "keywords": ["date of manufacture", "mfg date", "packed date", "packing date", "month and year", "expiry", "best before"]
        },
        {
            "rule_code": "LM-PC-R06-MRP",
            "rule_number": "Rule 6(1)(e)",
            "title": "Maximum Retail Price (MRP) Inclusive of All Taxes",
            "chapter": "Chapter II — Packages Intended for Retail Sale",
            "page_number": 40,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 40",
            "statutory_text": "Every package shall bear the retail sale price of the package, in the format 'Maximum or Max. Retail Price Rs. ...... or ₹ ...... (inclusive of all taxes)'. No retailer shall sell any pre-packed commodity at a price exceeding the retail sale price indicated on the package.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009 read with Rule 18(2).",
            "keywords": ["mrp", "maximum retail price", "retail sale price", "inclusive of all taxes", "price", "taxes"]
        },
        {
            "rule_code": "LM-PC-R06-CARE",
            "rule_number": "Rule 6(1)(n)",
            "title": "Consumer Care / Grievance Redressal Details",
            "chapter": "Chapter II — Packages Intended for Retail Sale",
            "page_number": 40,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 40",
            "statutory_text": "The name, address, telephone number, and e-mail address of the person who can be or the office which can be contacted, in case of consumer complaints, shall be declared on the package.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009.",
            "keywords": ["consumer care", "customer care", "helpline", "toll free", "complaints", "feedback", "grievance", "email"]
        },
        {
            "rule_code": "LM-PC-R06-ORIGIN",
            "rule_number": "Rule 6(1)(g)",
            "title": "Country of Origin or Manufacture",
            "chapter": "Chapter II — Packages Intended for Retail Sale",
            "page_number": 40,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 40",
            "statutory_text": "Every package shall bear the name of the country of origin or manufacture or assembly in case of imported packages, and in case of indigenous packages, 'Made in India' or country of origin.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009.",
            "keywords": ["country of origin", "made in india", "origin", "manufactured in", "imported from"]
        },
        {
            "rule_code": "LM-PC-R09-PROMINENCE",
            "rule_number": "Rule 9(1)",
            "title": "Manner in Which Declaration Shall be Made (Prominence & Legibility)",
            "chapter": "Chapter II — General Provisions on Declarations",
            "page_number": 46,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 46",
            "statutory_text": "Every declaration which is required to be made on a package shall be legible and prominent. The declaration shall be in such letters or numerals as may give a contrast with the background of the label.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009.",
            "keywords": ["prominence", "legibility", "contrast", "readable", "background contrast", "rule 9"]
        },
        {
            "rule_code": "LM-PC-R13-HEIGHT",
            "rule_number": "Rule 13(1) & (2)",
            "title": "Minimum Height of Numerals & Letters (Tables I & II)",
            "chapter": "Chapter II — Principal Display Panel Declarations",
            "page_number": 47,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 47–48",
            "statutory_text": "The height of any numeral and letter in the declaration on the principal display panel shall not be less than as shown in Table-I (for weight or volume) and Table-II (for length, area or number). Up to 50g: 1.0mm (blown/embossed 2.0mm); 50g to 200g: 2.0mm (blown 4.0mm); 200g to 1kg: 4.0mm; Above 1kg: 6.0mm.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009.",
            "keywords": ["font size", "numeral height", "letter height", "table-i", "table-ii", "principal display panel", "pdp height"]
        },
        {
            "rule_code": "LM-PC-R13-FORMAT",
            "rule_number": "Rule 13(3)",
            "title": "Mandatory Blank Space Between Numeral and Unit",
            "chapter": "Chapter II — Principal Display Panel Declarations",
            "page_number": 48,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 48",
            "statutory_text": "A declaration of quantity shall not be conjoined to any unit of measurement without a blank space. For example, '28.0 g' or '100 ml' is lawful; '28.0g' or '100ml' without a separating blank space violates Rule 13(3).",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009.",
            "keywords": ["numeral unit space", "blank space", "conjoined unit", "unit formatting", "spacing"]
        },
        {
            "rule_code": "LM-PC-R18-DUAL-MRP",
            "rule_number": "Rule 18(2)",
            "title": "Prohibition of Dual MRP & Overcharging",
            "chapter": "Chapter II — Provisions Relating to Wholesale & Retail Dealers",
            "page_number": 56,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 56",
            "statutory_text": "No person shall declare on a package more than one retail sale price (dual MRP), nor shall any wholesale dealer or other dealer sell any pre-packed commodity to a consumer at a price higher than the retail sale price declared thereon.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009 — Overcharging & Dual Pricing Offence.",
            "keywords": ["dual mrp", "overcharging", "higher price", "smudged mrp", "tampered mrp", "two prices"]
        },
        {
            "rule_code": "LM-PC-R06-USP",
            "rule_number": "Rule 6(1)(m) [2021 Amendment]",
            "title": "Mandatory Unit Sale Price (USP) Declaration",
            "chapter": "Amendments — Legal Metrology (Packaged Commodities) Amendment Rules, 2021",
            "page_number": 121,
            "gazette_reference": "G.S.R. 779(E), Notification dated 2nd Nov 2021, Page 121",
            "statutory_text": "The unit sale price in rupees rounded off to the nearest two decimal places, shall be declared on every package where net quantity is greater than one kilogram or one litre, declared per kg or per litre; and where net quantity is less than 1kg/1litre, declared per gram or per millilitre.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009 read with 2021 Amendment Rules.",
            "keywords": ["unit sale price", "usp", "per gram", "per kg", "per ml", "per litre", "per piece", "unit price"]
        },
        {
            "rule_code": "LM-PC-R26-EXEMPTIONS",
            "rule_number": "Rule 26",
            "title": "Exemption on Small Packages (10g or 10ml)",
            "chapter": "Chapter II — Exemptions",
            "page_number": 69,
            "gazette_reference": "G.S.R. 202(E), Min. of Consumer Affairs, Page 69",
            "statutory_text": "Nothing in these rules shall apply to packages containing commodities with net weight or measure of ten grams or ten millilitres or less, except for tobacco and related products.",
            "penalty_section": "Statutory Exemption Provision.",
            "keywords": ["exemption", "small package", "10g", "10ml", "exempt", "tobacco exception"]
        },
        {
            "rule_code": "LM-PC-SCHED-1",
            "rule_number": "First Schedule",
            "title": "Standard Units of Weight and Measure",
            "chapter": "Schedules — Legal Metrology (Packaged Commodities) Rules, 2011",
            "page_number": 73,
            "gazette_reference": "First Schedule, G.S.R. 202(E), Page 73",
            "statutory_text": "Units shall be expressed exclusively in metric system: Mass in gram (g) or kilogram (kg); Volume in millilitre (ml) or litre (l); Length in millimetre (mm), centimetre (cm) or metre (m). Non-standard units (such as lbs, oz, fluid oz) are prohibited.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009.",
            "keywords": ["metric units", "first schedule", "standard units", "imperial units forbidden", "gram", "kg", "ml", "litre"]
        },
        {
            "rule_code": "LM-PC-R06-ECOMMERCE",
            "rule_number": "Rule 6(10) [2017 Amendment]",
            "title": "E-Commerce Digital Display Mandate",
            "chapter": "Amendments — E-Commerce Packaged Commodities Notification, 2017",
            "page_number": 92,
            "gazette_reference": "G.S.R. 629(E), Notification dated 23rd June 2017, Page 92",
            "statutory_text": "An e-commerce entity shall ensure that the mandatory declarations under sub-rule (1) of rule 6, except the month and year in which commodity is pre-packed, are displayed on the digital marketplace platform before sale.",
            "penalty_section": "Section 36(1) of Legal Metrology Act, 2009 against marketplace and seller.",
            "keywords": ["e-commerce", "digital display", "online marketplace", "seller declaration", "web portal"]
        }
    ]

    @classmethod
    def get_total_pages(cls) -> int:
        if not os.path.exists(cls.PDF_PATH):
            return 0
        doc = pymupdf.open(cls.PDF_PATH)
        return len(doc)

    @classmethod
    def get_rule_by_code(cls, rule_code: str) -> Optional[Dict[str, Any]]:
        for r in cls.STATUTORY_INDEX:
            if r["rule_code"].lower() == rule_code.lower():
                return r
        return None

    @classmethod
    def get_rule_by_number(cls, rule_number: str) -> Optional[Dict[str, Any]]:
        clean_num = rule_number.lower().replace(" ", "")
        for r in cls.STATUTORY_INDEX:
            if r["rule_number"].lower().replace(" ", "") in clean_num or clean_num in r["rule_number"].lower().replace(" ", ""):
                return r
        return None

    @classmethod
    def search_rules(cls, query: str) -> List[Dict[str, Any]]:
        q_tokens = [w.strip().lower() for w in query.split() if len(w.strip()) > 2]
        if not q_tokens:
            return cls.STATUTORY_INDEX[:5]

        scored_results = []
        for r in cls.STATUTORY_INDEX:
            score = 0
            for t in q_tokens:
                if t in r["rule_number"].lower():
                    score += 10
                if t in r["title"].lower():
                    score += 8
                if any(t in kw.lower() for kw in r["keywords"]):
                    score += 6
                if t in r["statutory_text"].lower():
                    score += 3
            if score > 0:
                scored_results.append((score, r))

        scored_results.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_results]

    @classmethod
    def render_page_image(cls, page_number: int, dpi: int = 150) -> Optional[bytes]:
        """
        Renders a 1-indexed page from the 194-page consolidated PDF to high-resolution PNG bytes.
        Operates completely offline using PyMuPDF.
        """
        if not os.path.exists(cls.PDF_PATH):
            return None

        p_idx = max(0, page_number - 1)
        try:
            doc = pymupdf.open(cls.PDF_PATH)
            if p_idx >= len(doc):
                return None
            page = doc[p_idx]
            pix = page.get_pixmap(dpi=dpi)
            return pix.tobytes("png")
        except Exception as e:
            print(f"Error rendering PDF page {page_number}: {e}")
            return None

    @classmethod
    def export_index_json(cls) -> str:
        """
        Exports the indexed legal metrology statutory database to JSON.
        """
        os.makedirs(os.path.dirname(cls.INDEX_JSON_PATH), exist_ok=True)
        with open(cls.INDEX_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump({
                "source_document": "legal_metrology_rules_consolidated.pdf",
                "total_pages": cls.get_total_pages(),
                "indexed_rules_count": len(cls.STATUTORY_INDEX),
                "rules": cls.STATUTORY_INDEX
            }, f, indent=2)
        return cls.INDEX_JSON_PATH
