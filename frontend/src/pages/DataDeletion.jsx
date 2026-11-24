import React from "react";
import LegalLayout from "@/components/LegalLayout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { Trash2, ShieldCheck, Mail, AlertCircle, Clock, Database, CheckCircle2 } from "lucide-react";

export default function DataDeletion() {
  return (
    <LegalLayout
      activePage="/data-deletion"
      title="User Data Deletion Instructions"
      subtitle="How users and individuals can request the deletion of personal data and WhatsApp messaging records stored by ParshAgent."
      lastUpdated="October 16, 2026"
    >
      <SEO
        title="User Data Deletion Instructions | ParshAgent"
        description="Learn how to request deletion of your personal data, CRM records, or WhatsApp messaging history from ParshAgent in compliance with Meta Platform Terms."
        canonical="https://parshagent.com/data-deletion"
      />

      {/* Overview Card */}
      <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-5 sm:p-6 mb-8 text-slate-200">
        <div className="flex items-start gap-3">
          <Trash2 className="h-6 w-6 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-white text-base">Meta Platform Compliance</h3>
            <p className="text-xs sm:text-sm text-slate-300">
              In accordance with Meta Platform Terms and data privacy best practices, ParshAgent provides a clear, transparent mechanism for individuals to request the complete deletion of their personal information and associated messaging logs.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>1. Who Can Request Data Deletion?</span>
        </h2>
        <p>You may submit a data deletion request if you are:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
          <li>An authorized ParshAgent account holder who wishes to terminate their account and remove stored organization records.</li>
          <li>An individual customer or recipient whose phone number, name, or WhatsApp messages have been processed through a ParshAgent business account.</li>
        </ul>
      </section>

      {/* Section 2 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Mail className="h-5 w-5 text-indigo-400" />
          <span>2. How to Submit a Data Deletion Request</span>
        </h2>
        <p>
          To ensure accurate identification and prevent unauthorized deletion of third-party records, data deletion requests are handled via our dedicated compliance email desk:
        </p>

        <div className="bg-slate-900/60 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Destination Email:</div>
            <a 
              href="mailto:support@parshwebcraft.in?subject=Data%20Deletion%20Request%20-%20ParshAgent" 
              className="text-base sm:text-lg font-semibold text-indigo-400 hover:text-indigo-300 underline break-all inline-flex items-center gap-2"
            >
              support@parshwebcraft.in
            </a>
          </div>

          <div className="space-y-1 border-t border-white/5 pt-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject Line:</div>
            <code className="text-indigo-300 bg-white/5 px-2 py-1 rounded text-xs sm:text-sm block sm:inline-block">
              Data Deletion Request - ParshAgent
            </code>
          </div>

          <div className="space-y-2 border-t border-white/5 pt-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Required Information:</div>
            <p className="text-xs sm:text-sm text-slate-300">
              Please specify the following details in your email body:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-300">
              <li><strong className="text-white">Full Name:</strong> The name associated with the records.</li>
              <li><strong className="text-white">Phone Number:</strong> The exact WhatsApp or contact number (with country code, e.g., +91XXXXXXXXXX).</li>
              <li><strong className="text-white">Account Email (if applicable):</strong> If you are a ParshAgent CRM user.</li>
              <li><strong className="text-white">Scope of Deletion:</strong> Whether you request deletion of specific chat records or full account termination.</li>
            </ul>
          </div>

          <div className="pt-2">
            <a 
              href="mailto:support@parshwebcraft.in?subject=Data%20Deletion%20Request%20-%20ParshAgent&body=Hello%20ParshAgent%20Compliance%20Team%2C%0A%0AI%20am%20requesting%20the%20deletion%20of%20my%20personal%20data%20from%20ParshAgent.%0A%0AFull%20Name%3A%20%0APhone%20Number%20(with%20country%20code)%3A%20%0AAccount%20Email%20(if%20any)%3A%20%0ADetails%2FScope%3A%20%0A%0AThank%20you."
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30"
            >
              <Mail className="h-4 w-4" /> Open Pre-Filled Deletion Email
            </a>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-400" />
          <span>3. Identity Verification Process</span>
        </h2>
        <p>
          To safeguard against fraudulent or malicious deletion requests that could disrupt legitimate business operations, our team verifies ownership of the requested phone number or email address prior to purging data. Verification may involve sending an SMS/WhatsApp verification code or requesting an email confirmation from the registered address.
        </p>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-400" />
          <span>4. What Happens to Your Data?</span>
        </h2>
        <p>Once a verified deletion request is processed:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
          <li>
            <strong className="text-white">Active Database Deletion:</strong> All matching rows in the primary PostgreSQL database (including chat threads in <code className="text-indigo-300 bg-white/5 px-1 py-0.5 rounded text-xs">whatsapp_messages</code>, call transcripts, customer notes, and lead details) are permanently deleted.
          </li>
          <li>
            <strong className="text-white">AI Log Redaction:</strong> AI conversation memories and qualification logs tied to the lead identifier are purged.
          </li>
          <li>
            <strong className="text-white">Confirmation:</strong> A formal confirmation email is sent back to the requester notifying them of the completed deletion.
          </li>
        </ul>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-400" />
          <span>5. Statutory Retention Exceptions</span>
        </h2>
        <p>
          Certain transactional records (such as completed subscription payment invoices or audit trails required by Indian taxation authorities) may be retained for statutory periods as mandated by applicable law. Such retained records are archived strictly for compliance purposes and are not processed for marketing or communications.
        </p>
      </section>

      {/* Section 6 */}
      <section className="space-y-3 border-t border-white/10 pt-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-indigo-400" />
          <span>6. Related Policies</span>
        </h2>
        <p className="text-sm text-slate-400">
          For further details on how ParshAgent safeguards your information, please review our{" "}
          <Link to="/privacy-policy" className="text-indigo-400 underline">Privacy Policy</Link> and{" "}
          <Link to="/terms-and-conditions" className="text-indigo-400 underline">Terms &amp; Conditions</Link>.
        </p>
      </section>
    </LegalLayout>
  );
}
