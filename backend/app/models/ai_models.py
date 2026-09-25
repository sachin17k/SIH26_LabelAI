import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class DeclarationType(str, enum.Enum):
    PRODUCT_NAME = "PRODUCT_NAME"
    MANUFACTURER = "MANUFACTURER"
    PACKER = "PACKER"
    IMPORTER = "IMPORTER"
    NET_QUANTITY = "NET_QUANTITY"
    MRP = "MRP"
    UNIT_SALE_PRICE = "UNIT_SALE_PRICE"
    MFG_DATE = "MFG_DATE"
    PACKING_DATE = "PACKING_DATE"
    IMPORT_DATE = "IMPORT_DATE"
    EXPIRY_DATE = "EXPIRY_DATE"
    CONSUMER_CARE = "CONSUMER_CARE"
    COUNTRY_OF_ORIGIN = "COUNTRY_OF_ORIGIN"
    GENERIC_NAME = "GENERIC_NAME"
    OTHER = "OTHER"

class OCRResult(Base):
    __tablename__ = "ocr_results"
    
    id = Column(Integer, primary_key=True, index=True)
    product_image_id = Column(Integer, ForeignKey("product_images.id"), nullable=False)
    raw_text = Column(Text, nullable=False)
    # Bounding boxes format: [ {"text": "...", "confidence": 0.98, "box": [ymin, xmin, ymax, xmax]}, ... ]
    boxes_json = Column(JSON, nullable=False)
    mean_confidence = Column(Float, default=0.0)
    engine_name = Column(String(50), default="PaddleOCR")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    image = relationship("ProductImage", back_populates="ocr_results")

class ExtractedDeclaration(Base):
    __tablename__ = "extracted_declarations"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    declaration_type = Column(Enum(DeclarationType), nullable=False)
    raw_text = Column(Text, nullable=False)
    # Normalized value holds structured fields: e.g. {"value": 500, "unit": "g"} or {"currency": "INR", "value": 120.0, "taxes_included": True}
    normalized_value = Column(JSON, nullable=False)
    confidence = Column(Float, default=0.0)
    source_image_id = Column(Integer, ForeignKey("product_images.id"), nullable=True)
    bounding_box = Column(JSON, nullable=True) # [ymin, xmin, ymax, xmax] relative 0..100% or absolute px
    extraction_method = Column(String(50), default="HYBRID_REGEX_PATTERN") # HYBRID_REGEX_PATTERN, NLP, OCR_PROXIMITY
    created_at = Column(DateTime, default=datetime.utcnow)
