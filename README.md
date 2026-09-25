# LabelGuard AI
### AI-Assisted Legal Metrology Packaged Commodity Compliance Inspection Platform
*Built for Official Enforcement under the Legal Metrology Act, 2009 and Legal Metrology (Packaged Commodities) Rules, 2011*

---

## 1. Executive Summary & Problem Statement

Packaged commodities sold across retail stores, hypermarkets, warehouses, and e-commerce distribution centers in India must display mandatory statutory declarations under the **Legal Metrology Act, 2009** and the **Legal Metrology (Packaged Commodities) Rules, 2011** (together with 2017, 2021, and 2022 amendments).

Enforcement officers routinely encounter:
- Missing mandatory declarations (e.g., consumer care helpline, country of origin).
- Non-standard units of weight or measure (e.g., conjoined `"1000gm"`, `"gms"`, or `"cc"` in violation of Rule 13).
- Missing Unit Sale Price (USP) for commodities $\ge$ 1 kg or 1 L under Rule 6(11).
- Non-compliant MRP declarations missing the mandatory statutory disclaimer *"inclusive of all taxes"*.
- Inadequate numeral font sizes violating the First Schedule minimum height tables.
- Conflicting or dual declarations across package sides in violation of Rule 18.

**LabelGuard AI** is an official enforcement support platform engineered specifically for authorized Legal Metrology officers.

> **Statutory Doctrine**:
> ```
> AI detects and assists ──> Officer reviews ──> Officer confirms or rejects ──> System stores official legal result
> ```

---

## 2. System Architecture

```
                                  [ Authorized Official / Inspector / Supervisor / Admin ]
                                                             |
                                                             v
                                        +-----------------------------------------+
                                        |    React 18 + TypeScript + Tailwind     |
                                        |   (Official Government Portal & Canvas) |
                                        +--------------------+--------------------+
                                                             | REST (JWT / Bearer)
                                                             v
                                        +-----------------------------------------+
                                        |            FastAPI Backend              |
                                        |    Python 3.10+ / Pydantic v2 / Async   |
                                        +--+------------------+----------------+--+
                                           |                  |                |
                +--------------------------+                  |                +--------------------------+
                |                                             |                                           |
                v                                             v                                           v
+-------------------------------+             +-------------------------------+             +-------------------------------+
|       AI & Vision Engine      |             |   Compliance & Rule Engine    |             |    Document & Report Engine   |
| - OpenCV Preprocessing        |             | - Versioned Rules (2011-2026) |             | - ReportLab (Official PDF)    |
| - OCR (PaddleOCR / Spatial)   |             | - Multi-side Aggregation      |             | - python-docx (Show-Cause)    |
| - Normalized Bounding Boxes   |             | - Deterministic Validators    |             | - Tamper-evident SHA256 Hash  |
| - Readability & Font Estimator|             | - Officer-in-the-Loop Override|             | - Gazette Archive Ingestion   |
+---------------+---------------+             +---------------+---------------+             +-------------------------------+
                                                       |
                                                       v
                                        +-------------------------------+
                                        |      SQLAlchemy 2.0 ORM       |
                                        |   PostgreSQL / SQLite Dual    |
                                        +-------------------------------+
```

---

## 3. Core Modules & Innovations

1. **Multi-Side Package Aggregation**:
   Combines declarations detected across multiple package sides (*Front, Back, Left, Right, MRP Panel, Label Close-Up*) into a single unified declaration profile and cross-checks for conflicting declarations under Rule 18.
2. **Deterministic Hybrid Rule Engine**:
   Extracts and evaluates declarations against active versions of the Legal Metrology Rules based on the inspection date (no black-box hallucinations).
3. **Dual-Level Readability & Numeral Height**:
   - **Level 1**: Image blur (Laplacian variance), contrast, and OCR confidence scoring (0–100%).
   - **Level 2**: Calibrated physical font-size verification against the First Schedule numeral height tables (1mm to 6mm requirements based on net content).
4. **Interactive HTML5 Canvas Evidence Inspector**:
   Allows officers to click color-coded bounding boxes directly on high-resolution package images (*Green = Compliant, Yellow = Warning/Review, Red = Non-Compliant/Missing*).
5. **Tamper-Evident Reporting**:
   Generates official government inspection notices in PDF (`ReportLab`) and editable show-cause notices (`DOCX`) with officer stamps and digital verification hashes.

---

## 4. Default Demonstration Accounts

The platform is pre-seeded with role-based enforcement accounts:

| Role | Email | Password | Jurisdiction / Badge |
|---|---|---|---|
| **Inspector** | `inspector@labelguard.gov.in` | `Inspector@123` | Karnataka State - Bangalore Urban (`LM-INS-104`) |
| **Supervisor** | `supervisor@labelguard.gov.in` | `Supervisor@123` | Southern Enforcement Zone (`LM-SUP-019`) |
| **Admin** | `admin@labelguard.gov.in` | `Admin@123` | Central Legal Metrology Division (`LM-ADM-001`) |

---

## 5. Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt

# Run migrations, seed legal rules, and demo data
python -m app.seed.seed_data

# Start FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 6. Docker & Containerized Deployment

Run the complete multi-tier stack (PostgreSQL + FastAPI + React Frontend) using Docker Compose:

```bash
docker-compose up --build
```
- **Web Portal**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **PostgreSQL**: `localhost:5432`

---

## 7. Automated Testing Suite

Run the full automated test suite covering unit validators, regex parsers, First Schedule calibration, and end-to-end inspection flows:

```bash
cd backend
python -m pytest tests -v
```

---

## 8. Statutory Reference Matrix (Pre-Seeded Rules)

- **Rule 6(1)(a)**: Name and complete address of manufacturer / packer / importer.
- **Rule 6(1)(c)**: Plain declaration of net quantity in standard units of weight, measure, or number.
- **Rule 6(1)(d)**: Month and year of manufacture, packing, or import.
- **Rule 6(1)(e)**: Maximum Retail Price (MRP) inclusive of all taxes.
- **Rule 6(1)(f)**: Consumer care telephone helpline, email, and address.
- **Rule 6(1)(g)**: Country of origin.
- **Rule 6(11)** (2021/2022 Amendment): Mandatory Unit Sale Price (USP) for items $\ge$ 1 kg / 1 L.
- **Rule 13**: Mandatory SI units; strict prohibition on non-standard units (e.g. `"gm"`, `"gms"`, `"cc"`).
- **Rule 18**: Prohibition of dual or conflicting declarations.
- **First Schedule**: Statutory minimum numeral height based on net content.
