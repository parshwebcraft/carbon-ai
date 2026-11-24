import subprocess
import os

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>PRD - KRE Solitaire WhatsApp Marketing & OBD Voice Calling Automation</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
    @bottom-right {
      content: "Page " counter(page);
      font-size: 8pt;
      color: #94A3B8;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1E293B;
    line-height: 1.55;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
    background: #FFFFFF;
  }

  .cover-header {
    border-bottom: 2.5px solid #005C4B;
    padding-bottom: 18px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .brand-title {
    font-size: 22pt;
    font-weight: 800;
    color: #0F172A;
    letter-spacing: -0.5px;
    margin: 0;
  }

  .brand-subtitle {
    font-size: 11pt;
    font-weight: 600;
    color: #005C4B;
    margin-top: 4px;
    margin-bottom: 0;
  }

  .meta-box {
    text-align: right;
    font-size: 8.5pt;
    color: #64748B;
  }

  .badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-right: 4px;
  }

  .badge-emerald { background: #DCFCE7; color: #166534; }
  .badge-indigo { background: #EEF2FF; color: #3730A3; }
  .badge-amber { background: #FEF3C7; color: #92400E; }

  h1 {
    font-size: 14pt;
    font-weight: 700;
    color: #0F172A;
    border-bottom: 1px solid #E2E8F0;
    padding-bottom: 6px;
    margin-top: 22px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }

  h2 {
    font-size: 11pt;
    font-weight: 700;
    color: #005C4B;
    margin-top: 16px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }

  h3 {
    font-size: 9.5pt;
    font-weight: 600;
    color: #334155;
    margin-top: 12px;
    margin-bottom: 4px;
    page-break-after: avoid;
  }

  p {
    margin: 0 0 8px 0;
    color: #334155;
  }

  ul, ol {
    margin: 0 0 10px 0;
    padding-left: 20px;
    color: #334155;
  }

  li {
    margin-bottom: 4px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 16px 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }

  th {
    background: #F1F5F9;
    color: #0F172A;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #CBD5E1;
  }

  td {
    padding: 7px 10px;
    border: 1px solid #E2E8F0;
    vertical-align: top;
  }

  tr:nth-child(even) td {
    background: #F8FAFC;
  }

  .callout {
    background: #F8FAFC;
    border-left: 4px solid #005C4B;
    padding: 10px 14px;
    margin: 12px 0;
    border-radius: 0 6px 6px 0;
    font-size: 8.8pt;
  }

  .callout-title {
    font-weight: 700;
    color: #005C4B;
    margin-bottom: 3px;
  }

  .highlight-box {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    border-radius: 6px;
    padding: 10px 14px;
    margin: 12px 0;
    font-size: 8.8pt;
  }

  .grid-2 {
    display: flex;
    gap: 14px;
    margin: 10px 0;
  }

  .card {
    flex: 1;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 10px 12px;
    background: #FAFAFA;
  }

  .card-title {
    font-weight: 700;
    font-size: 9pt;
    color: #0F172A;
    margin-bottom: 4px;
  }

  .page-break {
    page-break-before: always;
  }
</style>
</head>
<body>

<div class="cover-header">
  <div>
    <h1 class="brand-title">KRE Solitaire</h1>
    <div class="brand-subtitle">WhatsApp Marketing & Automated OBD Voice Calling Automation Spec</div>
    <div style="margin-top: 6px;">
      <span class="badge badge-emerald">Product Requirement Document</span>
      <span class="badge badge-indigo">Ghinix Infotech &bull; Alpha CRM</span>
      <span class="badge badge-amber">Enterprise 9L Scope</span>
    </div>
  </div>
  <div class="meta-box">
    <div><strong>Client:</strong> Khodaniya Group (KRE Solitaire)</div>
    <div><strong>Project Scope:</strong> 1,000 Plots, Bhatewar, Udaipur</div>
    <div><strong>Prepared By:</strong> Gauransh Jaroli</div>
    <div><strong>Recipient:</strong> Manvay (Ghinix Infotech)</div>
    <div><strong>Date:</strong> November 15, 2026</div>
  </div>
</div>

<div class="callout">
  <div class="callout-title">Executive Summary</div>
  This Product Requirement Document (PRD) defines the system architecture, integration flows, and commercial scope for executing a high-volume investor outreach campaign for <strong>Khodaniya Group's KRE Solitaire</strong> (1,000 Plots township near Udaipur Airport, Bhatewar). The client possesses a database of <strong>9,00,000 (9 Lakhs) contacts</strong> and requires a dual-track marketing pipeline: <strong>(1) Automated Voice Calling (OBD - Outbound Dialer) with Instant Post-Call WhatsApp Drop</strong> and <strong>(2) Standalone High-Volume WhatsApp Marketing Blast</strong> with rich media brochures and interactive booking CTAs.
</div>

<h1>1. Project Background & Scope of Offerings</h1>
<p>
  <strong>KRE Solitaire</strong> by Khodaniya Group is a mega township development offering 1,000 residential and investment plots located at Bhatewar on the high-growth corridor connecting Udaipur City to Maharana Pratap Airport (Dabok).
</p>
<div class="grid-2">
  <div class="card">
    <div class="card-title">Option A: Voice (OBD) + Instant WhatsApp Drop (Combo)</div>
    <p>Automated outbound calling to phone numbers. Upon call answer, an engaging 20–30s pre-recorded studio audio script plays. If the user listens or presses DTMF key 1, an instant webhook triggers a personalized WhatsApp message with the KRE Solitaire Master Plan, Brochure PDF, and Site Visit booking CTA.</p>
  </div>
  <div class="card">
    <div class="card-title">Option B: Standalone WhatsApp Marketing Blast</div>
    <p>Direct broadcast to targeted active WhatsApp contacts featuring rich media (Entrance Gate 3D render / Master Plan PDF) and interactive quick-reply buttons (<code>Book Free Site Visit</code>, <code>Download Brochure</code>, <code>Call Sales Desk</code>).</p>
  </div>
</div>

<h1>2. System Architecture & Automation Flow</h1>
<ul>
  <li><strong>Data Scrubbing Engine:</strong> Ingestion of the 9 Lakh Excel sheet into Alpha CRM, validating phone formats (+91), deduplicating records, and filtering active WhatsApp numbers.</li>
  <li><strong>Telephony Broadcast (OBD Engine):</strong> High-concurrency outbound SIP/PRI channels dialing out during telecom-approved hours (9:00 AM – 9:00 PM IST) with Answering Machine Detection (AMD).</li>
  <li><strong>Real-Time Webhook Bridge:</strong> Call events (<code>answered</code>, <code>duration</code>, <code>dtmf_pressed</code>) stream into Alpha CRM via low-latency REST webhooks (&lt;500ms).</li>
  <li><strong>Automated WhatsApp Dispatch:</strong> Instant dispatch of official project assets directly to caller devices.</li>
  <li><strong>Alpha CRM Pipeline:</strong> Inbound replies, DTMF-1 hot leads, and site visit requests automatically populate the KRE Solitaire CRM board for real-time sales team allocation.</li>
</ul>

<div class="page-break"></div>

<h1>3. Module 1: Automated Outbound Voice Calling (OBD Engine)</h1>
<h2>3.1 Functional & Telephony Specifications</h2>
<ul>
  <li><strong>Concurrent Channels:</strong> 200–500 parallel PRI/SIP lines to deliver 50,000 to 1,00,000 calls per day.</li>
  <li><strong>Pulse Duration:</strong> Standard 30-second telecom billing pulse. Only successfully answered/connected calls are billed; switched-off, unreachable, and busy calls are dropped without charge.</li>
  <li><strong>Audio Prompt Configuration:</strong> 20–25 seconds high-clarity Hindi/Hinglish audio voiceover introducing KRE Solitaire, prime Bhatewar/Airport location, plot sizes, and immediate registry benefits.</li>
  <li><strong>Interactive IVR / DTMF Capture:</strong>
    <ul>
      <li><em>Option 1 (Press 1):</em> Caller presses <code>1</code> to request details &rarr; Trigger immediate WhatsApp brochure & flag as <strong>VIP / Hot Lead</strong>.</li>
      <li><em>Option 2 (Duration Threshold):</em> All callers connected for &gt;10 seconds automatically receive the WhatsApp overview.</li>
    </ul>
  </li>
</ul>

<h1>4. Module 2: WhatsApp Marketing & Post-Call Automation</h1>
<h2>4.1 WhatsApp Message Structure & Media Assets</h2>
<ul>
  <li><strong>Header Media:</strong> Master Plan Brochure PDF or Grand Entrance 3D Architectural Render.</li>
  <li><strong>Body Copy:</strong> Tailored pitch highlighting 1,000 plots, wide roads, green parks, temple, ready registry, and flexible payment plans.</li>
  <li><strong>Interactive Action Buttons:</strong>
    <ul>
      <li><code>[🚗 Book Free Site Visit]</code> &ndash; Initiates cab pickup coordination from Udaipur city.</li>
      <li><code>[📄 View Master Plan]</code> &ndash; Direct access to plot layout and dimensions.</li>
      <li><code>[📞 Call Sales Team]</code> &ndash; Direct one-tap click-to-call to KRE Solitaire sales managers.</li>
    </ul>
  </li>
</ul>

<h2>4.2 WhatsApp Route Options for 9 Lakh Volume</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Feature</th>
      <th style="width: 38%;">Meta Official Cloud API (WABA)</th>
      <th style="width: 37%;">High-Volume Bulk Gateway Route</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Sender Identity</strong></td>
      <td>Client's Official Verified Brand Number</td>
      <td>Rotating Enterprise Virtual Channels</td>
    </tr>
    <tr>
      <td><strong>Meta Quality / Ban Risk</strong></td>
      <td>Zero ban risk (100% Meta compliant)</td>
      <td>Channels rotate automatically; zero risk to client number</td>
    </tr>
    <tr>
      <td><strong>Daily Sending Limit</strong></td>
      <td>Scaled via Meta Tiers (1k &rarr; 10k &rarr; 100k &rarr; Unlimited)</td>
      <td>High throughput (1,00,000+ messages daily)</td>
    </tr>
    <tr>
      <td><strong>Call-to-Action (CTA)</strong></td>
      <td>Interactive Native Buttons (Quick Reply &amp; URL)</td>
      <td>Rich Media with Click-to-Chat Redirect Link</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<h1>5. Commercial Quotation Framework & Scope (For Ghinix Infotech)</h1>
<p>
  This framework provides the scope parameters and operational requirements for Manvay and the Ghinix Infotech commercial team to finalize the client quotation for Khodaniya Group.
</p>

<h2>5.1 Meta Official Cloud API Reference Tariff</h2>
<div class="highlight-box">
  <strong>Meta Official Standard Reference:</strong>
  Under Meta Platforms, Inc. official rate card for India, business-initiated <code>MARKETING</code> conversations are billed at approximately <strong>~₹0.78 to ₹0.82 per delivered 24-hour conversation window</strong>. This fee is a direct pass-through/official Meta charge applicable when utilizing the verified Meta Cloud API route.
</div>

<h2>5.2 Deliverables Checklist for Ghinix Infotech Rate Card</h2>

<table>
  <thead>
    <tr>
      <th style="width: 30%;">Package / Deliverable</th>
      <th style="width: 30%;">Operational Scope &amp; Unit</th>
      <th style="width: 40%;">Ghinix Infotech Official Quotation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Package 1: Pure WhatsApp Blast</strong></td>
      <td>9,00,000 Database &bull; Per Delivered Message</td>
      <td><em>[To be quoted by Ghinix Infotech]</em></td>
    </tr>
    <tr>
      <td><strong>Package 2: Automated OBD Voice Calls</strong></td>
      <td>9,00,000 Dials &bull; Per 30s Answered Call</td>
      <td><em>[To be quoted by Ghinix Infotech]</em></td>
    </tr>
    <tr>
      <td><strong>Package 3: Post-Call WhatsApp Drop</strong></td>
      <td>Webhook Trigger &bull; Per Triggered Message</td>
      <td><em>[To be quoted by Ghinix Infotech]</em></td>
    </tr>
    <tr>
      <td><strong>Package 4: Comprehensive Turnkey Combo</strong></td>
      <td>OBD Calling + Instant WhatsApp (Turnkey)</td>
      <td><em>[To be quoted by Ghinix Infotech]</em></td>
    </tr>
    <tr>
      <td><strong>Data Scrubbing &amp; WhatsApp Filter</strong></td>
      <td>9,00,000 Numbers Validation</td>
      <td><em>[To be quoted / bundled by Ghinix]</em></td>
    </tr>
    <tr>
      <td><strong>Alpha CRM Workspace &amp; AI Bot Setup</strong></td>
      <td>Dashboard, Live Telemetry &amp; 24/7 AI Bot</td>
      <td><em>[To be quoted by Ghinix Infotech]</em></td>
    </tr>
  </tbody>
</table>

<h1>6. Project Rollout Plan & Execution Timeline</h1>
<ul>
  <li><strong>Phase 1 (Days 1–2):</strong> Database Ingestion, Scrubbing & WhatsApp Verification of 9 Lakh records. Recording & approval of studio promotional audio prompt.</li>
  <li><strong>Phase 2 (Days 2–3):</strong> Alpha CRM telephony webhook configuration, WhatsApp media creative upload & Meta template setup.</li>
  <li><strong>Phase 3 (Day 4):</strong> Pilot blast of 5,000 calls + WhatsApp triggers to verify connectivity, delivery rates, and CRM lead routing.</li>
  <li><strong>Phase 4 (Days 5–14):</strong> Phased campaign rollout across 3 batches (2.5L &ndash; 3L contacts per batch) with real-time delivery telemetry.</li>
</ul>

<h1>7. Action Items for Manvay</h1>
<ol>
  <li><strong>Telephony Capacity Allocation:</strong> Ensure 250+ concurrent channels are reserved on Alpha CRM's OBD gateway for daily call throughput.</li>
  <li><strong>Input Official Rates:</strong> Populate Ghinix Infotech's official commercial rates in the Section 5.2 matrix.</li>
  <li><strong>Generate Client Proposal:</strong> Issue the formal quotation letter on Ghinix Infotech / Alpha CRM letterhead for Khodaniya Group management.</li>
</ol>

<div style="margin-top: 35px; padding-top: 15px; border-top: 1px solid #CBD5E1; text-align: center; font-size: 8pt; color: #94A3B8;">
  KRE Solitaire &bull; Alpha CRM / Ghinix Infotech Technical &amp; Commercial Scope &bull; Confidential
</div>

</body>
</html>
"""

html_path = "/Users/gaura1/Projects/carbon-ai-main/KRE_Solitaire_AlphaCRM_PRD.html"
pdf_path = "/Users/gaura1/Projects/carbon-ai-main/KRE_Solitaire_AlphaCRM_PRD.pdf"

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print("HTML written to:", html_path)

chrome_cmd = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "--headless",
    "--disable-gpu",
    "--user-data-dir=/tmp/chrome_pdf_user_data",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_path}",
    html_path
]

res = subprocess.run(chrome_cmd, capture_output=True, text=True)
if res.returncode == 0:
    print("SUCCESS: PDF successfully generated at:", pdf_path)
    file_size = os.path.getsize(pdf_path)
    print(f"PDF Size: {file_size / 1024:.1f} KB")
else:
    print("Chrome Error:", res.stderr)
