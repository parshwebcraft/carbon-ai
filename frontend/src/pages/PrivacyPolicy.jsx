import React from "react";
import LegalLayout from "@/components/LegalLayout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { Shield, Lock, Database, MessageSquare, Trash2, Mail, CheckCircle2 } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      activePage="/privacy-policy"
      title="Privacy Policy"
      subtitle="How ParshAgent collects, processes, protects, and handles your business and customer communication data."
      lastUpdated="October 16, 2026"
    >
      <SEO
        title="Privacy Policy | ParshAgent AI CRM"
        description="Read the official Privacy Policy for ParshAgent. Learn how we handle CRM records, Meta WhatsApp Cloud API data, user privacy, and data deletion requests."
        canonical="https://parshagent.com/privacy-policy"
      />

      {/* Overview Card */}
      <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-5 sm:p-6 mb-8 text-slate-200">
        <div className="flex items-start gap-3">
          <Shield className="h-6 w-6 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-white text-base">Key Privacy Commitments</h3>
            <p className="text-xs sm:text-sm text-slate-300">
              ParshAgent never sells or rents your personal or WhatsApp messaging data. Communication data processed through Meta’s WhatsApp Business Platform is strictly utilized to provide autonomous customer service, sales automation, and CRM record-keeping on behalf of your business.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>1. Introduction &amp; Scope</span>
        </h2>
        <p>
          ParshAgent (“we”, “our”, or “us”) is an AI-powered CRM, sales automation, and business communication software platform operated by <strong>ParshWebCraft</strong>, headquartered in Ahmedabad, Gujarat, India. This Privacy Policy outlines our practices regarding the collection, storage, processing, and safeguarding of information obtained through our website (<a href="https://parshagent.com" className="text-indigo-400 underline">https://parshagent.com</a>), CRM web application, and integrated messaging services.
        </p>
        <p>
          By creating an account, accessing our dashboard, or connecting your business communications to ParshAgent, you acknowledge and agree to the practices outlined in this policy.
        </p>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>2. Information We Collect</span>
        </h2>
        <p>
          We collect and process information only to the extent necessary to deliver and operate our CRM, AI voice calling, and messaging features:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-slate-300">
          <li>
            <strong className="text-white">Account &amp; Administrative Data:</strong> Full name, business email address, phone number, company name, and encrypted login credentials created during registration.
          </li>
          <li>
            <strong className="text-white">CRM Lead &amp; Pipeline Data:</strong> Customer contact details (names, phone numbers, email addresses, geographic location, inquiry budgets, and deal stages) uploaded by business users or captured through customer inquiries.
          </li>
          <li>
            <strong className="text-white">WhatsApp Messaging Data (Meta WhatsApp Cloud API):</strong> When customer messages are transmitted to or from your connected WhatsApp Business Account, we process:
            <ul className="list-circle pl-5 mt-1 space-y-1 text-slate-400 text-xs sm:text-sm">
              <li>Sender and recipient telephone numbers in international E.164 format.</li>
              <li>WhatsApp profile display names.</li>
              <li>Inbound and outbound message text bodies and timestamps.</li>
              <li>Message status updates (sent, delivered, and read receipts).</li>
            </ul>
          </li>
          <li>
            <strong className="text-white">Voice Calling Telemetry &amp; Logs:</strong> Call durations, timestamps, automated transcriptions, AI sentiment analysis, and audio recordings when AI Voice Calling features are enabled.
          </li>
          <li>
            <strong className="text-white">Technical &amp; Session Storage:</strong> Standard server access logs (IP addresses, user agents) and browser local storage (<code className="text-indigo-300 bg-white/5 px-1 py-0.5 rounded">localStorage</code>) strictly used to maintain authenticated user sessions.
          </li>
        </ul>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>3. Purpose of Processing</span>
        </h2>
        <p>We process the data described above exclusively for legitimate business and operational functions:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 space-y-1">
            <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> CRM Record Management
            </div>
            <p className="text-xs text-slate-400">Organizing customer inquiries, follow-up tasks, and sales stages for your sales representatives.</p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 space-y-1">
            <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Communication Delivery
            </div>
            <p className="text-xs text-slate-400">Transmitting WhatsApp messages and outbound voice calls requested by your business account.</p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 space-y-1">
            <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> AI Sales Assistance
            </div>
            <p className="text-xs text-slate-400">Generating conversation summaries, drafting suggested replies, and assessing lead qualification scores.</p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 space-y-1">
            <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Security &amp; Compliance
            </div>
            <p className="text-xs text-slate-400">Preventing unauthorized access, defending against abuse, and maintaining audit logs.</p>
          </div>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-400" />
          <span>4. Meta WhatsApp Business Platform Compliance</span>
        </h2>
        <p>
          ParshAgent integrates with Meta’s official WhatsApp Cloud API. We operate under strict data stewardship standards compliant with Meta Platform Terms and Developer Policies:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-slate-300">
          <li>
            <strong className="text-white">Strict Non-Monetization:</strong> We do <strong>NOT</strong> sell, rent, monetize, or broker WhatsApp messages, contact lists, or end-customer data to any third party under any circumstances.
          </li>
          <li>
            <strong className="text-white">No Advertising Profiles:</strong> We do <strong>NOT</strong> inspect WhatsApp communication content to build advertising profiles, nor do we share message records with advertising networks.
          </li>
          <li>
            <strong className="text-white">Processor Status:</strong> When processing WhatsApp messaging on behalf of your business, ParshAgent acts as a data processor / service provider. You, the business client, remain the data controller responsible for ensuring necessary user consents.
          </li>
        </ul>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock className="h-5 w-5 text-indigo-400" />
          <span>5. Data Storage, Security &amp; Infrastructure</span>
        </h2>
        <p>We implement technical and organizational measures to safeguard your information:</p>
        <ul className="list-disc pl-5 space-y-2 text-slate-300">
          <li>
            <strong className="text-white">Encrypted Transmission:</strong> All web traffic, API requests, and webhooks between user browsers, our servers, and Meta's infrastructure are encrypted in transit using industry-standard HTTPS / TLS.
          </li>
          <li>
            <strong className="text-white">Database Isolation:</strong> Application data is stored in dedicated PostgreSQL relational database schemas hosted on secured server instances with active firewall configurations.
          </li>
          <li>
            <strong className="text-white">Access Governance:</strong> Administrative access to production databases and backend servers is restricted to authorized personnel through key-based authentication.
          </li>
        </ul>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-400" />
          <span>6. Third-Party Service Providers</span>
        </h2>
        <p>
          We rely on select third-party infrastructure and service providers to operate platform functionality:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
          <li><strong className="text-white">Meta Platforms, Inc.:</strong> Official WhatsApp Cloud API provider for message dispatch and webhook reception.</li>
          <li><strong className="text-white">Razorpay Software Private Limited:</strong> Handles subscription payment processing. Payment card details are processed directly by Razorpay and are never stored on ParshAgent servers.</li>
          <li><strong className="text-white">Voice &amp; Telephony Providers:</strong> Telephony providers (OmniDimension / Vapi) used to route AI voice calls.</li>
          <li><strong className="text-white">LLM Intelligence Providers:</strong> OpenAI / DeepSeek models used for conversation transcription and text analysis.</li>
        </ul>
      </section>

      {/* Section 7 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>7. Data Retention</span>
        </h2>
        <p>
          We retain customer and messaging records for as long as your business maintains an active subscription with ParshAgent. If an account is cancelled or terminated, data is retained only for a reasonable period necessary to facilitate account export, satisfy statutory tax obligations, or resolve active billing disputes, after which it is purged.
        </p>
      </section>

      {/* Section 8 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-indigo-400" />
          <span>8. User Rights &amp; Data Deletion Request Process</span>
        </h2>
        <p>
          In accordance with applicable data protection regulations and Meta Platform policies, any user or individual whose personal information is processed by ParshAgent has the right to request access to, correction of, or permanent deletion of their data.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 text-sm text-slate-300">
          <div className="font-semibold text-white">How to Submit a Data Deletion Request:</div>
          <p>
            Please send an email from your verified email address to:{" "}
            <a href="mailto:support@parshwebcraft.in?subject=Data%20Deletion%20Request%20-%20ParshAgent" className="text-indigo-400 underline font-medium">
              support@parshwebcraft.in
            </a>
          </p>
          <p>
            <strong>Subject Line:</strong> <code className="text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded">Data Deletion Request - ParshAgent</code>
          </p>
          <p>
            <strong>Details to Include:</strong> Your full name, associated company name, and the specific phone number(s) or account identifier to be removed.
          </p>
          <p className="text-xs text-slate-400 pt-1">
            For security, our team may verify account ownership before processing. Verified requests are processed in accordance with our documented <Link to="/data-deletion" className="text-indigo-400 underline">Data Deletion Instructions</Link>.
          </p>
        </div>
      </section>

      {/* Section 9 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">9. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect operational modifications, product enhancements, or regulatory requirements. The “Last Updated” date at the top of this page indicates when the latest revisions took effect. Continued use of ParshAgent after revisions constitutes acceptance of the updated terms.
        </p>
      </section>

      {/* Section 10 */}
      <section className="space-y-3 border-t border-white/10 pt-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Mail className="h-5 w-5 text-indigo-400" />
          <span>10. Contact Us</span>
        </h2>
        <p>If you have any questions, inquiries, or privacy concerns regarding this policy, please reach out to our team:</p>
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 text-xs sm:text-sm text-slate-300 space-y-1.5">
          <div><strong className="text-white">Platform:</strong> ParshAgent (operated by ParshWebCraft)</div>
          <div><strong className="text-white">Support Email:</strong> <a href="mailto:support@parshwebcraft.in" className="text-indigo-400 underline">support@parshwebcraft.in</a></div>
          <div><strong className="text-white">Phone:</strong> <a href="tel:+919521347419" className="text-indigo-400 underline">+91 95213 47419</a></div>
          <div><strong className="text-white">Location:</strong> Ahmedabad, Gujarat, India</div>
          <div><strong className="text-white">Help Desk:</strong> <Link to="/support" className="text-indigo-400 underline">https://parshagent.com/support</Link></div>
        </div>
      </section>
    </LegalLayout>
  );
}
