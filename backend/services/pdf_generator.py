"""Professional PDF Quotation and Agency Brochure Generator using ReportLab."""
import os
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

# Uploads directory
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
QUOTATIONS_DIR = UPLOADS_DIR / "quotations"
BROCHURES_DIR = UPLOADS_DIR / "brochures"
WHATSAPP_MEDIA_DIR = UPLOADS_DIR / "whatsapp"

QUOTATIONS_DIR.mkdir(parents=True, exist_ok=True)
BROCHURES_DIR.mkdir(parents=True, exist_ok=True)
WHATSAPP_MEDIA_DIR.mkdir(parents=True, exist_ok=True)


def _get_public_base_url() -> str:
    """Return public base URL for public file links."""
    base = os.environ.get("PUBLIC_BASE_URL", "").strip()
    if not base:
        base = "https://api.parshagent.com"
    return base.rstrip("/")


def _format_inr(val: float) -> str:
    """Format numeric value in Indian Rupees."""
    try:
        val = float(val or 0.0)
        return f"Rs. {val:,.2f}"
    except Exception:
        return f"Rs. {val}"


def generate_quotation_pdf(
    quotation_data: Dict[str, Any],
    lead_data: Dict[str, Any],
    company_data: Optional[Dict[str, Any]] = None,
    output_path: Optional[str] = None
) -> str:
    """Generate a clean, high-trust Quotation PDF for ParshWebCraft / CRM leads.
    
    Returns the absolute filepath of the generated PDF.
    """
    quote_num = quotation_data.get("quotation_number") or "QT-DRAFT"
    if not output_path:
        filename = f"{quote_num.replace('/', '_')}.pdf"
        output_path = str(QUOTATIONS_DIR / filename)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom typography
    c_primary = colors.HexColor("#1e1b4b")       # Deep indigo
    c_accent = colors.HexColor("#4338ca")        # Vibrant indigo
    c_emerald = colors.HexColor("#047857")       # Emerald green
    c_dark = colors.HexColor("#0f172a")          # Slate 900
    c_muted = colors.HexColor("#475569")         # Slate 600
    c_bg_light = colors.HexColor("#f8fafc")      # Slate 50
    c_border = colors.HexColor("#e2e8f0")        # Slate 200

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=c_primary,
    )
    
    quote_num_style = ParagraphStyle(
        "QuoteNum",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=c_accent,
    )

    h2_style = ParagraphStyle(
        "H2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=c_primary,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=c_dark,
    )

    body_muted = ParagraphStyle(
        "BodyMuted",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=c_muted,
    )

    table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.white,
    )

    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=c_dark,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=c_dark,
    )

    table_cell_right = ParagraphStyle(
        "TableCellRight",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=c_dark,
        alignment=2,
    )

    story = []

    # 1. Header: Company Branding & Quotation Metadata
    company_name = (company_data or {}).get("name") or "ParshWebCraft Technologies"
    company_tagline = "Enterprise Web, Mobile & AI Automation Solutions"
    company_email = "contact@parshwebcraft.com"
    company_phone = "+91 88249 60682"
    company_web = "https://parshagent.com"

    status = (quotation_data.get("status") or "Proposal").upper()
    date_str = quotation_data.get("created_at")
    if isinstance(date_str, datetime):
        date_str = date_str.strftime("%d %b %Y")
    elif not date_str:
        date_str = datetime.now(timezone.utc).strftime("%d %b %Y")
    else:
        try:
            dt = datetime.fromisoformat(str(date_str).replace("Z", "+00:00"))
            date_str = dt.strftime("%d %b %Y")
        except Exception:
            date_str = str(date_str)[:10]

    header_left = [
        Paragraph(f"<b>{company_name}</b>", title_style),
        Paragraph(company_tagline, body_muted),
        Spacer(1, 3),
        Paragraph(f"Web: {company_web} | Email: {company_email} | Phone: {company_phone}", body_muted),
    ]

    header_right = [
        Paragraph("OFFICIAL QUOTATION", quote_num_style),
        Paragraph(f"<b>Reference:</b> {quote_num}", body_style),
        Paragraph(f"<b>Date:</b> {date_str}", body_style),
        Paragraph(f"<b>Status:</b> <font color='#047857'><b>{status}</b></font>", body_style),
    ]

    header_table = Table(
        [[header_left, header_right]],
        colWidths=[330, 190]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 14))

    # Divider line
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceAfter=14))

    # 2. Quotation Prepared For (Client Info Box)
    client_name = lead_data.get("name") or "Valued Client"
    client_phone = lead_data.get("phone") or "—"
    client_email = lead_data.get("email") or "—"
    client_city = lead_data.get("city") or "—"
    client_company = lead_data.get("company") or ""

    to_content = [
        Paragraph("<b>QUOTATION PREPARED FOR:</b>", h2_style),
        Spacer(1, 4),
        Paragraph(f"<b>Client Name:</b> {client_name}", body_style),
        Paragraph(f"<b>Contact:</b> {client_phone} | {client_email}", body_style),
        Paragraph(f"<b>Location / City:</b> {client_city}" + (f" ({client_company})" if client_company else ""), body_style),
    ]

    terms_summary = [
        Paragraph("<b>PROPOSAL HIGHLIGHTS:</b>", h2_style),
        Spacer(1, 4),
        Paragraph("<b>Delivery Timeline:</b> 2-4 Weeks from kickoff", body_style),
        Paragraph("<b>Validity:</b> 15 Days from proposal date", body_style),
        Paragraph("<b>Warranty & Support:</b> 30 Days complimentary post-launch support", body_style),
    ]

    client_table = Table([[to_content, terms_summary]], colWidths=[260, 260])
    client_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_bg_light),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(client_table)
    story.append(Spacer(1, 16))

    # 3. Deliverables / Scope Table
    story.append(Paragraph("<b>SCOPE OF DELIVERABLES & INVESTMENT</b>", h2_style))
    story.append(Spacer(1, 6))

    raw_items = quotation_data.get("items_json")
    items: List[Dict[str, Any]] = []
    if raw_items:
        try:
            if isinstance(raw_items, str):
                items = json.loads(raw_items)
            elif isinstance(raw_items, list):
                items = raw_items
        except Exception:
            items = []

    total_amount = float(quotation_data.get("amount") or 0.0)

    # If no line items, build default professional breakdown
    if not items:
        if total_amount > 0:
            items = [
                {
                    "title": "Custom Web & Digital Solution Architecture",
                    "desc": "Responsive UI/UX, modern frontend build, secure backend APIs, and database setup.",
                    "qty": 1,
                    "rate": total_amount * 0.70,
                    "total": total_amount * 0.70,
                },
                {
                    "title": "AI Integration & Automation Engine",
                    "desc": "Intelligent workflow automation, WhatsApp CRM connectivity, and automated lead nurturing.",
                    "qty": 1,
                    "rate": total_amount * 0.20,
                    "total": total_amount * 0.20,
                },
                {
                    "title": "Cloud Deployment, SSL & Performance Tuning",
                    "desc": "Production cloud setup, domain linking, SSL encryption, and Core Web Vitals optimization.",
                    "qty": 1,
                    "rate": total_amount * 0.10,
                    "total": total_amount * 0.10,
                },
            ]
        else:
            items = [
                {
                    "title": "Custom Solution Implementation",
                    "desc": "Full-cycle digital service as agreed in technical scoping call.",
                    "qty": 1,
                    "rate": 0.0,
                    "total": 0.0,
                }
            ]

    # Build Table rows
    table_data = [
        [
            Paragraph("#", table_header),
            Paragraph("Item & Deliverable Description", table_header),
            Paragraph("Qty", table_header),
            Paragraph("Unit Rate (INR)", table_header),
            Paragraph("Total (INR)", table_header),
        ]
    ]

    calculated_subtotal = 0.0
    for idx, it in enumerate(items, 1):
        t_desc = it.get("desc") or ""
        desc_para = [
            Paragraph(f"<b>{it.get('title', 'Service Deliverable')}</b>", table_cell_bold),
        ]
        if t_desc:
            desc_para.append(Paragraph(t_desc, body_muted))

        qty = it.get("qty", 1)
        rate = float(it.get("rate") or 0.0)
        row_tot = float(it.get("total") or (qty * rate))
        calculated_subtotal += row_tot

        table_data.append([
            Paragraph(str(idx), table_cell),
            desc_para,
            Paragraph(str(qty), table_cell),
            Paragraph(f"{rate:,.2f}", table_cell_right),
            Paragraph(f"{row_tot:,.2f}", table_cell_right),
        ])

    final_total = total_amount if total_amount > 0 else calculated_subtotal

    items_table = Table(
        table_data,
        colWidths=[24, 250, 40, 100, 106]
    )
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 10))

    # 4. Total and Notes section
    total_table_data = [
        [
            Paragraph("<b>Total Investment:</b>", ParagraphStyle("TotLabel", parent=h2_style, fontSize=12, textColor=c_primary)),
            Paragraph(f"<b>{_format_inr(final_total)}</b>", ParagraphStyle("TotVal", parent=h2_style, fontSize=14, textColor=c_emerald, alignment=2))
        ]
    ]
    tot_table = Table(total_table_data, colWidths=[350, 170])
    tot_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ecfdf5")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#a7f3d0")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(tot_table)
    story.append(Spacer(1, 14))

    # 5. Payment Details & Bank Transfer Box
    payment_info = [
        Paragraph("<b>OFFICIAL PAYMENT DETAILS</b>", h2_style),
        Spacer(1, 3),
        Paragraph("<b>Bank Name:</b> HDFC Bank", body_style),
        Paragraph("<b>Account Name:</b> ParshWebCraft Technologies", body_style),
        Paragraph("<b>Account Number:</b> 50200084729103", body_style),
        Paragraph("<b>IFSC Code:</b> HDFC0001234", body_style),
        Paragraph("<b>UPI ID:</b> <font color='#047857'><b>919830580730@upi</b></font>", body_style),
    ]

    terms_info = [
        Paragraph("<b>TERMS & CONDITIONS</b>", h2_style),
        Spacer(1, 3),
        Paragraph("• 50% milestone advance to initiate development.", body_style),
        Paragraph("• 50% final milestone upon project review & deployment.", body_style),
        Paragraph("• Complete source code & IP transferred upon settlement.", body_style),
        Paragraph("• 30 days complimentary bugfix warranty included.", body_style),
        Paragraph("• Taxes applicable as per prevailing GST guidelines.", body_muted),
    ]

    bank_table = Table([[payment_info, terms_info]], colWidths=[260, 260])
    bank_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_bg_light),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(bank_table)
    story.append(Spacer(1, 16))

    # 6. Authorization Footer
    footer_text = Paragraph(
        f"<i>This document is computer-generated and officially authorized by {company_name}. "
        f"For questions regarding this quotation, please WhatsApp or call {company_phone}.</i>",
        body_muted
    )
    story.append(footer_text)

    # Build document
    doc.build(story)
    return output_path


def generate_agency_brochure_pdf(output_path: Optional[str] = None) -> str:
    """Generate a 2-page Agency Services Overview Brochure for ParshWebCraft."""
    if not output_path:
        output_path = str(BROCHURES_DIR / "ParshWebCraft_Services_Overview.pdf")

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    c_primary = colors.HexColor("#1e1b4b")
    c_accent = colors.HexColor("#4338ca")
    c_emerald = colors.HexColor("#047857")
    c_bg = colors.HexColor("#f8fafc")
    c_border = colors.HexColor("#e2e8f0")

    title = ParagraphStyle(
        "BTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=c_primary,
    )

    subtitle = ParagraphStyle(
        "BSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=c_accent,
    )

    h2 = ParagraphStyle(
        "BH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=c_primary,
    )

    body = ParagraphStyle(
        "BBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
    )

    body_bold = ParagraphStyle(
        "BBodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=c_primary,
    )

    story = []

    # Hero Banner
    hero_data = [
        [
            Paragraph("<b>ParshWebCraft Technologies</b>", title),
            Paragraph("<b>AGENCY PROFILE & SERVICE CATALOG</b>", ParagraphStyle("Badge", parent=subtitle, alignment=2, textColor=c_emerald))
        ],
        [
            Paragraph("Engineering High-Performance Digital Products, Custom Web Apps & Autonomous AI Agents", subtitle),
            Paragraph("https://parshagent.com", ParagraphStyle("Web", parent=body, alignment=2, textColor=colors.HexColor("#64748b")))
        ]
    ]
    hero_table = Table(hero_data, colWidths=[360, 160])
    hero_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(hero_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=c_accent, spaceAfter=14))

    # Core Capabilities Grid
    story.append(Paragraph("<b>CORE SERVICE OFFERINGS</b>", h2))
    story.append(Spacer(1, 8))

    services_grid = [
        [
            [
                Paragraph("<b>1. Custom Web & SaaS Development</b>", body_bold),
                Spacer(1, 3),
                Paragraph("• Next.js, React, Node.js & Python backend architectures.", body),
                Paragraph("• Scalable PostgreSQL & MongoDB data modeling.", body),
                Paragraph("• Responsive, blazing fast UI with 95+ Core Web Vitals.", body),
                Paragraph("• Secure payment gateways (Razorpay, Stripe, UPI).", body),
            ],
            [
                Paragraph("<b>2. Autonomous AI Agents & Voice Dialers</b>", body_bold),
                Spacer(1, 3),
                Paragraph("• WhatsApp Cloud AI Bot with automatic lead qualification.", body),
                Paragraph("• Outbound & Inbound AI Voice calling agents (Vapi, Twilio).", body),
                Paragraph("• Custom LLM integration & prompt guardrails.", body),
                Paragraph("• Instant founder notifications for high-ticket bookings.", body),
            ]
        ],
        [
            [
                Paragraph("<b>3. WhatsApp Marketing & Omnichannel CRM</b>", body_bold),
                Spacer(1, 3),
                Paragraph("• Official Meta WhatsApp Cloud API integration.", body),
                Paragraph("• Multi-agent live chat inbox with role permissions.", body),
                Paragraph("• Automated quotations & rich PDF document delivery.", body),
                Paragraph("• Lead Kanban boards & conversion analytics.", body),
            ],
            [
                Paragraph("<b>4. Cloud Architecture & Enterprise Security</b>", body_bold),
                Spacer(1, 3),
                Paragraph("• High-availability Linux VPS deployment with Nginx & SSL.", body),
                Paragraph("• CI/CD automated deployment pipelines.", body),
                Paragraph("• Multi-tenant tenant data isolation & token security.", body),
                Paragraph("• 24/7 server monitoring & automatic health pings.", body),
            ]
        ]
    ]

    svc_table = Table(services_grid, colWidths=[255, 255])
    svc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(svc_table)
    story.append(Spacer(1, 16))

    # How We Work Section
    story.append(Paragraph("<b>HOW WE ENGAGE & DELIVER</b>", h2))
    story.append(Spacer(1, 8))

    process_data = [
        [
            Paragraph("<b>Phase 1: Discovery & Roadmap</b><br/><font color='#64748b'>Detailed scoping call to align on business requirements, architecture, and milestones.</font>", body),
            Paragraph("<b>Phase 2: Sprint Execution</b><br/><font color='#64748b'>Agile 1-week sprints with transparent staging demos and direct team access.</font>", body),
            Paragraph("<b>Phase 3: QA & Cloud Launch</b><br/><font color='#64748b'>Load testing, security checks, deployment, and 30-day post-launch warranty.</font>", body),
        ]
    ]
    proc_table = Table(process_data, colWidths=[170, 170, 170])
    proc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#eef2ff")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#c7d2fe")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#c7d2fe")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(proc_table)
    story.append(Spacer(1, 18))

    # Contact Banner
    contact_data = [
        [
            Paragraph("<b>Ready to scale your digital presence?</b><br/>Let's schedule a 10-minute discovery call to discuss your project.", ParagraphStyle("ContactTitle", parent=body, textColor=colors.white)),
            Paragraph("<b>WhatsApp:</b> +91 88249 60682<br/><b>Email:</b> contact@parshwebcraft.com<br/><b>Web:</b> https://parshagent.com", ParagraphStyle("ContactDetails", parent=body, textColor=colors.white, alignment=2)),
        ]
    ]
    contact_table = Table(contact_data, colWidths=[310, 200])
    contact_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_primary),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(contact_table)

    doc.build(story)
    return output_path
