from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.auth_models import User, UserRole
from app.models.rule_models import LegalDocument, Amendment
from app.schemas.compliance_schemas import LegalDocumentCreate, LegalDocumentOut
from app.api.auth import get_current_user, require_role

router = APIRouter(prefix="/legal-documents", tags=["Legal Documents & Gazette Repository"])

@router.get("", response_model=List[LegalDocumentOut])
def list_legal_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(LegalDocument).order_by(LegalDocument.effective_date.desc()).all()

@router.post("", response_model=LegalDocumentOut)
def create_legal_document(
    doc_in: LegalDocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    doc = LegalDocument(
        title=doc_in.title,
        document_type=doc_in.document_type,
        notification_number=doc_in.notification_number,
        publication_date=doc_in.publication_date,
        effective_date=doc_in.effective_date,
        description=doc_in.description
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc
