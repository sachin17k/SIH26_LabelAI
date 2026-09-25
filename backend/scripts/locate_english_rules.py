import os
import sys
import pymupdf

sys.path.insert(0, os.path.abspath('d:/sri/labelai/backend'))
from app.services.vision.ocr_engine import OCREngine

pdf_path = "d:/sri/labelai/legal_documents/legal_metrology_rules_consolidated.pdf"
doc = pymupdf.open(pdf_path)

print(f"Scanning pages for English Legal Metrology text...")

# Check pages from 20 to 60 in steps
for pno in range(20, min(70, len(doc))):
    page = doc[pno]
    pix = page.get_pixmap(dpi=150)
    tmp_path = f"d:/sri/labelai/backend/scripts/temp_scan_{pno}.png"
    pix.save(tmp_path)
    res = OCREngine.run_ocr(tmp_path)
    if os.path.exists(tmp_path):
        os.remove(tmp_path)
    
    text = res['raw_text']
    # Check if this page contains significant English text
    english_keywords = ["MINISTRY OF CONSUMER", "LEGAL METROLOGY", "PACKAGED COMMODITIES", "CHAPTER", "Rule", "retail package"]
    matches = [kw for kw in english_keywords if kw.lower() in text.lower()]
    if matches:
        print(f"Page {pno + 1}: Found matches: {matches}")
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        for l in lines[:10]:
            print("   |", l)
        print("---")
