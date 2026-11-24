"""Meta WhatsApp Cloud API client and webhook helpers."""
import os
import re
from typing import Optional, Dict, Any
import httpx

GRAPH_BASE = "https://graph.facebook.com/v21.0"


class WhatsappNotConfigured(RuntimeError):
    pass


def _token(company_id: Optional[str] = None) -> str:
    try:
        from database import SessionLocal
        from models import WhatsAppAccount
        with SessionLocal() as db:
            q = db.query(WhatsAppAccount).filter(WhatsAppAccount.status == "CONNECTED")
            if company_id:
                acc = q.filter(WhatsAppAccount.company_id == company_id).first()
                if acc and acc.access_token:
                    return acc.access_token.strip()
            acc = q.order_by(WhatsAppAccount.id.desc()).first()
            if acc and acc.access_token:
                return acc.access_token.strip()
    except Exception:
        pass
    t = os.environ.get("WHATSAPP_TOKEN", "").strip()
    if not t:
        raise WhatsappNotConfigured("WHATSAPP_TOKEN not set in .env")
    return t


def _phone_id(company_id: Optional[str] = None) -> str:
    try:
        from database import SessionLocal
        from models import WhatsAppAccount
        with SessionLocal() as db:
            q = db.query(WhatsAppAccount).filter(WhatsAppAccount.status == "CONNECTED")
            if company_id:
                acc = q.filter(WhatsAppAccount.company_id == company_id).first()
                if acc and acc.phone_number_id:
                    return acc.phone_number_id.strip()
            acc = q.order_by(WhatsAppAccount.id.desc()).first()
            if acc and acc.phone_number_id:
                return acc.phone_number_id.strip()
    except Exception:
        pass
    p = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    if not p:
        raise WhatsappNotConfigured("WHATSAPP_PHONE_NUMBER_ID not set in .env")
    return p


def _waba_id(company_id: Optional[str] = None) -> str:
    try:
        from database import SessionLocal
        from models import WhatsAppAccount
        with SessionLocal() as db:
            q = db.query(WhatsAppAccount).filter(WhatsAppAccount.status == "CONNECTED")
            if company_id:
                acc = q.filter(WhatsAppAccount.company_id == company_id).first()
                if acc and acc.waba_id:
                    return acc.waba_id.strip()
            acc = q.order_by(WhatsAppAccount.id.desc()).first()
            if acc and acc.waba_id:
                return acc.waba_id.strip()
    except Exception:
        pass
    w = os.environ.get("WHATSAPP_BUSINESS_ACCOUNT_ID", "").strip()
    if not w:
        raise WhatsappNotConfigured("WHATSAPP_BUSINESS_ACCOUNT_ID not set in .env or WhatsAppAccount")
    return w



def verify_token() -> str:
    return os.environ.get("WHATSAPP_VERIFY_TOKEN", "facets-verify")


def is_configured() -> bool:
    try:
        from database import SessionLocal
        from models import WhatsAppAccount
        with SessionLocal() as db:
            acc = db.query(WhatsAppAccount).filter(WhatsAppAccount.status == "CONNECTED").first()
            if acc and acc.access_token and acc.phone_number_id:
                return True
    except Exception:
        pass
    return bool(os.environ.get("WHATSAPP_TOKEN") and os.environ.get("WHATSAPP_PHONE_NUMBER_ID"))


def _normalize(num: str) -> str:
    """Meta requires phone like 919876543210 (no '+' or dashes)."""
    if not num:
        return num
    return re.sub(r"[^0-9]", "", num)


def send_text(to: str, body: str, company_id: Optional[str] = None) -> Dict[str, Any]:
    if not body.strip():
        raise ValueError("Empty WhatsApp body")
    payload = {
        "messaging_product": "whatsapp",
        "to": _normalize(to),
        "type": "text",
        "text": {"body": body[:4096]},
    }
    with httpx.Client(timeout=20.0) as client:
        r = client.post(
            f"{GRAPH_BASE}/{_phone_id(company_id)}/messages",
            headers={"Authorization": f"Bearer {_token(company_id)}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"WhatsApp send error {r.status_code}: {r.text[:300]}")
        return r.json()


def send_document(
    to: str,
    document_url: str,
    filename: Optional[str] = None,
    caption: Optional[str] = None,
    company_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send a PDF or document via Meta WhatsApp Cloud API using public URL."""
    if not document_url:
        raise ValueError("Empty document_url")
    doc_payload: Dict[str, Any] = {"link": document_url}
    if filename:
        doc_payload["filename"] = filename
    if caption:
        doc_payload["caption"] = caption[:1024]

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": _normalize(to),
        "type": "document",
        "document": doc_payload,
    }
    with httpx.Client(timeout=25.0) as client:
        r = client.post(
            f"{GRAPH_BASE}/{_phone_id(company_id)}/messages",
            headers={"Authorization": f"Bearer {_token(company_id)}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"WhatsApp send document error {r.status_code}: {r.text[:300]}")
        return r.json()


def send_image(
    to: str,
    image_url: str,
    caption: Optional[str] = None,
    company_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send an image (PNG/JPG/WEBP) via Meta WhatsApp Cloud API using public URL."""
    if not image_url:
        raise ValueError("Empty image_url")
    img_payload: Dict[str, Any] = {"link": image_url}
    if caption:
        img_payload["caption"] = caption[:1024]

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": _normalize(to),
        "type": "image",
        "image": img_payload,
    }
    with httpx.Client(timeout=25.0) as client:
        r = client.post(
            f"{GRAPH_BASE}/{_phone_id(company_id)}/messages",
            headers={"Authorization": f"Bearer {_token(company_id)}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"WhatsApp send image error {r.status_code}: {r.text[:300]}")
        return r.json()


def download_media_bytes(media_id: str, company_id: Optional[str] = None) -> tuple[bytes, str]:
    """Retrieve and download binary media (voice note, audio, image, document) from Meta Graph API.
    
    Returns:
        (content_bytes, mime_type)
    """
    if not media_id:
        raise ValueError("Empty media_id")

    token = _token(company_id)
    # Step 1: Query media endpoint to get temporary download URL
    with httpx.Client(timeout=20.0) as client:
        r1 = client.get(
            f"{GRAPH_BASE}/{media_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        if r1.status_code >= 400:
            raise RuntimeError(f"Meta media query failed ({r1.status_code}): {r1.text[:200]}")
        data = r1.json()
        download_url = data.get("url")
        mime_type = data.get("mime_type", "application/octet-stream")
        if not download_url:
            raise RuntimeError("Meta media response missing download URL")

        # Step 2: Download raw binary payload using Bearer auth
        r2 = client.get(
            download_url,
            headers={"Authorization": f"Bearer {token}"},
        )
        if r2.status_code >= 400:
            raise RuntimeError(f"Meta media download failed ({r2.status_code}): {r2.text[:200]}")
        return r2.content, mime_type



def mark_read(message_id: str, phone_id: Optional[str] = None, company_id: Optional[str] = None) -> Dict[str, Any]:
    """Mark an inbound WhatsApp message as read to trigger blue double ticks."""
    if not message_id:
        return {}
    target_phone = phone_id or _phone_id(company_id)
    token = _token(company_id)
    payload = {
        "messaging_product": "whatsapp",
        "status": "read",
        "message_id": message_id,
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.post(
                f"{GRAPH_BASE}/{target_phone}/messages",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=payload,
            )
            return r.json() if r.status_code < 400 else {}
    except Exception:
        return {}


def send_quick_reply_buttons(
    to: str,
    body: str,
    buttons: list[dict],
    header: Optional[str] = None,
    footer: Optional[str] = None,
    company_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send an Interactive Quick-Reply message (up to 3 buttons) via Meta WhatsApp Cloud API.

    buttons format: [{"id": "btn_call", "title": "📅 Book a Call"}, ...]
    Meta constraints:
      - title: max 20 characters
      - body: max 1024 characters
      - header: max 60 characters
      - footer: max 60 characters
      - buttons count: 1 to 3
    """
    if not body or not body.strip():
        raise ValueError("Empty WhatsApp body")
    if not buttons:
        raise ValueError("At least 1 button is required")

    clean_buttons = []
    for i, b in enumerate(buttons[:3]):
        b_id = str(b.get("id") or f"btn_{i+1}")[:256]
        b_title = str(b.get("title") or f"Option {i+1}").strip()[:20]
        if not b_title:
            b_title = f"Option {i+1}"
        clean_buttons.append({
            "type": "reply",
            "reply": {
                "id": b_id,
                "title": b_title,
            }
        })

    interactive_obj: Dict[str, Any] = {
        "type": "button",
        "body": {"text": body[:1024]},
        "action": {"buttons": clean_buttons},
    }
    if header and header.strip():
        interactive_obj["header"] = {"type": "text", "text": header.strip()[:60]}
    if footer and footer.strip():
        interactive_obj["footer"] = {"text": footer.strip()[:60]}

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": _normalize(to),
        "type": "interactive",
        "interactive": interactive_obj,
    }

    url = f"{GRAPH_BASE}/{_phone_id(company_id)}/messages"
    with httpx.Client(timeout=15.0) as client:
        r = client.post(
            url,
            headers={"Authorization": f"Bearer {_token(company_id)}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"WhatsApp send buttons error {r.status_code}: {r.text[:300]}")
        return r.json()


def send_cta_url_button(
    to: str,
    body: str,
    display_text: str,
    url: str,
    header: Optional[str] = None,
    footer: Optional[str] = None,
    company_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send an Interactive CTA URL button message via Meta WhatsApp Cloud API."""
    if not body or not body.strip():
        raise ValueError("Empty WhatsApp body")

    clean_url = (url or "").strip()
    if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
        clean_url = f"https://{clean_url}"

    interactive_obj: Dict[str, Any] = {
        "type": "cta_url",
        "body": {"text": body[:1024]},
        "action": {
            "name": "cta_url",
            "parameters": {
                "display_text": (display_text or "Visit Link").strip()[:20],
                "url": clean_url,
            }
        }
    }
    if header and header.strip():
        interactive_obj["header"] = {"type": "text", "text": header.strip()[:60]}
    if footer and footer.strip():
        interactive_obj["footer"] = {"text": footer.strip()[:60]}

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": _normalize(to),
        "type": "interactive",
        "interactive": interactive_obj,
    }

    req_url = f"{GRAPH_BASE}/{_phone_id(company_id)}/messages"
    with httpx.Client(timeout=15.0) as client:
        r = client.post(
            req_url,
            headers={"Authorization": f"Bearer {_token(company_id)}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"WhatsApp send CTA URL error {r.status_code}: {r.text[:300]}")
        return r.json()


def send_template(
    to: str,
    template_name: str = "hello_world",
    language_code: str = "en_US",
    components: Optional[list] = None,
    company_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send an approved Meta WhatsApp Template message (works even outside 24-hour service window)."""
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": _normalize(to),
        "type": "template",
        "template": {
            "name": template_name.strip(),
            "language": {"code": language_code.strip()},
        }
    }
    if components:
        payload["template"]["components"] = components

    req_url = f"{GRAPH_BASE}/{_phone_id(company_id)}/messages"
    with httpx.Client(timeout=15.0) as client:
        r = client.post(
            req_url,
            headers={"Authorization": f"Bearer {_token(company_id)}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"WhatsApp send template error {r.status_code}: {r.text[:300]}")
        return r.json()


def submit_template_to_meta(
    name: str,
    category: str,
    language: str,
    body_text: str,
    header_type: str = "NONE",
    header_text: Optional[str] = None,
    footer_text: Optional[str] = None,
    buttons: Optional[list] = None,
    sample_values: Optional[list] = None,
    company_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Submit a new message template to Meta Graph API for review and approval."""
    clean_name = re.sub(r"[^a-z0-9_]", "_", name.strip().lower())
    clean_category = category.strip().upper()
    if clean_category not in ["UTILITY", "MARKETING", "AUTHENTICATION"]:
        clean_category = "UTILITY"

    # Meta standard language codes: en -> en_US, hi -> hi
    clean_lang = language.strip()
    if clean_lang == "en":
        clean_lang = "en_US"

    components = []

    # 1. Header component
    if header_type.upper() == "TEXT" and header_text:
        components.append({
            "type": "HEADER",
            "format": "TEXT",
            "text": header_text.strip(),
        })

    # 2. Body component (MANDATORY)
    # Find variables like {{1}}, {{2}}
    var_matches = re.findall(r"\{\{(\d+)\}\}", body_text)
    body_comp: Dict[str, Any] = {
        "type": "BODY",
        "text": body_text.strip(),
    }
    if var_matches:
        num_vars = len(set(var_matches))
        samples = []
        if sample_values and len(sample_values) >= num_vars:
            samples = [str(s).strip() for s in sample_values[:num_vars]]
        else:
            default_samples = ["Student Name", "5000", "October 31", "https://example.com/join", "9876543210"]
            samples = default_samples[:num_vars]
        body_comp["example"] = {
            "body_text": [samples]
        }
    components.append(body_comp)

    # 3. Footer component
    if footer_text and footer_text.strip():
        components.append({
            "type": "FOOTER",
            "text": footer_text.strip(),
        })

    # 4. Buttons component
    if buttons and len(buttons) > 0:
        meta_buttons = []
        for b in buttons:
            b_type = (b.get("type") or "QUICK_REPLY").upper()
            if b_type == "QUICK_REPLY":
                meta_buttons.append({
                    "type": "QUICK_REPLY",
                    "text": str(b.get("text", "")).strip()[:25],
                })
            elif b_type in ["URL", "CTA_URL"]:
                meta_buttons.append({
                    "type": "URL",
                    "text": str(b.get("text", "")).strip()[:25],
                    "url": str(b.get("url", "")).strip(),
                })
        if meta_buttons:
            components.append({
                "type": "BUTTONS",
                "buttons": meta_buttons[:3],  # Max 3 buttons in Meta API
            })

    payload = {
        "name": clean_name,
        "category": clean_category,
        "language": clean_lang,
        "components": components,
    }

    waba = _waba_id(company_id)
    req_url = f"{GRAPH_BASE}/{waba}/message_templates"
    with httpx.Client(timeout=20.0) as client:
        r = client.post(
            req_url,
            headers={"Authorization": f"Bearer {_token(company_id)}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            err_data = {}
            try:
                err_data = r.json().get("error", {})
            except Exception:
                pass
            err_msg = err_data.get("message") or r.text[:300]
            raise RuntimeError(f"Meta template submission error ({r.status_code}): {err_msg}")
        return r.json()


def fetch_templates_from_meta(company_id: Optional[str] = None) -> list:
    """Fetch all message templates from the Meta WhatsApp Business Account (WABA)."""
    waba = _waba_id(company_id)
    req_url = f"{GRAPH_BASE}/{waba}/message_templates?fields=name,status,category,language,components,id,rejected_reason&limit=100"
    with httpx.Client(timeout=20.0) as client:
        r = client.get(
            req_url,
            headers={"Authorization": f"Bearer {_token(company_id)}"},
        )
        if r.status_code >= 400:
            raise RuntimeError(f"Meta template fetch error ({r.status_code}): {r.text[:300]}")
        data = r.json()
        return data.get("data", [])


def delete_template_from_meta(name: str, company_id: Optional[str] = None) -> bool:
    """Delete a template from Meta WABA."""
    waba = _waba_id(company_id)
    clean_name = name.strip()
    req_url = f"{GRAPH_BASE}/{waba}/message_templates?name={clean_name}"
    with httpx.Client(timeout=20.0) as client:
        r = client.delete(
            req_url,
            headers={"Authorization": f"Bearer {_token(company_id)}"},
        )
        return r.status_code < 400



def send_list_message(
    to: str,
    body: str,
    button_text: str,
    sections: list[dict],
    header: Optional[str] = None,
    footer: Optional[str] = None,
    company_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Send an Interactive List Message (up to 10 options divided into sections) via Meta WhatsApp Cloud API.

    sections format:
    [
      {
        "title": "Section Title (max 24 chars)",
        "rows": [
          {
            "id": "row_id_1",
            "title": "Row Title (max 24 chars)",
            "description": "Optional subtitle (max 72 chars)"
          }
        ]
      }
    ]
    Meta Cloud API constraints:
      - button_text: max 20 chars (required)
      - body: max 1024 chars (required)
      - total rows across all sections: 1 to 10
      - row.id: max 200 chars
      - row.title: max 24 chars
      - row.description: max 72 chars
      - section.title: max 24 chars
      - header: max 60 chars
      - footer: max 60 chars
    """
    if not body or not body.strip():
        raise ValueError("Empty WhatsApp body")
    if not button_text or not button_text.strip():
        button_text = "View Options"
    if not sections:
        raise ValueError("At least 1 section is required")

    total_rows = 0
    clean_sections = []
    for s_idx, sec in enumerate(sections):
        if total_rows >= 10:
            break
        s_title = str(sec.get("title") or f"Section {s_idx + 1}").strip()[:24]
        raw_rows = sec.get("rows") or []
        clean_rows = []
        for r_idx, r in enumerate(raw_rows):
            if total_rows >= 10:
                break
            r_id = str(r.get("id") or f"item_{s_idx+1}_{r_idx+1}")[:200]
            r_title = str(r.get("title") or f"Item {r_idx+1}").strip()[:24]
            if not r_title:
                r_title = f"Item {r_idx+1}"
            r_desc = str(r.get("description") or "").strip()[:72] if r.get("description") else None

            row_obj: Dict[str, Any] = {
                "id": r_id,
                "title": r_title,
            }
            if r_desc:
                row_obj["description"] = r_desc
            clean_rows.append(row_obj)
            total_rows += 1

        if clean_rows:
            clean_sections.append({
                "title": s_title,
                "rows": clean_rows,
            })

    if not clean_sections or total_rows == 0:
        raise ValueError("At least 1 valid row is required in sections")

    interactive_obj: Dict[str, Any] = {
        "type": "list",
        "body": {"text": body.strip()[:1024]},
        "action": {
            "button": button_text.strip()[:20],
            "sections": clean_sections,
        },
    }
    if header and header.strip():
        interactive_obj["header"] = {"type": "text", "text": header.strip()[:60]}
    if footer and footer.strip():
        interactive_obj["footer"] = {"text": footer.strip()[:60]}

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": _normalize(to),
        "type": "interactive",
        "interactive": interactive_obj,
    }

    req_url = f"{GRAPH_BASE}/{_phone_id(company_id)}/messages"
    with httpx.Client(timeout=15.0) as client:
        r = client.post(
            req_url,
            headers={"Authorization": f"Bearer {_token(company_id)}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"WhatsApp send list error {r.status_code}: {r.text[:300]}")
        return r.json()


def parse_inbound(payload: dict) -> list[dict]:
    """Parse a Meta webhook payload into a list of normalized inbound messages.

    Returns: [{from_number, name, message, wa_message_id, ts, button_id, button_title, interactive_type}].
    """
    out = []
    for entry in payload.get("entry", []) or []:
        for change in entry.get("changes", []) or []:
            value = change.get("value") or {}
            metadata = value.get("metadata") or {}
            phone_number_id = metadata.get("phone_number_id")
            display_phone_number = metadata.get("display_phone_number")
            contacts = {c.get("wa_id"): (c.get("profile") or {}).get("name")
                        for c in (value.get("contacts") or [])}
            for msg in value.get("messages") or []:
                mtype = msg.get("type")
                body = ""
                media_type = mtype if mtype in ("image", "document", "audio", "video") else None
                media_filename = None
                media_caption = None
                media_id = None
                media_mime = None
                button_id = None
                button_title = None
                interactive_type = None

                if mtype == "text":
                    body = ((msg.get("text") or {}).get("body") or "").strip()
                elif mtype == "image":
                    img = msg.get("image") or {}
                    media_id = img.get("id")
                    media_mime = img.get("mime_type")
                    media_caption = (img.get("caption") or "").strip()
                    body = media_caption or "[Image]"
                elif mtype in ("audio", "voice"):
                    aud = msg.get("audio") or msg.get("voice") or {}
                    media_id = aud.get("id")
                    media_mime = aud.get("mime_type") or "audio/ogg; codecs=opus"
                    media_type = "audio"
                    body = "[Voice Note]"
                elif mtype == "document":
                    doc = msg.get("document") or {}
                    media_id = doc.get("id")
                    media_mime = doc.get("mime_type")
                    media_filename = (doc.get("filename") or "").strip()
                    media_caption = (doc.get("caption") or "").strip()
                    body = media_caption or media_filename or "[Document]"
                elif mtype == "video":
                    vid = msg.get("video") or {}
                    media_id = vid.get("id")
                    media_mime = vid.get("mime_type")
                    media_caption = (vid.get("caption") or "").strip()
                    body = media_caption or "[Video]"

                elif mtype == "interactive":
                    inter = msg.get("interactive") or {}
                    btn_reply = inter.get("button_reply") or {}
                    lst_reply = inter.get("list_reply") or {}
                    if btn_reply:
                        button_id = btn_reply.get("id")
                        button_title = (btn_reply.get("title") or "").strip()
                        interactive_type = "button_reply"
                        body = button_title or "[Button Reply]"
                    elif lst_reply:
                        button_id = lst_reply.get("id")
                        button_title = (lst_reply.get("title") or "").strip()
                        list_desc = (lst_reply.get("description") or "").strip()
                        interactive_type = "list_reply"
                        body = f"{button_title} - {list_desc}" if list_desc else (button_title or "[List Selection]")
                    else:
                        body = "[Interactive Reply]"
                elif mtype == "button":
                    btn = msg.get("button") or {}
                    button_title = (btn.get("text") or "").strip()
                    button_id = btn.get("payload")
                    interactive_type = "button_reply"
                    body = button_title or "[Button Click]"
                else:
                    body = f"[{mtype or 'message'}]"

                wa_id = msg.get("from")
                out.append({
                    "from_number": wa_id,
                    "name": contacts.get(wa_id),
                    "message": body,
                    "wa_message_id": msg.get("id"),
                    "ts": msg.get("timestamp"),
                    "phone_number_id": phone_number_id,
                    "display_phone_number": display_phone_number,
                    "media_type": media_type,
                    "media_id": media_id,
                    "media_mime": media_mime,
                    "media_filename": media_filename,
                    "media_caption": media_caption,
                    "button_id": button_id,
                    "button_title": button_title,
                    "interactive_type": interactive_type,
                })
    return out
