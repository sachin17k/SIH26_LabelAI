from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api import (
    auth, users, inspections, products, images,
    analysis, compliance, rules, legal_docs, reports, dashboard
)
from app.seed.seed_data import seed_database

# Create all database tables on application startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Assisted Legal Metrology Packaged Commodity Compliance Inspection Platform (LabelGuard AI)",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
api_v1 = settings.API_V1_STR
app.include_router(auth.router, prefix=api_v1)
app.include_router(users.router, prefix=api_v1)
app.include_router(inspections.router, prefix=api_v1)
app.include_router(products.router, prefix=api_v1)
app.include_router(images.router, prefix=api_v1)
app.include_router(analysis.router, prefix=api_v1)
app.include_router(compliance.router, prefix=api_v1)
app.include_router(rules.router, prefix=api_v1)
app.include_router(legal_docs.router, prefix=api_v1)
app.include_router(reports.router, prefix=api_v1)
app.include_router(dashboard.router, prefix=api_v1)

@app.on_event("startup")
def startup_event():
    # Automatically seed default rules and demo accounts on first run
    seed_database()

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "LabelGuard AI Backend",
        "version": settings.VERSION
    }
