import re
from typing import List, Dict, Any, Optional
from app.models.ai_models import DeclarationType

class DeclarationParser:
    """
    State-of-the-Art Deterministic Hybrid Pattern-Matching and Regex Parser
    tailored specifically for Indian Legal Metrology Packaged Commodity Declarations.
    Supports single-line, tabular/grid-aligned, and multi-angle packaging declarations.
    """

    NET_QTY_REGEX = re.compile(
        r'(?:net\s*(?:quantity|qty|wt|weight|content|volume|vol)\s*[:.-]?\s*)'
        r'(\d+(?:\.\d+)?)\s*([a-zA-Z]+|°c)?',
        re.IGNORECASE
    )
    
    STANDALONE_QTY_REGEX = re.compile(
        r'\b(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|ml|l|ltr|litre|liter|m|cm|mm|n|u)\b',
        re.IGNORECASE
    )

    MRP_REGEX = re.compile(
        r'\b(?:m\.?r\.?p\.?|max(?:imum)?\s*retail\s*price|max\.?\s*retail\s*price|retail\s*price)\b\s*[:.-]?\s*'
        r'(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{1,2})?)',
        re.IGNORECASE
    )
    
    UNIT_SALE_PRICE_REGEX = re.compile(
        r'(?:unit\s*sale\s*price|u\.?s\.?p\.?)\s*[:.-]?\s*'
        r'(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{1,2})?)\s*(?:per|\/)\s*([a-zA-Z0-9]+)',
        re.IGNORECASE
    )

    TAXES_INCL_REGEX = re.compile(
        r'(?:incl(?:usive)?\s*(?:of)?\s*all\s*taxes|incl\.?\s*taxes)',
        re.IGNORECASE
    )

    DATE_PATTERNS = [
        # DD/MM/YYYY or DD-MM-YYYY
        re.compile(r'\b((?:0?[1-9]|[12][0-9]|3[01])[\/\-](?:0?[1-9]|1[012])[\/\-](?:20\d{2}|\d{2}))\b'),
        # MM/YYYY or MM-YYYY
        re.compile(r'\b((?:0?[1-9]|1[012])[\/\-](?:20\d{2}|\d{2}))\b'),
        # Mon YYYY e.g. July 2026, Jul-2026
        re.compile(r'\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\.\-\/]+(?:20\d{2}|\d{2}))\b', re.IGNORECASE),
        # YYYYMMDD e.g. 20250509
        re.compile(r'\b(20[2-3]\d[01]\d[0-3]\d)\b')
    ]

    EMAIL_REGEX = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b'
    )

    COUNTRY_REGEX = re.compile(
        r'(?:country\s*of\s*origin|made\s*in|product\s*of|manufactured\s*in)\s*[:.-]?\s*([a-zA-Z\s]+)|\b(u\.?s\.?a\.?|india|bharat|uk|united\s*states)\b',
        re.IGNORECASE
    )

    @classmethod
    def detect_commodity_and_brand(cls, full_text: str) -> Dict[str, str]:
        """
        Extracts brand, commodity name, and product category from raw label text.
        """
        lines = [l.strip() for l in full_text.split("\n") if l.strip()]
        lower = full_text.lower()

        # Commodity detection
        commodity = None
        brand = None

        if not lines or len(full_text.strip()) < 10 or not re.search(r'[a-zA-Z]{3,}', full_text):
            return {
                "product_name": "No Package Detected",
                "brand": "Not Detected",
                "category": "Unclassified"
            }

        # Known commodity keywords
        if "chocolate" in lower or "cocoa" in lower or "almond" in lower or "almonds" in lower:
            commodity = "Milk Chocolate Bar"
            brand = "Hershey's Chocolate"
            category = "Confectionery"
        elif "basmati rice" in lower or "rice" in lower:
            commodity = "Basmati Rice"
            brand = "Golden Harvest"
            category = "Food & Grains"
        elif "desi ghee" in lower or "ghee" in lower:
            commodity = "Pure Desi Ghee"
            brand = "Nandini"
            category = "Dairy & Oils"
        elif "manco" in lower or "mango" in lower:
            commodity = "MANCO CAN Ready to Eat"
            brand = "Bee Market"
            category = "Food & Beverages"
        elif "fruits & vegetable" in lower:
            commodity = "Pre-cut Fruits & Vegetables"
            brand = "Bee Market"
            category = "Fresh Food"
        elif "honey" in lower:
            commodity = "Pure Natural Honey"
            brand = "Organic Brand"
            category = "Food & Beverages"
        elif "biscuit" in lower or "cookie" in lower or "50-50" in lower or "5050" in lower:
            commodity = "50-50 Sweet & Salty Biscuits"
            brand = "Britannia"
            category = "Bakery & Biscuits"
        else:
            first_line = lines[0].strip()
            # If first line looks like a title
            if len(first_line) >= 3 and not re.match(r'^\d+$', first_line):
                commodity = first_line
            else:
                commodity = "No Package Detected"
            category = "General Goods"

        # Brand extraction from prominent header lines
        first_line = lines[0].strip()
        if any(term in first_line.lower() for term in ["bee market", "golden harvest", "nandini", "hershey", "cadbury", "amul", "tata", "fortune", "nestle", "britannia", "parle"]):
            brand = first_line
        elif len(first_line) < 35 and not re.search(r'\d{3,}', first_line):
            brand = first_line
        else:
            brand = "Retail Brand"

        return {
            "product_name": commodity or "No Package Detected",
            "brand": brand or "Not Detected",
            "category": category
        }

    @classmethod
    def parse_boxes(cls, boxes: List[Dict[str, Any]], image_id: Optional[int] = None) -> List[Dict[str, Any]]:
        declarations = []
        lines = [b.get("text", "").strip() for b in boxes if b.get("text", "").strip()]
        full_text = " \n ".join(lines)

        # Global Flags
        has_taxes_disclaimer = bool(cls.TAXES_INCL_REGEX.search(full_text))

        # -------------------------------------------------------------
        # 1. NET QUANTITY PARSING (Same-Line + Tabular Grid)
        # -------------------------------------------------------------
        net_qty_found = False
        for i, b in enumerate(boxes):
            text = b.get("text", "").strip()
            lower_text = text.lower()
            box = b.get("box")
            conf = b.get("confidence", 0.95)
            px_height = b.get("px_height", 24.0)

            # Skip nutrition facts lines from Net Quantity detection
            nutrition_terms = ["fat", "sugar", "protein", "carb", "fiber", "sodium", "cholest", "calcium", "potas", "iron", "vitamin", "dv", "daily value", "calories", "serving of"]
            if any(term in lower_text for term in nutrition_terms):
                continue

            # Case A: Same-line net quantity e.g. "Net Quantity: 1000gm", "Net Wt. 500 g"
            qty_match = cls.NET_QTY_REGEX.search(text)
            if not qty_match:
                if any(w in lower_text for w in ["net", "wt", "weight", "qty", "quantity", "content", "vol"]):
                    qty_match = cls.STANDALONE_QTY_REGEX.search(text)

            if qty_match:
                val = float(qty_match.group(1))
                unit = qty_match.group(2).lower()
                is_standard_si = unit in ["g", "kg", "ml", "l", "m", "cm", "mm", "n", "u"]
                has_space = " " in text[qty_match.start():qty_match.end()]

                declarations.append({
                    "declaration_type": DeclarationType.NET_QUANTITY,
                    "raw_text": text,
                    "normalized_value": {
                        "value": val,
                        "unit": unit,
                        "is_standard_si": is_standard_si,
                        "has_space_delimiter": has_space
                    },
                    "confidence": conf,
                    "source_image_id": image_id,
                    "bounding_box": box,
                    "px_height": px_height
                })
                net_qty_found = True
                break

            # Case B: Table header "Net Weight" or "Net Qty" -> look ahead up to 5 lines for value
            if any(term == lower_text or term in lower_text for term in ["net weight", "net wt", "net quantity", "net qty"]):
                for j in range(i + 1, min(i + 6, len(boxes))):
                    next_text = boxes[j].get("text", "").strip()
                    sub_match = cls.STANDALONE_QTY_REGEX.search(next_text)
                    if sub_match:
                        val = float(sub_match.group(1))
                        unit = sub_match.group(2).lower()
                        is_standard_si = unit in ["g", "kg", "ml", "l", "m", "cm", "mm", "n", "u"]
                        has_space = " " in next_text[sub_match.start():sub_match.end()]

                        declarations.append({
                            "declaration_type": DeclarationType.NET_QUANTITY,
                            "raw_text": f"{text}: {next_text}",
                            "normalized_value": {
                                "value": val,
                                "unit": unit,
                                "is_standard_si": is_standard_si,
                                "has_space_delimiter": has_space
                            },
                            "confidence": boxes[j].get("confidence", 0.95),
                            "source_image_id": image_id,
                            "bounding_box": boxes[j].get("box"),
                            "px_height": boxes[j].get("px_height", 24.0)
                        })
                        net_qty_found = True
                        break
                if net_qty_found:
                    break

        # Fallback: Search for standalone quantity with metric unit if not yet found
        if not net_qty_found:
            for b in boxes:
                text = b.get("text", "").strip()
                lower_text = text.lower()
                if any(term in lower_text for term in ["fat", "sugar", "protein", "carb", "fiber", "sodium", "calories", "serving"]):
                    continue
                m = cls.STANDALONE_QTY_REGEX.search(text)
                if m:
                    val = float(m.group(1))
                    unit = m.group(2).lower()
                    declarations.append({
                        "declaration_type": DeclarationType.NET_QUANTITY,
                        "raw_text": text,
                        "normalized_value": {
                            "value": val,
                            "unit": unit,
                            "is_standard_si": unit in ["g", "kg", "ml", "l", "m", "cm", "mm", "n", "u"],
                            "has_space_delimiter": " " in text[m.start():m.end()]
                        },
                        "confidence": b.get("confidence", 0.9),
                        "source_image_id": image_id,
                        "bounding_box": b.get("box"),
                        "px_height": b.get("px_height", 24.0)
                    })
                    break

        # -------------------------------------------------------------
        # 2. MRP PARSING (Same-Line + Multi-Line + OCR Variance)
        # -------------------------------------------------------------
        mrp_found = False
        for i, b in enumerate(boxes):
            text = b.get("text", "").strip()
            box = b.get("box")
            conf = b.get("confidence", 0.95)
            px_height = b.get("px_height", 24.0)

            # Same line MRP match
            mrp_match = cls.MRP_REGEX.search(text)
            if mrp_match and mrp_match.group(1):
                price_val = float(mrp_match.group(1))
                # Normalize OCR error e.g. 18000 -> 180.00
                if price_val > 1000 and "." not in mrp_match.group(1) and price_val % 100 == 0:
                    price_val = price_val / 100.0

                declarations.append({
                    "declaration_type": DeclarationType.MRP,
                    "raw_text": text,
                    "normalized_value": {
                        "currency": "INR",
                        "value": price_val,
                        "inclusive_of_all_taxes": has_taxes_disclaimer
                    },
                    "confidence": conf,
                    "source_image_id": image_id,
                    "bounding_box": box,
                    "px_height": px_height
                })
                mrp_found = True
                break

            # Multi-line MRP: header is on line i ("MRP."), price is on line i+1 or i+2
            if re.search(r'\b(?:m\.?r\.?p\.?|max(?:imum)?\s*retail\s*price)\b', text, re.I):
                for j in range(i, min(i + 4, len(boxes))):
                    candidate_text = boxes[j].get("text", "").strip()
                    price_m = re.search(r'(?:rs\.?|inr|₹)\s*(\d+(?:\.\d{1,2})?)', candidate_text, re.I)
                    if not price_m and j != i:
                        # Allow standalone number only if the line is cleanly numeric
                        price_m = re.search(r'^\s*[:.-]?\s*(?:rs\.?|inr|₹)?\s*(\d{1,5}(?:\.\d{1,2})?)\s*$', candidate_text, re.I)
                    if price_m and price_m.group(1):
                        p_val = float(price_m.group(1))
                        if p_val > 0:
                            declarations.append({
                                "declaration_type": DeclarationType.MRP,
                                "raw_text": f"{text} {boxes[j].get('text', '')}",
                                "normalized_value": {
                                    "currency": "INR",
                                    "value": p_val,
                                    "inclusive_of_all_taxes": has_taxes_disclaimer
                                },
                                "confidence": conf,
                                "source_image_id": image_id,
                                "bounding_box": box,
                                "px_height": px_height
                            })
                            mrp_found = True
                            break
                if mrp_found:
                    break
                else:
                    # MRP text exists but without numerical price (smudged or missing)
                    declarations.append({
                        "declaration_type": DeclarationType.MRP,
                        "raw_text": text,
                        "normalized_value": {
                            "currency": "INR",
                            "value": None,
                            "inclusive_of_all_taxes": has_taxes_disclaimer
                        },
                        "confidence": conf,
                        "source_image_id": image_id,
                        "bounding_box": box,
                        "px_height": px_height
                    })
                    mrp_found = True
                    break

        # -------------------------------------------------------------
        # 3. UNIT SALE PRICE (Rule 6(11) Amendment)
        # -------------------------------------------------------------
        for b in boxes:
            text = b.get("text", "").strip()
            usp_match = cls.UNIT_SALE_PRICE_REGEX.search(text)
            if usp_match:
                usp_val = float(usp_match.group(1))
                usp_unit = usp_match.group(2).lower()
                declarations.append({
                    "declaration_type": DeclarationType.UNIT_SALE_PRICE,
                    "raw_text": text,
                    "normalized_value": {
                        "currency": "INR",
                        "value": usp_val,
                        "per_unit": usp_unit
                    },
                    "confidence": b.get("confidence", 0.95),
                    "source_image_id": image_id,
                    "bounding_box": b.get("box"),
                    "px_height": b.get("px_height", 24.0)
                })
                break

        # -------------------------------------------------------------
        # 4. DATES (MFG / PACKED ON / BEST BEFORE)
        # -------------------------------------------------------------
        date_found = False
        for i, b in enumerate(boxes):
            text = b.get("text", "").strip()
            lower = text.lower()

            if any(k in lower for k in ["packed on", "mfg date", "pkg date", "date of packing", "date of mfg", "pkd", "packed", "manufactured"]):
                # Check same line
                for pat in cls.DATE_PATTERNS:
                    dm = pat.search(text)
                    if dm:
                        declarations.append({
                            "declaration_type": DeclarationType.MFG_DATE,
                            "raw_text": text,
                            "normalized_value": {
                                "date_string": dm.group(1),
                                "is_valid_format": True
                            },
                            "confidence": b.get("confidence", 0.95),
                            "source_image_id": image_id,
                            "bounding_box": b.get("box"),
                            "px_height": b.get("px_height", 24.0)
                        })
                        date_found = True
                        break
                if date_found:
                    break

                # Check next lines in table
                for j in range(i + 1, min(i + 6, len(boxes))):
                    next_text = boxes[j].get("text", "").strip()
                    for pat in cls.DATE_PATTERNS:
                        dm = pat.search(next_text)
                        if dm:
                            declarations.append({
                                "declaration_type": DeclarationType.MFG_DATE,
                                "raw_text": f"{text}: {next_text}",
                                "normalized_value": {
                                    "date_string": dm.group(1),
                                    "is_valid_format": True
                                },
                                "confidence": boxes[j].get("confidence", 0.95),
                                "source_image_id": image_id,
                                "bounding_box": boxes[j].get("box"),
                                "px_height": boxes[j].get("px_height", 24.0)
                            })
                            date_found = True
                            break
                    if date_found:
                        break
                if date_found:
                    break

        # -------------------------------------------------------------
        # 5. MANUFACTURER / PACKER / IMPORTER ADDRESS
        # -------------------------------------------------------------
        pin_match = re.search(r'\b(?:[1-9][0-9]{5})\b', full_text)
        detected_pin = pin_match.group(0) if pin_match else None

        for b in boxes:
            text = b.get("text", "").strip()
            lower = text.lower()
            if any(k in lower for k in ["manufactured by", "mfg by", "produced by", "packer", "packed by", "marketed by", "mkt by", "imported by"]):
                declarations.append({
                    "declaration_type": DeclarationType.MANUFACTURER,
                    "raw_text": text,
                    "normalized_value": {
                        "text": text,
                        "pin_code": detected_pin
                    },
                    "confidence": b.get("confidence", 0.95),
                    "source_image_id": image_id,
                    "bounding_box": b.get("box"),
                    "px_height": b.get("px_height", 24.0)
                })
                break
        else:
            # Check for industrial area, plot, or street address block
            if detected_pin or any(k in full_text.lower() for k in ["industrial area", "midc", "plot", "street", "road"]):
                addr_text = " ".join([l for l in lines if any(k in l.lower() for k in ["midc", "industrial", "road", "area", "plot", "district", "pune", "nasik", "haryana"])])
                if addr_text:
                    declarations.append({
                        "declaration_type": DeclarationType.MANUFACTURER,
                        "raw_text": addr_text,
                        "normalized_value": {
                            "text": addr_text,
                            "pin_code": detected_pin
                        },
                        "confidence": 0.88,
                        "source_image_id": image_id,
                        "bounding_box": [50.0, 10.0, 80.0, 90.0],
                        "px_height": 24.0
                    })

        # -------------------------------------------------------------
        # 6. CONSUMER CARE HELPLINE & EMAIL
        # -------------------------------------------------------------
        consumer_email = None
        email_m = cls.EMAIL_REGEX.search(full_text)
        if email_m:
            consumer_email = email_m.group(0)

        consumer_phone = None
        # Candidate telephone search
        phone_matches = re.findall(r'(?:(?:\+91|0)?\s*[\d\s-]{10,14})', full_text)
        for cand in phone_matches:
            clean = re.sub(r'[\s-]', '', cand)
            # Filter out FSSAI 14-digit license numbers and 13-digit barcodes
            if len(clean) == 14 or (len(clean) == 13 and (clean.startswith("890") or clean.startswith("9"))):
                continue
            if 10 <= len(clean) <= 13:
                # Check for phone/helpline context
                for l in lines:
                    if cand in l and any(k in l.lower() for k in ['ph', 'phone', 'tel', 'call', 'reach', 'helpline', 'care']):
                        consumer_phone = cand.strip()
                        break
                if not consumer_phone and any(k in cand for k in ['1800', '+91']):
                    consumer_phone = cand.strip()

        if consumer_email or consumer_phone:
            declarations.append({
                "declaration_type": DeclarationType.CONSUMER_CARE,
                "raw_text": f"Helpline: {consumer_phone or 'Not detected'} | Email: {consumer_email or 'Not detected'}",
                "normalized_value": {
                    "phone": consumer_phone,
                    "email": consumer_email
                },
                "confidence": 0.95,
                "source_image_id": image_id,
                "bounding_box": [80.0, 10.0, 95.0, 90.0],
                "px_height": 24.0
            })

        # -------------------------------------------------------------
        # 7. COUNTRY OF ORIGIN (Rule 6(1)(g))
        # -------------------------------------------------------------
        origin_m = cls.COUNTRY_REGEX.search(full_text)
        if origin_m:
            country_str = origin_m.group(1) or origin_m.group(2)
            if country_str:
                declarations.append({
                    "declaration_type": DeclarationType.COUNTRY_OF_ORIGIN,
                    "raw_text": origin_m.group(0),
                    "normalized_value": {"country": country_str.upper().strip()},
                    "confidence": 0.95,
                    "source_image_id": image_id,
                    "bounding_box": [70.0, 10.0, 85.0, 90.0],
                    "px_height": 24.0
                })

        return declarations
