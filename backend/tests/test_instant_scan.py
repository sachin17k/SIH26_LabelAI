import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_instant_scan_sample_image():
    # Authenticate as inspector
    resp = client.post("/api/v1/auth/login", json={
        "email": "inspector@labelguard.gov.in",
        "password": "Inspector@123"
    })
    assert resp.status_code == 200, f"Auth failed: {resp.text}"
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sample_path = os.path.abspath("sample_packages/sample.png")
    if not os.path.exists(sample_path):
        sample_path = os.path.abspath("../sample_packages/sample.png")

    assert os.path.exists(sample_path), f"Sample image not found at {sample_path}"

    with open(sample_path, "rb") as f:
        files = [
            ("files", ("sample.png", f.read(), "image/png"))
        ]

    data = {
        "establishment_id": 1
    }

    scan_resp = client.post(
        "/api/v1/inspections/instant-scan",
        headers=headers,
        data=data,
        files=files
    )
    assert scan_resp.status_code == 200, f"Instant scan failed: {scan_resp.text}"
    res = scan_resp.json()
    assert "product_id" in res
    assert "inspection_id" in res
    assert "product_name" in res
    assert res["product_name"] == "Milk Chocolate Bar"
    assert "compliance_status" in res
    assert "findings_count" in res
    assert res["findings_count"] > 0
    print("\nInstant Scan Result Summary:")
    print("Detected Commodity:", res["product_name"])
    print("Detected Brand:", res["brand"])
    print("Compliance Status:", res["compliance_status"])
    print("Findings Count:", res["findings_count"])
