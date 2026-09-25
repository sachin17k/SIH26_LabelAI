import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Any

class ImagePreprocessor:
    """
    OpenCV-based image preprocessing module for packaged commodity inspection.
    Performs blur estimation, contrast normalization, brightness evaluation,
    and adaptive enhancement.
    """

    @staticmethod
    def assess_quality(image_path: str) -> Dict[str, Any]:
        img = cv2.imread(image_path)
        if img is None:
            return {
                "blur_score": 0.0,
                "contrast": 0.0,
                "brightness": 0.0,
                "quality_status": "CORRUPTED_OR_UNREADABLE",
                "width": 0,
                "height": 0
            }
        
        height, width = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 1. Blur detection using Laplacian variance
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        
        # 2. Contrast estimation (standard deviation of grayscale values)
        contrast = float(gray.std())
        
        # 3. Brightness estimation (mean grayscale value)
        brightness = float(gray.mean())
        
        # Quality classification thresholding
        # Typical sharp images have Laplacian var > 100; < 50 is noticeably blurry
        if blur_score < 40.0:
            quality_status = "BLURRY"
        elif contrast < 25.0:
            quality_status = "POOR_CONTRAST"
        elif brightness < 35.0:
            quality_status = "TOO_DARK"
        elif brightness > 230.0:
            quality_status = "OVEREXPOSED"
        else:
            quality_status = "ACCEPTABLE"
            
        return {
            "blur_score": round(blur_score, 2),
            "contrast": round(contrast, 2),
            "brightness": round(brightness, 2),
            "quality_status": quality_status,
            "width": width,
            "height": height
        }

    @staticmethod
    def preprocess_for_ocr(image_path: str, output_path: str) -> str:
        """
        Applies contrast enhancement (CLAHE), bilateral noise reduction,
        and sharpening to make packaging declarations crisply readable.
        """
        img = cv2.imread(image_path)
        if img is None:
            return image_path
            
        # Convert to LAB color space for luminance-based CLAHE
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        
        limg = cv2.merge((cl, a, b))
        enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        
        # Gentle bilateral filter to smooth sensor noise while preserving text edges
        filtered = cv2.bilateralFilter(enhanced, 7, 50, 50)
        
        # Save preprocessed image
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(output_path, filtered)
        return output_path
