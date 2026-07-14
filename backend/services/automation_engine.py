import asyncio
import json
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional
import httpx
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
from models import (
    Workflow, WorkflowRun, Integration, Lead, Task, Notification,
    Appointment, Quotation, WhatsappMessage, User
)
from services import whatsapp_cloud

logger = logging.getLogger("facets.automation_engine")

def format_template(template: str, context: dict) -> str:
    if not template:
        return ""
    for k, v in context.items():
        template = template.replace(f"{{{{{k}}}}}", str(v if v is not None else ""))
    return template

def get_context(trigger_type: str, item: Any, db: Session) -> dict:
    ctx = {}
    if trigger_type == "lead_created" and isinstance(item, Lead):
        ctx = {
            "lead_id": item.id,
            "name": item.name,
            "phone": item.phone or "",
            "email": item.email or "",
            "company": item.company or "",
            "city": item.city or "",
            "source": item.source or "",
            "status": item.status or "",
            "budget": str(item.budget),
            "customer_type": item.customer_type or "",
            "notes": item.notes or "",
        }
    elif trigger_type == "task_overdue" and isinstance(item, Task):
        ctx = {
            "task_id": item.id,
            "title": item.title,
            "description": item.description or "",
            "priority": item.priority or "",
            "status": item.status or "",
            "due_date": str(item.due_date) if item.due_date else "",
        }
        if item.lead:
            ctx.update({
                "lead_name": item.lead.name,
                "lead_phone": item.lead.phone or "",
            })
    elif trigger_type == "whatsapp_inbound" and isinstance(item, WhatsappMessage):
        ctx = {
            "message_id": item.id,
            "message": item.message,
            "direction": item.direction,
            "created_at": str(item.created_at),
        }
        if item.lead:
            ctx.update({
                "lead_id": item.lead_id,
                "lead_name": item.lead.name,
                "lead_phone": item.lead.phone or "",
                "lead_email": item.lead.email or "",
            })
    elif trigger_type == "appointment_created" and isinstance(item, Appointment):
        ctx = {
            "appt_id": item.id,
            "customer_name": item.customer_name,
            "appointment_date": str(item.appointment_date),
            "showroom_visit": "Yes" if item.showroom_visit else "No",
            "notes": item.notes or "",
        }
    elif trigger_type == "quotation_generated" and isinstance(item, Quotation):
        ctx = {
            "quote_id": item.id,
            "quotation_number": item.quotation_number,
            "amount": str(item.amount),
            "status": item.status,
            "created_at": str(item.created_at),
        }
        if item.lead:
            ctx.update({
                "lead_name": item.lead.name,
                "lead_phone": item.lead.phone or "",
                "lead_email": item.lead.email or "",
            })
    return ctx

def run_workflow_sync(workflow_id: int, trigger_type: str, item_id: int):
    """Sync entry point to run a single workflow run in background."""
    db = SessionLocal()
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow or not workflow.enabled:
            return

        # Fetch actual item
        item = None
        if trigger_type == "lead_created":
            item = db.query(Lead).filter(Lead.id == item_id).first()
        elif trigger_type == "task_overdue":
            item = db.query(Task).filter(Task.id == item_id).first()
        elif trigger_type == "whatsapp_inbound":
            item = db.query(WhatsappMessage).filter(WhatsappMessage.id == item_id).first()
        elif trigger_type == "appointment_created":
            item = db.query(Appointment).filter(Appointment.id == item_id).first()
        elif trigger_type == "quotation_generated":
            item = db.query(Quotation).filter(Quotation.id == item_id).first()

        if not item:
            logger.warning("Trigger item not found: trigger_type=%s, id=%s", trigger_type, item_id)
            return

        ctx = get_context(trigger_type, item, db)
        
        # Create execution run record
        run_record = WorkflowRun(
            workflow_id=workflow.id,
            status="Pending",
            logs="",
            executed_at=datetime.now(timezone.utc)
        )
        db.add(run_record)
        db.commit()
        db.refresh(run_record)

        # Parse actions
        try:
            actions_list = json.loads(workflow.actions)
        except Exception as e:
            run_record.status = "Failed"
            run_record.logs = f"Failed to parse actions JSON: {e}"
            db.commit()
            return

        logs = []
        success = True

        for index, action in enumerate(actions_list):
            act_type = action.get("type")
            logs.append(f"Step {index + 1}: Executing action '{act_type}'...")
            
            try:
                if act_type == "send_whatsapp":
                    to_number = format_template(action.get("to_number", "{{phone}}"), ctx)
                    message_body = format_template(action.get("message_body", ""), ctx)
                    if not to_number:
                        raise ValueError("No recipient phone number resolved.")
                    
                    whatsapp_cloud.send_text(to_number, message_body)
                    logs.append(f"WhatsApp sent successfully to {to_number}.")
                
                elif act_type == "send_email":
                    # Fetch SMTP connection settings
                    smtp_int = db.query(Integration).filter(Integration.app_name == "smtp").first()
                    smtp_config = {}
                    if smtp_int and smtp_int.enabled:
                        try:
                            smtp_config = json.loads(smtp_int.api_key) if smtp_int.api_key else {}
                        except Exception:
                            pass
                    
                    host = smtp_config.get("host") or os.environ.get("SMTP_HOST", "smtp.gmail.com")
                    port = int(smtp_config.get("port") or os.environ.get("SMTP_PORT", "587"))
                    username = smtp_config.get("username") or os.environ.get("SMTP_USER", "")
                    password = smtp_config.get("password") or os.environ.get("SMTP_PASS", "")
                    sender = smtp_config.get("sender") or os.environ.get("SMTP_FROM", username)

                    recipient = format_template(action.get("recipient", "{{email}}"), ctx)
                    subject = format_template(action.get("subject", "ParshWebCraft Alert"), ctx)
                    body = format_template(action.get("body", ""), ctx)

                    if not recipient:
                        raise ValueError("No recipient email resolved.")

                    # Sending email using standard SMTP
                    msg = MIMEMultipart()
                    msg["From"] = sender
                    msg["To"] = recipient
                    msg["Subject"] = subject
                    msg.attach(MIMEText(body, "plain"))

                    server = smtplib.SMTP(host, port)
                    server.starttls()
                    if username and password:
                        server.login(username, password)
                    server.sendmail(sender, recipient, msg.as_string())
                    server.quit()
                    logs.append(f"Email sent successfully to {recipient}.")

                elif act_type == "notify_manager":
                    title = format_template(action.get("title", "Automation Alert"), ctx)
                    msg_text = format_template(action.get("message", ""), ctx)
                    # Notify all admin/manager users
                    admins = db.query(User).filter(User.role.in_(["Admin", "Manager"])).all()
                    for admin in admins:
                        db.add(Notification(
                            user_id=admin.id,
                            title=title,
                            message=msg_text,
                            is_read=False
                        ))
                    db.commit()
                    logs.append("Notification dispatched to all managers/admins.")

                elif act_type == "create_task":
                    title = format_template(action.get("title", "Follow Up task"), ctx)
                    desc = format_template(action.get("description", ""), ctx)
                    priority = action.get("priority", "Medium")
                    due_in_days = int(action.get("due_in_days", 2))
                    
                    lead_id = ctx.get("lead_id")
                    
                    db.add(Task(
                        lead_id=lead_id,
                        title=title,
                        description=desc,
                        priority=priority,
                        status="Open",
                        due_date=datetime.now(timezone.utc) + timedelta(days=due_in_days)
                    ))
                    db.commit()
                    logs.append(f"Task '{title}' generated successfully.")

                elif act_type == "rest_api" or act_type == "webhook":
                    url = action.get("url")
                    method = action.get("method", "POST").upper()
                    
                    if not url:
                        raise ValueError("No HTTP Webhook URL specified.")
                    
                    headers = {"Content-Type": "application/json"}
                    payload_data = {"event": trigger_type, "timestamp": str(datetime.now(timezone.utc)), "data": ctx}
                    
                    with httpx.Client(timeout=10.0) as client:
                        if method == "GET":
                            r = client.get(url, params=payload_data)
                        else:
                            r = client.post(url, json=payload_data, headers=headers)
                        
                        if r.status_code >= 400:
                            raise RuntimeError(f"HTTP call returned status {r.status_code}")
                    logs.append(f"HTTP Webhook call to {url} completed successfully.")

                elif act_type == "delay":
                    seconds = int(action.get("seconds", 10))
                    logs.append(f"Delaying execution for {seconds} seconds...")
                    # Delay step synchronously inside background thread
                    import time
                    time.sleep(seconds)

                else:
                    logs.append(f"Unknown action type '{act_type}' skipped.")

            except Exception as ex:
                success = False
                logs.append(f"Error on step {index + 1}: {ex}")
                logger.error("WorkflowRun step error: %s", ex)
                break

        run_record.status = "Success" if success else "Failed"
        run_record.logs = "\n".join(logs)
        db.commit()

    except Exception as e:
        logger.exception("Error executing workflow: %s", e)
    finally:
        db.close()

def trigger_automation(db: Session, trigger_type: str, item_id: int):
    """Finds matching workflows and launches them inside task loops."""
    workflows = db.query(Workflow).filter(
        Workflow.trigger_type == trigger_type,
        Workflow.enabled == True
    ).all()

    for w in workflows:
        # Run asynchronously in background thread so it doesn't block main request thread
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, run_workflow_sync, w.id, trigger_type, item_id)
