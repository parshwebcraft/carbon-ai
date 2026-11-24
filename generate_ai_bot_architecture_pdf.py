import subprocess
import os

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ParshAgent WhatsApp AI Bot - Technical Architecture Document</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {
    size: A4;
    margin: 16mm 14mm 16mm 14mm;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #0F172A;
    line-height: 1.6;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
    background: #FFFFFF;
  }

  .header-card {
    background: linear-gradient(135deg, #0A111C 0%, #152233 100%);
    border-radius: 12px;
    padding: 24px 28px;
    color: #FFFFFF;
    margin-bottom: 22px;
    border-bottom: 4px solid #10B981;
  }

  .brand-badge {
    display: inline-block;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid #10B981;
    color: #34D399;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }

  .title {
    font-size: 20pt;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0 0 6px 0;
    color: #F8FAFC;
  }

  .subtitle {
    font-size: 10.5pt;
    color: #94A3B8;
    margin: 0;
  }

  .meta-bar {
    display: flex;
    justify-content: space-between;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 8pt;
    color: #CBD5E1;
  }

  .summary-box {
    background: #F8FAFC;
    border-left: 4px solid #4F46E5;
    padding: 14px 18px;
    border-radius: 0 10px 10px 0;
    margin-bottom: 22px;
    font-size: 9.5pt;
    border: 1px solid #E2E8F0;
    border-left-width: 4px;
    border-left-color: #4F46E5;
  }

  h2 {
    font-size: 13pt;
    font-weight: 800;
    color: #0F172A;
    border-bottom: 2px solid #E2E8F0;
    padding-bottom: 6px;
    margin-top: 22px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .layer-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 16px 18px;
    margin-bottom: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    page-break-inside: avoid;
  }

  .layer-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .tag-deterministic {
    background: #EFF6FF;
    color: #1D4ED8;
    border: 1px solid #BFDBFE;
  }

  .tag-rag {
    background: #FDF4FF;
    color: #A21CAF;
    border: 1px solid #F5D0FE;
  }

  .tag-llm {
    background: #ECFDF5;
    color: #047857;
    border: 1px solid #A7F3D0;
  }

  .tag-fallback {
    background: #FFFBEB;
    color: #B45309;
    border: 1px solid #FDE68A;
  }

  .layer-title {
    font-size: 11pt;
    font-weight: 700;
    color: #0F172A;
    margin: 0 0 6px 0;
  }

  .feature-list {
    margin: 8px 0 0 0;
    padding-left: 20px;
  }

  .feature-list li {
    margin-bottom: 5px;
    color: #334155;
  }

  .feature-list strong {
    color: #0F172A;
  }

  .table-box {
    width: 100%;
    border-collapse: collapse;
    margin-top: 14px;
    margin-bottom: 20px;
    font-size: 8.5pt;
  }

  .table-box th {
    background: #0F172A;
    color: #FFFFFF;
    text-align: left;
    padding: 8px 12px;
    font-weight: 600;
  }

  .table-box td {
    padding: 8px 12px;
    border-bottom: 1px solid #E2E8F0;
    color: #334155;
  }

  .table-box tr:nth-child(even) td {
    background: #F8FAFC;
  }

  .code-badge {
    font-family: 'JetBrains Mono', monospace;
    background: #F1F5F9;
    padding: 1px 4px;
    border-radius: 4px;
    font-size: 8pt;
    color: #0F172A;
  }

  .footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #E2E8F0;
    text-align: center;
    font-size: 7.5pt;
    color: #94A3B8;
  }
</style>
</head>
<body>

<div class="header-card">
  <span class="brand-badge">ParshAgent AI Architecture Whitepaper</span>
  <h1 class="title">WhatsApp AI Bot Reply Engine Architecture</h1>
  <p class="subtitle">Deep Dive: Deterministic Safety + In-Context RAG + Multi-Model LLM Reasoning + Resilient Fallback</p>
  <div class="meta-bar">
    <span><strong>Platform:</strong> ParshAgent Multi-Tenant AI CRM</span>
    <span><strong>Engine:</strong> Hybrid Conversational AI Architecture</span>
    <span><strong>Status:</strong> Production Verified (v2.4)</span>
  </div>
</div>

<div class="summary-box">
  <strong>Executive Classification: HYBRID ARCHITECTURE</strong><br>
  ParshAgent ka WhatsApp AI reply bot na to ek rigid static bot hai aur na hi bina guardrails wala open-ended generic LLM chat. Ye ek <strong>4-Tier Hybrid Engine</strong> hai jo rule-based deterministic safety controls, real-time knowledge retrieval (In-Context RAG), aur few-shot conversational reasoning ko ek seamless pipeline me unite karta hai.
</div>

<h2>The 4 Pillars of the AI WhatsApp Engine</h2>

<!-- POINT 1 -->
<div class="layer-card">
  <span class="layer-tag tag-deterministic">Pillar 1: Deterministic Guardrail Layer</span>
  <h3 class="layer-title">1. Deterministic Intent Triaging, Safety Checks &amp; Human Handover</h3>
  <p style="margin:0 0 6px 0; color:#475569;">
    Ye layer har incoming webhook message ko LLM tak pahuchne se pehle evaluate karta hai. Iska objective 100% predictable safety aur multi-tenant isolation ensure karna hai:
  </p>
  <ul class="feature-list">
    <li><strong>Zero-Latency Human Escalation:</strong> Code (<span class="code-badge">whatsapp_webhook.py</span>) inbound text ko deterministic keyword matcher se scan karta hai (jaise: <em>"talk to human"</em>, <em>"agent please"</em>, <em>"connect to human"</em>, <em>"real person"</em>, <em>"insan"</em>, <em>"kisi se baat karwao"</em>) ya quick-reply CTA buttons se.</li>
    <li><strong>Automatic Bot Pause:</strong> Jaise hi human handover trigger hota hai, lead par <span class="code-badge">ai_bot_paused = True</span> aur status <span class="code-badge">Needs human</span> set ho jata hai. Bot beech me bolna band kar deta hai taaki human agent conversation take over kar sake.</li>
    <li><strong>Instant Dual Alerts:</strong> Customer ko human acknowledgment milta hai aur company founder/sales agent ko dual alert (WhatsApp + CRM notification) dispatch hota hai.</li>
    <li><strong>Company Scoping:</strong> Strict multi-tenant boundaries ensure karti hain ki ek company ka bot dusri company ke leads ya data ko access na kare.</li>
  </ul>
</div>

<!-- POINT 2 -->
<div class="layer-card">
  <span class="layer-tag tag-rag">Pillar 2: Retrieval-Augmented Generation (RAG)</span>
  <h3 class="layer-title">2. In-Context Dynamic RAG (Knowledge &amp; CRM Context Assembly)</h3>
  <p style="margin:0 0 6px 0; color:#475569;">
    Customer ke query ka exact reply generate karne ke liye system live context assemble karta hai:
  </p>
  <ul class="feature-list">
    <li><strong>Tenant Knowledge Chunks:</strong> Company ke personalized catalog, services, deliverables, FAQs aur offerings dynamic database se fetch kiye jate hain (<span class="code-badge">agent_cfg.knowledge_chunks</span>).</li>
    <li><strong>Rich CRM Lead Profile:</strong> Lead ka name, city, customer category, budget expectation aur pipeline stage prompt me dynamically inject hota hai.</li>
    <li><strong>Multi-Turn Conversational Memory:</strong> Pichle 10–12 conversation messages (<span class="code-badge">Customer: ...</span> aur <span class="code-badge">Agent: ...</span>) assemble kiye jate hain taaki bot pichli baat bhool kar irrelevant reply na kare.</li>
  </ul>
</div>

<!-- POINT 3 -->
<div class="layer-card">
  <span class="layer-tag tag-llm">Pillar 3: Few-Shot LLM Reasoning &amp; Guardrails</span>
  <h3 class="layer-title">3. Multi-Model LLM Reasoning &amp; Strict Domain Guardrails</h3>
  <p style="margin:0 0 6px 0; color:#475569;">
    Unified LLM provider engine (<span class="code-badge">backend/services/llm.py</span>) Groq (GPT-OSS-120B), OpenAI (GPT-4o-mini), Google Gemini, ya DeepSeek ko call karta hai:
  </p>
  <ul class="feature-list">
    <li><strong>Natural Hinglish Tone Matching:</strong> Indian business context ke anusaar natural Hinglish aur casual Indian English me reply karta hai. Heavy formal robot Hindi (e.g. <em>"kripya"</em>, <em>"prati-sheet"</em>) strictly avoid karta hai.</li>
    <li><strong>Strict Pricing Guardrail (Anti-Hallucination):</strong> Bot man-marzi se koi fake packages ya prices fabricate nahi karta (e.g. ₹15,000 ya ₹25,000). Ye politely explain karta hai ki requirements ke according custom scoping proposal share kiya jayega.</li>
    <li><strong>No Sales Pitch on Festival Wishes:</strong> Jab customer festival wish bhejta hai (e.g. <em>"Happy Diwali"</em>, <em>"Same to you"</em>), bot koi sales pitch nahi karta — sirf genuine warmth aur respect se revert karta hai.</li>
    <li><strong>WhatsApp Optimized Brevity:</strong> Response hamesha 1 se 2 sentences (max 3) me restrict rehta hai aur ek samay me sirf EK relevant question puchta hai taaki customer easily reply de sake.</li>
  </ul>
</div>

<!-- POINT 4 -->
<div class="layer-card">
  <span class="layer-tag tag-fallback">Pillar 4: Resilient Recovery Layer</span>
  <h3 class="layer-title">4. Deterministic Fallback Engine (Zero-Downtime Guarantee)</h3>
  <p style="margin:0 0 6px 0; color:#475569;">
    Real-world production environments me external LLM APIs kabhi-kabhi network timeout ya rate-limit ho sakti hain:
  </p>
  <ul class="feature-list">
    <li><strong>Zero Ghosting Architecture:</strong> Agar LLM provider API fail ya timeout hoti hai, customer ka message unreplied nahi rehta.</li>
    <li><strong>Contextual Fallback Rules:</strong> System turant deterministic keyword matcher activate karta hai:
      <ul>
        <li><em>Greetings / Festivals:</em> Warm festival greeting revert.</li>
        <li><em>Personal / Well-being:</em> Friendly cordial responses.</li>
        <li><em>Pricing queries:</em> Polite custom-quote acknowledgment.</li>
        <li><em>Meeting / Call requests:</em> Availability confirmation.</li>
      </ul>
    </li>
    <li><strong>High Reliability:</strong> Customer ko pata bhi nahi chalta ki backend par koi API glitch aayi thi.</li>
  </ul>
</div>

<h2>Architecture Breakdown Matrix</h2>
<table class="table-box">
  <thead>
    <tr>
      <th>Layer Name</th>
      <th>Technical Classification</th>
      <th>Primary Responsibility</th>
      <th>Fail-Safe Mechanism</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Intent &amp; Handover</strong></td>
      <td>Deterministic (Rule-based)</td>
      <td>Human escalation, bot pause, alerts, company isolation</td>
      <td>Instant execution via Python string parsing</td>
    </tr>
    <tr>
      <td><strong>Knowledge Assembly</strong></td>
      <td>In-Context RAG</td>
      <td>Dynamic company chunks, CRM attributes &amp; 12-message history</td>
      <td>Graceful fallback to standard agency knowledge</td>
    </tr>
    <tr>
      <td><strong>Reply Generation</strong></td>
      <td>LLM (Guided Few-Shot)</td>
      <td>Hinglish fluency, anti-hallucination, objection handling</td>
      <td>Strict system constraints &amp; temperature control (0.6)</td>
    </tr>
    <tr>
      <td><strong>Backup Recovery</strong></td>
      <td>Deterministic Fallback</td>
      <td>Immediate response delivery during third-party API timeout</td>
      <td>Hardcoded regex &amp; keyword response trees</td>
    </tr>
  </tbody>
</table>

<div class="footer">
  ParshAgent WhatsApp AI Suite &bull; Confidential &bull; ParshWebCraft Technologies &copy; 2026 &bull; All Rights Reserved
</div>

</body>
</html>
"""

html_path = "/Users/gaura1/Projects/carbon-ai-main/ParshAgent_WhatsApp_AI_Bot_Architecture.html"
pdf_path = "/Users/gaura1/Projects/carbon-ai-main/ParshAgent_WhatsApp_AI_Bot_Architecture.pdf"

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print("HTML written to:", html_path)

chrome_cmd = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "--headless",
    "--disable-gpu",
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
