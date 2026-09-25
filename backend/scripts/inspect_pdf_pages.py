import sys
import os
import pymupdf

sys.path.insert(0, os.path.abspath('d:/sri/labelai/backend'))
from app.services.vision.ocr_engine import OCREngine

pdf_path = "d:/sri/labelai/legal_documents/legal_metrology_rules_consolidated.pdf"
doc = pymupdf.open(pdf_path)
print(f"Total Pages in PDF: {len(doc)}")

for pno in [0, 1, 2, 3, 4, 10, 20]:
    page = doc[pno]
    pix = page.get_pixmap(dpi=150)
    tmp_path = f"d:/sri/labelai/backend/scripts/temp_page_{pno}.png"
    pix.save(tmp_path)
    res = OCREngine.run_ocr(tmp_path)
    if os.path.exists(tmp_path):
        os.remove(tmp_path)
    print(f"\n==================== PAGE {pno + 1} ====================")
    lines = res['raw_text'].split('\n')
    print(f"Total lines: {len(lines)}")
    for l in lines[:15]:
        if l.strip():
            print("  ", l.strip())
