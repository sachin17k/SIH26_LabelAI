from typing import Dict, Any, List, Optional
import math

class ReadabilityAnalyzer:
    """
    Implements two-level readability and font-size analysis for Legal Metrology.
    
    Level 1: Readability estimation via CV & OCR metrics (blur, contrast, confidence).
    Level 2: Calibrated physical font-size measurement using known reference or package dimensions.
    """

    @staticmethod
    def calculate_readability_score(
        blur_score: float,
        contrast: float,
        ocr_confidence: float,
        detected_text_length: int
    ) -> Dict[str, Any]:
        """
        Level 1: Computes a unified 0-100 readability score and qualitative grade.
        """
        # 1. Blur factor (0..35 pts): Laplacian variance normalized (150+ is optimal)
        blur_factor = min(35.0, (blur_score / 150.0) * 35.0)
        
        # 2. Contrast factor (0..25 pts): Grayscale std dev (50+ is strong contrast)
        contrast_factor = min(25.0, (contrast / 50.0) * 25.0)
        
        # 3. OCR Confidence factor (0..30 pts): OCR confidence 0.0 to 1.0
        conf_factor = min(30.0, ocr_confidence * 30.0)
        
        # 4. Text density factor (0..10 pts)
        density_factor = 10.0 if detected_text_length > 30 else (detected_text_length / 30.0) * 10.0
        
        raw_score = blur_factor + contrast_factor + conf_factor + density_factor
        score = max(0.0, min(100.0, round(raw_score, 1)))
        
        if score >= 75.0:
            grade = "HIGH"
        elif score >= 50.0:
            grade = "MEDIUM"
        else:
            grade = "LOW"
            
        return {
            "readability_score": score,
            "readability_grade": grade,
            "blur_contribution": round(blur_factor, 1),
            "contrast_contribution": round(contrast_factor, 1),
            "confidence_contribution": round(conf_factor, 1)
        }

    @staticmethod
    def evaluate_physical_font_size(
        net_quantity_val: Optional[float],
        net_quantity_unit: Optional[str],
        char_box_height_px: float,
        pixels_per_mm: Optional[float]
    ) -> Dict[str, Any]:
        """
        Level 2: Calibrated font size assessment against Legal Metrology Rules First Schedule.
        
        First Schedule Requirements:
        - Net Qty <= 50 g/ml: min 1.0 mm (numeral height)
        - 50 < Net Qty <= 200 g/ml: min 2.0 mm
        - 200 < Net Qty <= 1000 g/ml: min 4.0 mm
        - Net Qty > 1000 g/ml: min 6.0 mm
        """
        if not pixels_per_mm or pixels_per_mm <= 0:
            return {
                "status": "UNABLE_TO_ACCURATELY_DETERMINE",
                "estimated_mm": None,
                "required_mm": None,
                "details": "Calibration information (pixels per mm or reference marker) insufficient for physical font verification."
            }

        # Calculate physical height of characters in mm
        estimated_height_mm = round(char_box_height_px / pixels_per_mm, 2)
        
        # Determine requirement based on net quantity
        required_mm = 2.0  # default baseline
        if net_quantity_val is not None:
            norm_val = net_quantity_val
            unit = (net_quantity_unit or "").lower()
            if unit in ["kg", "l", "litre", "liter"]:
                norm_val = norm_val * 1000
            elif unit in ["mg"]:
                norm_val = norm_val / 1000
                
            if norm_val <= 50:
                required_mm = 1.0
            elif norm_val <= 200:
                required_mm = 2.0
            elif norm_val <= 1000:
                required_mm = 4.0
            else:
                required_mm = 6.0

        if estimated_height_mm >= required_mm:
            status = "PASS"
            details = f"Estimated numeral height {estimated_height_mm}mm satisfies required {required_mm}mm under First Schedule."
        elif estimated_height_mm >= (required_mm * 0.85):
            status = "POSSIBLE_ISSUE"
            details = f"Estimated numeral height {estimated_height_mm}mm is borderline below required {required_mm}mm. Officer verification advised."
        else:
            status = "POSSIBLE_ISSUE"
            details = f"Estimated numeral height {estimated_height_mm}mm violates required minimum {required_mm}mm under First Schedule."

        return {
            "status": status,
            "estimated_mm": estimated_height_mm,
            "required_mm": required_mm,
            "details": details
        }
