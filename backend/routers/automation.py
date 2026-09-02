import json
import logging
import smtplib
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from deps import get_current_user
from models import User, Workflow, WorkflowRun, Integration
from schemas import (
    WorkflowCreate, WorkflowUpdate, WorkflowOut,
    IntegrationSave, IntegrationOut, WorkflowRunOut
)
from services import llm
import httpx

router = APIRouter(prefix="/automation", tags=["automation"])
logger = logging.getLogger("facets.automation_router")

@router.get("/dashboard", response_model=dict)
def get_automation_dashboard_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Retrieve summary telemetry stats for the automation dashboard."""
    total_workflows = db.query(Workflow).count()
    active_workflows = db.query(Workflow).filter(Workflow.enabled == True).count()
    
    total_runs = db.query(WorkflowRun).count()
    failed_runs = db.query(WorkflowRun).filter(WorkflowRun.status == "Failed").count()
    success_runs = db.query(WorkflowRun).filter(WorkflowRun.status == "Success").count()
    pending_runs = db.query(WorkflowRun).filter(WorkflowRun.status == "Pending").count()
    
    # Calculate success rate
    success_rate = 100.0 if total_runs == 0 else round((success_runs / total_runs) * 100, 1)

    return {
        "total_workflows": total_workflows,
        "active_workflows": active_workflows,
        "total_runs": total_runs,
        "failed_runs": failed_runs,
        "success_runs": success_runs,
        "pending_runs": pending_runs,
        "success_rate": success_rate
    }

# ---------------- WORKFLOW CRUD ----------------

@router.get("/workflows", response_model=List[WorkflowOut])
def list_workflows(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Workflow).order_by(Workflow.created_at.desc()).all()

@router.post("/workflows", response_model=WorkflowOut, status_code=201)
def create_workflow(payload: WorkflowCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    w = Workflow(
        name=payload.name,
        trigger_type=payload.trigger_type,
        actions=payload.actions,
        enabled=payload.enabled
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return w

@router.put("/workflows/{wid}", response_model=WorkflowOut)
def update_workflow(wid: int, payload: WorkflowUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    w = db.query(Workflow).filter(Workflow.id == wid).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if payload.name is not None:
        w.name = payload.name
    if payload.trigger_type is not None:
        w.trigger_type = payload.trigger_type
    if payload.actions is not None:
        w.actions = payload.actions
    if payload.enabled is not None:
        w.enabled = payload.enabled
        
    db.commit()
    db.refresh(w)
    return w

@router.delete("/workflows/{wid}", status_code=204)
def delete_workflow(wid: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    w = db.query(Workflow).filter(Workflow.id == wid).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(w)
    db.commit()
    return None

@router.post("/workflows/{wid}/toggle", response_model=WorkflowOut)
def toggle_workflow(wid: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    w = db.query(Workflow).filter(Workflow.id == wid).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workflow not found")
    w.enabled = not w.enabled
    db.commit()
    db.refresh(w)
    return w

# ---------------- INTEGRATIONS ----------------

@router.get("/integrations", response_model=List[IntegrationOut])
def list_integrations(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    # Seed default blank integrations if none exist
    default_apps = [
        "whatsapp", "google_sheets", "excel", "smtp", "openai", 
        "deepseek", "vapi", "google_calendar", "rest_api", "webhook"
    ]
    existing = {i.app_name for i in db.query(Integration).all()}
    added_any = False
    for app in default_apps:
        if app not in existing:
            db.add(Integration(app_name=app, enabled=False, api_key="", secret_key="", webhook_url=""))
            added_any = True
    if added_any:
        db.commit()
    return db.query(Integration).order_by(Integration.app_name.asc()).all()

@router.post("/integrations", response_model=IntegrationOut)
def save_integration(payload: IntegrationSave, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    app_int = db.query(Integration).filter(Integration.app_name == payload.app_name).first()
    if not app_int:
        app_int = Integration(app_name=payload.app_name)
        db.add(app_int)
    
    app_int.enabled = payload.enabled
    app_int.api_key = payload.api_key or ""
    app_int.secret_key = payload.secret_key or ""
    app_int.webhook_url = payload.webhook_url or ""
    
    db.commit()
    db.refresh(app_int)
    return app_int

@router.post("/integrations/{name}/test", response_model=dict)
def test_integration_connection(name: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Test health connection for the given app integration name."""
    app_int = db.query(Integration).filter(Integration.app_name == name).first()
    if not app_int or not app_int.enabled:
        return {"success": False, "message": "Integration is disabled or not configured."}

    try:
        if name == "smtp":
            smtp_config = json.loads(app_int.api_key) if app_int.api_key else {}
            host = smtp_config.get("host", "smtp.gmail.com")
            port = int(smtp_config.get("port", 587))
            username = smtp_config.get("username", "")
            password = smtp_config.get("password", "")
            
            # Open server and try connection login
            server = smtplib.SMTP(host, port, timeout=10)
            server.starttls()
            if username and password:
                server.login(username, password)
            server.quit()
            return {"success": True, "message": f"Successfully connected to SMTP server at {host}."}

        elif name in ("openai", "deepseek"):
            api_key = app_int.api_key
            if not api_key:
                return {"success": False, "message": "API key is missing."}
            # Simple models list endpoint call
            base_url = "https://api.deepseek.com/v1" if name == "deepseek" else "https://api.openai.com/v1"
            headers = {"Authorization": f"Bearer {api_key}"}
            with httpx.Client(timeout=10.0) as client:
                r = client.get(f"{base_url}/models", headers=headers)
                if r.status_code == 200:
                    return {"success": True, "message": f"API Key validated successfully. Connected to {name.title()} service."}
                else:
                    return {"success": False, "message": f"Failed authentication. API returned status {r.status_code}."}

        elif name == "omnidim":
            from services import omnidim_voice
            res = omnidim_voice.test_connection(db)
            return {"success": res["ok"], "message": res["message"]}

        elif name == "rest_api" or name == "webhook":
            url = app_int.webhook_url
            if not url:
                return {"success": False, "message": "Webhook URL is blank."}
            with httpx.Client(timeout=5.0) as client:
                r = client.get(url)  # Ping the health check target
                return {"success": True, "message": f"Webhook reached successfully. Ping response status {r.status_code}."}

        else:
            # Fallback mock check
            return {"success": True, "message": f"{name.title()} mock connection test passed."}

    except Exception as e:
        return {"success": False, "message": f"Connection check failed: {e}"}

# ---------------- RUN LOGS ----------------

@router.get("/logs", response_model=List[dict])
def list_execution_logs(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Fetch recent run execution logs with linked workflow information."""
    runs = db.query(WorkflowRun).order_by(WorkflowRun.executed_at.desc()).limit(100).all()
    results = []
    for r in runs:
        results.append({
            "id": r.id,
            "workflow_id": r.workflow_id,
            "workflow_name": r.workflow.name if r.workflow else "Deleted Workflow",
            "trigger_type": r.workflow.trigger_type if r.workflow else "Unknown",
            "status": r.status,
            "logs": r.logs,
            "executed_at": r.executed_at
        })
    return results

# ---------------- AI COPILOT GENERATION ----------------

@router.post("/generate-ai-workflow", response_model=dict)
def ai_generate_workflow(payload: dict, _: User = Depends(get_current_user)):
    prompt = payload.get("prompt", "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is blank")

    system_prompt = (
        "You are an expert CRM automation workflow architect.\n"
        "Convert the user's natural language request into a structured JSON configuration matching the following schema:\n"
        "{\n"
        "  \"name\": \"A clear, brief name for this workflow (e.g. Lead Auto Assign)\",\n"
        "  \"trigger_type\": \"One of: lead_created, task_overdue, whatsapp_inbound, appointment_created, quotation_generated\",\n"
        "  \"actions\": [\n"
        "    {\n"
        "      \"type\": \"One of: send_whatsapp, send_email, notify_manager, create_task, rest_api, webhook, delay\",\n"
        "      // depending on type, include fields like:\n"
        "      // send_whatsapp: to_number (default: '{{phone}}'), message_body\n"
        "      // send_email: recipient (default: '{{email}}'), subject, body\n"
        "      // notify_manager: title, message\n"
        "      // create_task: title, description, priority (Low|Medium|High), due_in_days (integer)\n"
        "      // rest_api / webhook: url, method (GET|POST)\n"
        "      // delay: seconds (integer)\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "Ensure the output is valid JSON matching this schema exactly. Return only the JSON."
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Create a workflow for: {prompt}"}
    ]

    try:
        res = llm.chat_json(messages)
        # Ensure actions key is a string instead of array for Workflow DB save
        if "actions" in res and isinstance(res["actions"], list):
            res["actions"] = json.dumps(res["actions"])
        return res
    except Exception as e:
        logger.error("AI workflow generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"AI Workflow Generation Failed: {e}")
