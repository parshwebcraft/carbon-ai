"""Instant Dual Alerts Service for ParshAgent.

Dispatches instant concurrent notifications to the business owner/founder across:
1. WhatsApp Alert (Meta Cloud API to personal phone)
2. Email Alert (Rich HTML email via SMTP)
3. In-App CRM Notification (bell icon + lead activity timeline)

Triggered on:
- Discovery Call Booked / Requested
- Quotation / Proposal Requested
- Human Agent Handover Requested
- Coaching Demo Class Scheduled (Voice / WhatsApp)
- High-Intent Lead Qualified
"""
from __future__ import annotations

import json
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from models import AiAgentConfig, Company, User, Notification, Activity, Lead
from services import whatsapp_cloud

logger = logging.getLogger("facets.alerts")


def _get_owner_contact(db: Session, company_id: Optional[str] = None) -> tuple[str, str]:
    """Retrieve owner phone and email for a company."""
    phone = ""
    email = ""

    # 1. Check AiAgentConfig
    if company_id:
        cfg = db.query(AiAgentConfig).filter(AiAgentConfig.company_id == company_id).first()
        if cfg:
            phone = (cfg.founder_phone or "").strip()
            email = (cfg.founder_email or "").strip()

    # 2. Check Admin User
    if not email or not phone:
        q = db.query(User)
        if company_id:
            q = q.filter(User.company_id == company_id)
        admin = q.filter(User.role.in_(["Admin", "SuperAdmin"])).first() or q.first()
        if admin:
            if not email and admin.email:
                email = admin.email.strip()
            if not phone and admin.phone:
                phone = admin.phone.strip()

    # 3. Defaults & Fallbacks
    if not phone:
        phone = os.environ.get("FOUNDER_PHONE", "918442097839").strip()
    if not email:
        email = os.environ.get("ADMIN_EMAIL", "admin@parshwebcraft.com").strip()

    return phone, email


def send_whatsapp_alert(
    *,
    to_phone: str,
    message: str,
    company_id: Optional[str] = None,
) -> bool:
    """Send formatted alert text to owner WhatsApp number."""
    if not to_phone or not message:
        return False

    clean_phone = whatsapp_cloud._normalize(to_phone)
    if not clean_phone:
        logger.warning("Invalid alert phone number: %s", to_phone)
        return False

    try:
        if whatsapp_cloud.is_configured():
            whatsapp_cloud.send_text(clean_phone, message, company_id=company_id)
            logger.info("Owner WhatsApp alert delivered to %s", clean_phone)
            return True
        else:
            logger.warning("WhatsApp Cloud not configured for company %s", company_id)
    except Exception as e:
        logger.error("Failed to deliver WhatsApp alert to %s: %s", clean_phone, e)
    return False


def send_email_alert(
    *,
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    db: Optional[Session] = None,
    company_id: Optional[str] = None,
) -> bool:
    """Send rich HTML email alert to owner inbox via SMTP."""
    if not to_email or not subject or not html_content:
        return False

    host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    port = int(os.environ.get("SMTP_PORT", "587"))
    username = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASS", "")
    sender = os.environ.get("SMTP_FROM", username or "alerts@parshagent.com")

    # Check database Integration table if db available
    if db:
        try:
            from models import Integration
            q = db.query(Integration).filter(Integration.app_name == "smtp", Integration.enabled == True)
            if company_id:
                smtp_int = q.filter(Integration.company_id == company_id).first() or q.first()
            else:
                smtp_int = q.first()

            if smtp_int and smtp_int.api_key:
                cfg = json.loads(smtp_int.api_key)
                host = cfg.get("host") or host
                port = int(cfg.get("port") or port)
                username = cfg.get("username") or username
                password = cfg.get("password") or password
                sender = cfg.get("sender") or sender
        except Exception as e:
            logger.debug("Could not read SMTP integration config: %s", e)

    if not username or not password:
        logger.info("SMTP credentials not configured — skipping email delivery to %s", to_email)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = sender
        msg["To"] = to_email
        msg["Subject"] = subject

        plain_text = text_content or html_content.replace("<br/>", "\n").replace("<br>", "\n")
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        server = smtplib.SMTP(host, port, timeout=12)
        server.starttls()
        server.login(username, password)
        server.sendmail(sender, [to_email], msg.as_string())
        server.quit()
        logger.info("Owner email alert sent to %s", to_email)
        return True
    except Exception as e:
        logger.warning("SMTP email delivery to %s failed: %s", to_email, e)
        return False


def dispatch_dual_alert(
    *,
    event_type: str,
    lead: Lead,
    details: Dict[str, Any],
    db: Session,
    company_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Central orchestrator for Instant Dual Alerts (WhatsApp + Email + In-App)."""
    cid = company_id or lead.company_id
    owner_phone, owner_email = _get_owner_contact(db, cid)

    # 1. Compose headline and metadata based on event type
    headline_map = {
        "discovery_call": "📅 New Discovery Call Booked!",
        "proposal_requested": "📑 Quotation / Proposal Requested!",
        "demo_scheduled": "🎓 7-Day Demo Class Scheduled!",
        "handover_requested": "🚨 Customer Requested Human Agent!",
        "lead_qualified": "⭐ High-Intent Lead Qualified!",
    }
    headline = headline_map.get(event_type, f"⚡ New Lead Alert: {event_type.replace('_', ' ').title()}")

    client_name = lead.name or "Prospective Client"
    client_phone = lead.phone or "Not provided"
    company_name = details.get("company") or lead.company or details.get("school") or "N/A"
    requirement = details.get("requirement") or lead.customer_type or "General Inquiry"
    budget = f"₹{lead.budget:,.0f}" if lead.budget else (details.get("budget") or "Discuss on call")
    slot = details.get("slot") or details.get("appointment_date") or "Immediate Callback Requested"
    notes = details.get("notes") or details.get("summary") or lead.notes or "Engaged via AI"
    crm_link = f"https://parshagent.com/leads/{lead.id}"

    # 2. Channel 1: WhatsApp Alert Text
    wa_alert = (
        f"🔥 *[ParshAgent Alert]* {headline}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 *Client:* {client_name}\n"
        f"📱 *Phone:* {client_phone}\n"
        f"🏢 *Company/School:* {company_name}\n"
        f"💼 *Interest:* {requirement}\n"
        f"💰 *Budget:* {budget}\n"
        f"📅 *Preferred Slot:* {slot}\n"
        f"💬 *Notes:* {notes[:140]}\n"
        f"🔗 *View Lead:* {crm_link}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"⚡ _ParshAgent Live Notification System_"
    )

    # Avoid notifying the lead themselves if lead phone matches owner phone
    wa_sent = False
    clean_lead = whatsapp_cloud._normalize(lead.phone)
    clean_owner = whatsapp_cloud._normalize(owner_phone)
    if clean_owner and clean_owner != clean_lead:
        wa_sent = send_whatsapp_alert(to_phone=owner_phone, message=wa_alert, company_id=cid)

    # 3. Channel 2: Rich HTML Email Alert
    email_subject = f"🔥 {headline} — {client_name} ({client_phone})"
    email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
        .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; padding: 24px; }}
        .title {{ font-size: 20px; font-weight: 700; margin: 0 0 6px 0; }}
        .subtitle {{ font-size: 13px; opacity: 0.9; margin: 0; }}
        .content {{ padding: 24px; }}
        .info-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }}
        .info-label {{ color: #64748b; font-weight: 500; }}
        .info-value {{ color: #0f172a; font-weight: 600; text-align: right; }}
        .notes-box {{ background: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 16px; border-radius: 6px; margin: 18px 0; font-size: 13px; color: #334155; }}
        .btn {{ display: block; text-align: center; background: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 20px; }}
        .footer {{ padding: 16px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 class="title">{headline}</h2>
          <p class="subtitle">ParshAgent Autonomous Sales AI • Real-Time Alert</p>
        </div>
        <div class="content">
          <div class="info-row"><span class="info-label">👤 Client Name</span><span class="info-value">{client_name}</span></div>
          <div class="info-row"><span class="info-label">📱 Phone</span><span class="info-value">{client_phone}</span></div>
          <div class="info-row"><span class="info-label">🏢 Company / Institute</span><span class="info-value">{company_name}</span></div>
          <div class="info-row"><span class="info-label">💼 Requirement</span><span class="info-value">{requirement}</span></div>
          <div class="info-row"><span class="info-label">💰 Approximate Budget</span><span class="info-value">{budget}</span></div>
          <div class="info-row"><span class="info-label">📅 Preferred Slot</span><span class="info-value">{slot}</span></div>

          <div class="notes-box">
            <strong>Notes:</strong> {notes}
          </div>

          <a href="{crm_link}" class="btn">🚀 Open Lead in ParshAgent CRM</a>
        </div>
        <div class="footer">
          Delivered in real-time by ParshAgent Dual Alerts Engine • <a href="https://parshagent.com" style="color: #64748b;">parshagent.com</a>
        </div>
      </div>
    </body>
    </html>
    """
    email_sent = False
    if owner_email:
        email_sent = send_email_alert(
            to_email=owner_email,
            subject=email_subject,
            html_content=email_html,
            db=db,
            company_id=cid,
        )

    # 4. Channel 3: In-App CRM Notification
    try:
        users = db.query(User).filter(User.company_id == cid).all() if cid else db.query(User).all()
        for u in users:
            db.add(Notification(
                user_id=u.id,
                title=headline,
                message=f"{client_name} ({client_phone}) - {requirement}. {notes[:80]}",
                is_read=False,
            ))

        db.add(Activity(
            company_id=cid,
            lead_id=lead.id,
            activity_type="Alert",
            description=f"Instant Dual Alerts dispatched ({'WhatsApp delivered' if wa_sent else 'WhatsApp queued'}, {'Email delivered' if email_sent else 'Email queued'}) to owner",
        ))
        db.commit()
    except Exception as e:
        logger.warning("Could not persist in-app notification: %s", e)

    return {
        "ok": True,
        "whatsapp_sent": wa_sent,
        "email_sent": email_sent,
        "owner_phone": owner_phone,
        "owner_email": owner_email,
        "headline": headline,
    }
