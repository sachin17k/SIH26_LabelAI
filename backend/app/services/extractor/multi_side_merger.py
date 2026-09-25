from typing import List, Dict, Any
from app.models.ai_models import DeclarationType

class MultiSideMerger:
    """
    Synthesizes declarations collected across multiple sides/angles of a packaged commodity.
    Detects cross-side consistency and conflicts (e.g. differing MRPs or conflicting Net Weights).
    """

    @staticmethod
    def merge_declarations(all_extracted: List[Dict[str, Any]]) -> Dict[str, Any]:
        merged_profile = {
            "net_quantity": None,
            "mrp": None,
            "unit_sale_price": None,
            "mfg_date": None,
            "manufacturer": None,
            "packer": None,
            "importer": None,
            "consumer_care": None,
            "country_of_origin": None,
            "conflicts": [],
            "all_declarations_count": len(all_extracted)
        }

        # Track multiple occurrences to detect conflicts
        quantities_seen = []
        mrps_seen = []
        dates_seen = []

        for decl in all_extracted:
            dtype = decl.get("declaration_type")
            val = decl.get("normalized_value")
            
            if dtype == DeclarationType.NET_QUANTITY:
                quantities_seen.append(val)
                if not merged_profile["net_quantity"]:
                    merged_profile["net_quantity"] = val
                    
            elif dtype == DeclarationType.MRP:
                mrps_seen.append(val)
                if not merged_profile["mrp"]:
                    merged_profile["mrp"] = val
                    
            elif dtype == DeclarationType.UNIT_SALE_PRICE:
                if not merged_profile["unit_sale_price"]:
                    merged_profile["unit_sale_price"] = val
                    
            elif dtype == DeclarationType.MFG_DATE:
                dates_seen.append(val)
                if not merged_profile["mfg_date"]:
                    merged_profile["mfg_date"] = val
                    
            elif dtype == DeclarationType.MANUFACTURER:
                if not merged_profile["manufacturer"]:
                    merged_profile["manufacturer"] = val
                    
            elif dtype == DeclarationType.PACKER:
                if not merged_profile["packer"]:
                    merged_profile["packer"] = val
                    
            elif dtype == DeclarationType.IMPORTER:
                if not merged_profile["importer"]:
                    merged_profile["importer"] = val
                    
            elif dtype == DeclarationType.CONSUMER_CARE:
                if not merged_profile["consumer_care"]:
                    merged_profile["consumer_care"] = val
                else:
                    # Merge phone and email if found on different images
                    existing = merged_profile["consumer_care"]
                    if not existing.get("phone") and val.get("phone"):
                        existing["phone"] = val.get("phone")
                    if not existing.get("email") and val.get("email"):
                        existing["email"] = val.get("email")
                        
            elif dtype == DeclarationType.COUNTRY_OF_ORIGIN:
                if not merged_profile["country_of_origin"]:
                    merged_profile["country_of_origin"] = val

        # Conflict Detection:
        # 1. Conflicting MRP values
        unique_mrp_values = list(set([m.get("value") for m in mrps_seen if m and m.get("value") is not None]))
        if len(unique_mrp_values) > 1:
            merged_profile["conflicts"].append({
                "type": "CONFLICTING_MRP",
                "values": unique_mrp_values,
                "description": f"Multiple distinct MRP declarations detected on package: {unique_mrp_values}"
            })

        # 2. Conflicting Net Quantities
        unique_qty_pairs = list(set([(q.get("value"), q.get("unit")) for q in quantities_seen if q and q.get("value") is not None]))
        if len(unique_qty_pairs) > 1:
            merged_profile["conflicts"].append({
                "type": "CONFLICTING_QUANTITY",
                "values": [f"{v} {u}" for v, u in unique_qty_pairs],
                "description": f"Differing Net Quantity values detected across package sides: {unique_qty_pairs}"
            })

        # Flat Display Helpers for UI
        mrp_obj = merged_profile.get("mrp")
        if mrp_obj and mrp_obj.get("value") is not None:
            merged_profile["mrp_raw"] = f"₹ {mrp_obj['value']:.2f}" + (" (Incl. of all taxes)" if mrp_obj.get("inclusive_of_all_taxes") else "")
        elif mrp_obj:
            merged_profile["mrp_raw"] = "MRP Header Detected (Price Omitted or Smudged)"
        else:
            merged_profile["mrp_raw"] = None

        qty_obj = merged_profile.get("net_quantity")
        if qty_obj:
            merged_profile["net_quantity_raw"] = f"{qty_obj.get('value')} {qty_obj.get('unit')}"
        else:
            merged_profile["net_quantity_raw"] = None

        date_obj = merged_profile.get("mfg_date")
        merged_profile["date_raw"] = date_obj.get("date_string") if date_obj else None

        mfg_obj = merged_profile.get("manufacturer") or merged_profile.get("packer") or merged_profile.get("importer")
        merged_profile["manufacturer_name"] = mfg_obj.get("text") if mfg_obj else None

        care_obj = merged_profile.get("consumer_care")
        merged_profile["consumer_care_phone"] = care_obj.get("phone") if care_obj else None
        merged_profile["consumer_care_email"] = care_obj.get("email") if care_obj else None

        origin_obj = merged_profile.get("country_of_origin")
        merged_profile["country_of_origin_raw"] = origin_obj.get("country") if origin_obj else None

        return merged_profile
