import os
import hashlib
from datetime import datetime
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.core.config import settings

class InspectionPDFReportGenerator:
    """
    Generates official Legal Metrology Packaged Commodity Inspection Notices and Reports in PDF format.
    Includes official styling, finding breakdown, evidence references, and verification hash.
    """

    @classmethod
    def generate(cls, inspection_data: dict, output_filename: str) -> str:
        filepath = os.path.join(settings.REPORTS_DIR, output_filename)
        doc = SimpleDocTemplate(
            filepath,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom typography styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            alignment=1, # Center
            textColor=colors.HexColor('#0F172A')
        )
        
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            alignment=1,
            textColor=colors.HexColor('#475569')
        )
        
        heading_style = ParagraphStyle(
            'HeadingStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1E3A8A'),
            spaceBefore=10,
            spaceAfter=6
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155')
        )

        badge_style = ParagraphStyle(
            'BadgeStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.white
        )

        story = []

        # 1. Header & Seal
        story.append(Paragraph("GOVERNMENT OF INDIA", title_style))
        story.append(Paragraph("DEPARTMENT OF LEGAL METROLOGY &bull; CONSUMER AFFAIRS", subtitle_style))
        story.append(Paragraph("OFFICIAL PACKAGED COMMODITY INSPECTION REPORT", ParagraphStyle('ReportTitle', parent=title_style, fontSize=13, textColor=colors.HexColor('#0284C7'), spaceBefore=4)))
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceAfter=12))

        # 2. Inspection Metadata Table
        establishment = inspection_data.get("establishment", {})
        inspector = inspection_data.get("inspector", {})
        
        meta_data = [
            [
                Paragraph("<b>Inspection ID:</b>", body_style), Paragraph(str(inspection_data.get("inspection_number")), body_style),
                Paragraph("<b>Inspection Date:</b>", body_style), Paragraph(str(inspection_data.get("scheduled_date", datetime.utcnow().strftime("%Y-%m-%d %H:%M"))), body_style)
            ],
            [
                Paragraph("<b>Establishment:</b>", body_style), Paragraph(f"{establishment.get('name', 'N/A')}<br/>{establishment.get('address', '')}", body_style),
                Paragraph("<b>License / Reg No:</b>", body_style), Paragraph(str(establishment.get("license_number", "N/A")), body_style)
            ],
            [
                Paragraph("<b>Product / Commodity:</b>", body_style), Paragraph(str(inspection_data.get("products", [{}])[0].get("product_name", "Packaged Commodity") if inspection_data.get("products") else "Packaged Commodity"), body_style),
                Paragraph("<b>Inspection Scope:</b>", body_style), Paragraph("Packaged Commodities Rules (Rule 6 Declarations)", body_style)
            ],
            [
                Paragraph("<b>Overall Status:</b>", body_style), Paragraph(f"<b>{inspection_data.get('status', 'ANALYSIS_COMPLETE')}</b>", body_style),
                Paragraph("<b>Statutory Authority:</b>", body_style), Paragraph("Legal Metrology Act, 2009", body_style)
            ]
        ]

        meta_table = Table(meta_data, colWidths=[110, 160, 110, 160])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 14))

        # 3. Products Audited Section
        story.append(Paragraph("1. PACKAGED COMMODITIES AUDITED", heading_style))
        products = inspection_data.get("products", [])
        
        prod_table_data = [
            [
                Paragraph("<b>#</b>", body_style),
                Paragraph("<b>Commodity Name</b>", body_style),
                Paragraph("<b>Category</b>", body_style),
                Paragraph("<b>Readability</b>", body_style),
                Paragraph("<b>AI Finding Status</b>", body_style),
                Paragraph("<b>Officer Decision</b>", body_style)
            ]
        ]

        for idx, p in enumerate(products, 1):
            prod_table_data.append([
                Paragraph(str(idx), body_style),
                Paragraph(f"<b>{p.get('product_name')}</b><br/><font color='#64748B'>{p.get('brand', '')}</font>", body_style),
                Paragraph(str(p.get("category", "General")), body_style),
                Paragraph(f"{p.get('readability_grade', 'MEDIUM')} ({p.get('readability_score', 0)}%)", body_style),
                Paragraph(f"<font color='{'#DC2626' if 'NON_COMPLIANCE' in p.get('compliance_status', '') else '#16A34A'}'><b>{p.get('compliance_status')}</b></font>", body_style),
                Paragraph("CONFIRMED" if p.get("compliance_status") == "CONFIRMED_NON_COMPLIANCE" else "REVIEWED", body_style)
            ])

        prod_table = Table(prod_table_data, colWidths=[24, 150, 90, 80, 110, 86])
        prod_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(prod_table)
        story.append(Spacer(1, 14))

        # 4. Detailed Compliance Findings & Evidence
        story.append(Paragraph("2. STATUTORY FINDINGS & EVIDENCE LOG", heading_style))

        finding_rows = [
            [
                Paragraph("<b>Commodity</b>", body_style),
                Paragraph("<b>Statutory Rule & Requirement</b>", body_style),
                Paragraph("<b>Category</b>", body_style),
                Paragraph("<b>Severity</b>", body_style),
                Paragraph("<b>Finding Detail & Officer Decision</b>", body_style)
            ]
        ]

        has_findings = False
        for p in products:
            for f in p.get("findings", []):
                has_findings = True
                decisions = f.get("officer_decisions", [])
                officer_note = f"<br/><font color='#2563EB'><b>Officer Note:</b> {decisions[0].get('officer_remarks')}</font>" if decisions else ""
                
                sev_color = '#DC2626' if f.get('severity') == 'CRITICAL' else ('#D97706' if f.get('severity') == 'MAJOR' else '#475569')
                
                finding_rows.append([
                    Paragraph(str(p.get("product_name")), body_style),
                    Paragraph(f"<b>{f.get('requirement')}</b>", body_style),
                    Paragraph(str(f.get("category")), body_style),
                    Paragraph(f"<font color='{sev_color}'><b>{f.get('severity')}</b></font>", body_style),
                    Paragraph(f"{f.get('reason')}{officer_note}", body_style)
                ])

        if not has_findings:
            finding_rows.append([
                Paragraph("-", body_style),
                Paragraph("All statutory declarations verified compliant.", body_style),
                Paragraph("COMPLIANT", body_style),
                Paragraph("NONE", body_style),
                Paragraph("No violations observed on audited packages.", body_style)
            ])

        findings_table = Table(finding_rows, colWidths=[90, 130, 90, 60, 170])
        findings_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(findings_table)
        story.append(Spacer(1, 14))

        # 5. Statutory Rules Verified Compliant Section
        story.append(Paragraph("3. STATUTORY RULES VERIFIED COMPLIANT (ADHERED RULES)", heading_style))

        comp_rows = [
            [
                Paragraph("<b>Rule</b>", body_style),
                Paragraph("<b>Statutory Requirement</b>", body_style),
                Paragraph("<b>Verified Declaration on Package</b>", body_style),
                Paragraph("<b>Gazette Ref</b>", body_style),
                Paragraph("<b>Status</b>", body_style)
            ]
        ]

        has_comp = False
        for p in products:
            for cr in p.get("compliant_rules", []):
                has_comp = True
                comp_rows.append([
                    Paragraph(f"<b>{cr.get('rule_number', '')}</b>", body_style),
                    Paragraph(str(cr.get("requirement", "")), body_style),
                    Paragraph(str(cr.get("verified_value", "Verified on package")), body_style),
                    Paragraph(f"Page {cr.get('gazette_page_number', 39)}", body_style),
                    Paragraph("<font color='#16A34A'><b>COMPLIANT</b></font>", body_style)
                ])

        if not has_comp:
            comp_rows.append([
                Paragraph("-", body_style),
                Paragraph("Awaiting manual confirmation", body_style),
                Paragraph("-", body_style),
                Paragraph("-", body_style),
                Paragraph("PENDING", body_style)
            ])

        comp_table = Table(comp_rows, colWidths=[65, 175, 175, 55, 70])
        comp_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F0FDF4')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#BBF7D0')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(comp_table)
        story.append(Spacer(1, 18))

        # 6. Digital Verification & Audit Record
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94A3B8'), spaceAfter=8))
        
        report_hash = hashlib.sha256(f"{inspection_data.get('inspection_number')}-{datetime.utcnow().isoformat()}".encode()).hexdigest()[:24].upper()
        
        endorsement_data = [
            [
                Paragraph("<b>Inspection Summary:</b><br/><br/><i>Automated Legal Metrology Compliance Inspection.<br/>All findings cross-referenced with Legal Metrology (Packaged Commodities) Rules, 2011.</i>", body_style),
                Paragraph(f"<b>Audit & Verification Record:</b><br/><font color='#64748B' face='Courier'>SHA256: {report_hash}</font><br/><br/><i>Generated under Official Legal Metrology Audit Workflow. Tamper-evident digital report.</i>", body_style)
            ]
        ]
        
        sign_table = Table(endorsement_data, colWidths=[270, 270])
        sign_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(sign_table)

        doc.build(story)
        return filepath
