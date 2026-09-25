import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.seed.seed_data import seed_database

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database()

def test_login_flow():
    response = client.post("/api/v1/auth/login", json={
        "email": "inspector@labelguard.gov.in",
        "password": "Inspector@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "INSPECTOR"
    assert data["badge_number"] == "LM-INS-104"

def test_dashboard_metrics():
    # Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "inspector@labelguard.gov.in",
        "password": "Inspector@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res.status_code == 200
    summary = res.json()
    assert summary["total_inspections"] >= 1
    assert summary["total_products_scanned"] >= 2
    assert "violations_by_category" in summary

def test_inspection_retrieval_and_products():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "inspector@labelguard.gov.in",
        "password": "Inspector@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    insps = client.get("/api/v1/inspections", headers=headers).json()
    assert len(insps) > 0
    insp = insps[0]
    assert "INS-" in insp["inspection_number"]
    assert len(insp["products"]) >= 1

def test_officer_decision_and_status_update():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "inspector@labelguard.gov.in",
        "password": "Inspector@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get product 1 findings
    findings = client.get("/api/v1/compliance/findings/1", headers=headers).json()
    assert len(findings) > 0
    first_finding = findings[0]

    # Submit official confirmation
    dec_res = client.post(f"/api/v1/compliance/review/{first_finding['id']}", json={
        "finding_id": first_finding["id"],
        "decision": "CONFIRMED_VIOLATION",
        "officer_remarks": "Verified non-standard unit 'gm' physically on package in violation of Rule 13."
    }, headers=headers)
    assert dec_res.status_code == 200
    assert dec_res.json()["decision"] == "CONFIRMED_VIOLATION"

    # Verify product compliance status updated to CONFIRMED_NON_COMPLIANCE
    prod = client.get("/api/v1/products/1", headers=headers).json()
    assert prod["compliance_status"] == "CONFIRMED_NON_COMPLIANCE"

def test_pdf_report_generation():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "inspector@labelguard.gov.in",
        "password": "Inspector@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    rep_res = client.post("/api/v1/reports/generate", json={
        "inspection_id": 1,
        "report_format": "PDF"
    }, headers=headers)
    assert rep_res.status_code == 200
    rep_data = rep_res.json()
    assert os.path.exists(rep_data["file_path"])
    assert rep_data["file_path"].endswith(".pdf")
