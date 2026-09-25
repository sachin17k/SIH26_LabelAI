import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, JSON
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    INSPECTOR = "INSPECTOR"
    SUPERVISOR = "SUPERVISOR"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.INSPECTOR, nullable=False)
    badge_number = Column(String(100), unique=True, nullable=True)
    jurisdiction = Column(String(255), nullable=True) # e.g., "Karnataka State - Bangalore Urban"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False) # e.g., "INSPECTION_CREATED", "FINDING_CONFIRMED", "RULE_UPDATED"
    target_entity = Column(String(100), nullable=True)
    target_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
