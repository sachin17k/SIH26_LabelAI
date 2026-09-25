from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.auth_models import UserRole

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str
    email: str
    badge_number: Optional[str] = None
    jurisdiction: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.INSPECTOR
    badge_number: Optional[str] = None
    jurisdiction: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    badge_number: Optional[str] = None
    jurisdiction: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    user_email: Optional[str]
    action: str
    target_entity: Optional[str]
    target_id: Optional[str]
    details: Optional[dict]
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
