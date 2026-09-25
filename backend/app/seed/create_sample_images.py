import os
from PIL import Image, ImageDraw, ImageFont
from app.core.config import settings

def create_demo_packaging():
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Non-compliant Rice Front Image (Non-standard "1000gm" + missing USP)
    img1 = Image.new("RGB", (800, 1000), color=(245, 243, 235))
    draw1 = ImageDraw.Draw(img1)
    
    # Border & Branding
    draw1.rectangle([(20, 20), (780, 980)], outline=(180, 140, 60), width=4)
    draw1.rectangle([(40, 40), (760, 220)], fill=(210, 170, 90))
    
    # Text
    draw1.text((160, 80), "GOLDEN HARVEST", fill=(255, 255, 255))
    draw1.text((190, 140), "PREMIUM BASMATI RICE", fill=(40, 40, 40))
    
    # Declarations with known non-compliance: "Net Qty: 1000gm" (illegal under Rule 13)
    draw1.rectangle([(60, 600), (740, 720)], fill=(255, 255, 255), outline=(200, 200, 200))
    draw1.text((80, 620), "Net Quantity: 1000gm", fill=(20, 20, 20))
    draw1.text((80, 660), "MRP Rs. 180.00 (inclusive of all taxes)", fill=(20, 20, 20))

    fpath1 = settings.UPLOAD_DIR / "sample_rice_front.jpg"
    img1.save(fpath1, quality=95)
    
    # Sidecar txt for OCR engine
    with open(settings.UPLOAD_DIR / "sample_rice_front.txt", "w", encoding="utf-8") as f:
        f.write("GOLDEN HARVEST\nPREMIUM BASMATI RICE\nNet Quantity: 1000gm\nMRP Rs. 180.00 (inclusive of all taxes)\n")

    # 2. Rice Back Image (Manufacturer + Date + Consumer Care)
    img2 = Image.new("RGB", (800, 1000), color=(250, 250, 250))
    draw2 = ImageDraw.Draw(img2)
    draw2.rectangle([(20, 20), (780, 980)], outline=(200, 200, 200), width=3)
    draw2.text((60, 60), "STATUTORY DECLARATIONS", fill=(20, 20, 20))
    draw2.text((60, 120), "Manufactured & Packed by: Golden Harvest Agro Ltd.", fill=(40, 40, 40))
    draw2.text((60, 160), "Plot 108, Industrial Area, Sonipat, Haryana - 131001", fill=(40, 40, 40))
    draw2.text((60, 220), "Month & Year of Packing: 07/2026", fill=(40, 40, 40))
    draw2.text((60, 280), "Consumer Care Helpline: 1800-200-8899", fill=(40, 40, 40))
    draw2.text((60, 320), "Email: care@goldenharvest.in", fill=(40, 40, 40))
    draw2.text((60, 380), "Country of Origin: India", fill=(40, 40, 40))

    fpath2 = settings.UPLOAD_DIR / "sample_rice_back.jpg"
    img2.save(fpath2, quality=95)
    with open(settings.UPLOAD_DIR / "sample_rice_back.txt", "w", encoding="utf-8") as f:
        f.write("STATUTORY DECLARATIONS\nManufactured & Packed by: Golden Harvest Agro Ltd.\nPlot 108, Industrial Area, Sonipat, Haryana - 131001\nMonth & Year of Packing: 07/2026\nConsumer Care Helpline: 1800-200-8899\nEmail: care@goldenharvest.in\nCountry of Origin: India\n")

    # 3. Ghee Front Image (Fully Compliant: 500 ml standard SI unit)
    img3 = Image.new("RGB", (800, 1000), color=(255, 250, 230))
    draw3 = ImageDraw.Draw(img3)
    draw3.rectangle([(20, 20), (780, 980)], outline=(220, 180, 50), width=4)
    draw3.text((220, 80), "NANDINI", fill=(200, 40, 40))
    draw3.text((180, 140), "PURE DESI GHEE", fill=(40, 40, 40))
    draw3.text((80, 500), "Net Quantity: 500 ml", fill=(20, 20, 20))
    draw3.text((80, 560), "MRP: Rs. 310.00 (incl. of all taxes)", fill=(20, 20, 20))
    draw3.text((80, 620), "Mfg Date: 08/2026", fill=(20, 20, 20))
    draw3.text((80, 680), "Manufactured by: Karnataka Milk Federation, Bengaluru", fill=(20, 20, 20))
    draw3.text((80, 740), "Consumer Care: 1800-425-8030 | care@kmfnandini.coop", fill=(20, 20, 20))
    draw3.text((80, 800), "Country of Origin: India", fill=(20, 20, 20))

    fpath3 = settings.UPLOAD_DIR / "sample_ghee_front.jpg"
    img3.save(fpath3, quality=95)
    with open(settings.UPLOAD_DIR / "sample_ghee_front.txt", "w", encoding="utf-8") as f:
        f.write("NANDINI\nPURE DESI GHEE\nNet Quantity: 500 ml\nMRP: Rs. 310.00 (incl. of all taxes)\nMfg Date: 08/2026\nManufactured by: Karnataka Milk Federation, Bengaluru\nConsumer Care: 1800-425-8030 | care@kmfnandini.coop\nCountry of Origin: India\n")

    print("Demo package image assets generated in uploads directory.")

if __name__ == "__main__":
    create_demo_packaging()
