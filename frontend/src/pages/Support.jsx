import React, { useState } from "react";
import LegalLayout from "@/components/LegalLayout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { HelpCircle, Mail, Phone, MapPin, CheckCircle2, MessageSquare, AlertCircle, ArrowRight, ExternalLink } from "lucide-react";

export default function Support() {
  const [category, setCategory] = useState("Technical Issue");
  const [accountEmail, setAccountEmail] = useState("");
  const [details, setDetails] = useState("");

  const handleLaunchEmail = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[ParshAgent Support] ${category} - ${accountEmail || "User"}`);
    const body = encodeURIComponent(
      `Hello ParshAgent Support Team,\n\n` +
      `Category: ${category}\n` +
      `Account Email: ${accountEmail}\n\n` +
      `Issue Description & Details:\n${details}\n\n` +
      `--\nSent from ParshAgent Help Desk`
    );
    window.location.href = `mailto:support@parshwebcraft.in?subject=${subject}&body=${body}`;
  };

  return (
    <LegalLayout
      activePage="/support"
      title="Help &amp; Customer Support"
      subtitle="Have questions about ParshAgent CRM, WhatsApp setup, AI calling, or billing? We are here to assist your team."
      lastUpdated="October 16, 2026"
    >
      <SEO
        title="Help & Support Desk | ParshAgent AI CRM"
        description="Get in touch with ParshAgent support team. Access technical assistance, WhatsApp Cloud API guidance, billing help, and data management resources."
        canonical="https://parshagent.com/support"
      />

      {/* Contact Channels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <a 
          href="mailto:support@parshwebcraft.in" 
          className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 transition-all group focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-105 transition-transform">
            <Mail className="h-5 w-5" />
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email Support</div>
          <div className="text-sm font-semibold text-white break-all group-hover:text-indigo-300">support@parshwebcraft.in</div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1 text-indigo-400">
            Open Email Client <ArrowRight className="h-3 w-3" />
          </div>
        </a>

        <a 
          href="tel:+919521347419" 
          className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 transition-all group focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
            <Phone className="h-5 w-5" />
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Direct Phone</div>
          <div className="text-sm font-semibold text-white group-hover:text-emerald-300">+91 95213 47419</div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1 text-emerald-400">
            Call Sales &amp; Tech Desk <ArrowRight className="h-3 w-3" />
          </div>
        </a>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-3">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Headquarters</div>
          <div className="text-sm font-semibold text-white">Ahmedabad, Gujarat</div>
          <div className="text-xs text-slate-400 mt-2">India • ParshWebCraft Hub</div>
        </div>
      </div>

      {/* Structured Ticket Composer */}
      <section className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="border-b border-white/5 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-400" />
            <span>Submit a Support Request</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Fill in the details below to format an issue ticket that automatically opens in your mail client with verified routing headers.
          </p>
        </div>

        <form onSubmit={handleLaunchEmail} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Issue Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#060713] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="WhatsApp Cloud API Integration">WhatsApp Cloud API Integration</option>
                <option value="AI Voice Calling & Telephony">AI Voice Calling &amp; Telephony</option>
                <option value="CRM Leads & Pipelines">CRM Leads &amp; Pipelines</option>
                <option value="Billing & Razorpay Subscription">Billing &amp; Subscription</option>
                <option value="Data Deletion or Privacy">Data Deletion or Privacy</option>
                <option value="General Technical Support">General Technical Support</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Your Account Email
              </label>
              <input
                type="email"
                required
                placeholder="you@yourcompany.com"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                className="w-full bg-[#060713] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Issue Description &amp; Error Context
            </label>
            <textarea
              rows={4}
              required
              placeholder="Please describe what happened, relevant Lead IDs or phone numbers, and any error message displayed..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-[#060713] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Mail className="h-4 w-4" /> Open Support Email with Ticket Details
          </button>
        </form>
      </section>

      {/* Guidelines Card */}
      <section className="space-y-4 pt-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>Tips for Faster Issue Resolution</span>
        </h3>
        <p className="text-sm text-slate-300">
          When contacting our technical team, including the following details ensures faster diagnostics:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-300">
          <li><strong className="text-white">Account Email:</strong> The registered email associated with your ParshAgent organization.</li>
          <li><strong className="text-white">Timestamp &amp; Timezone:</strong> The approximate time when the issue occurred (e.g., IST).</li>
          <li><strong className="text-white">Affected Phone Number or Lead ID:</strong> For WhatsApp or Voice Call issues, specify the test phone number or Lead ID visible in the dashboard.</li>
          <li><strong className="text-white">Exact Error Text:</strong> Copy-paste the error message or describe the expected vs actual behavior.</li>
        </ul>
      </section>

      {/* Quick Legal Resources */}
      <section className="border-t border-white/10 pt-6 space-y-3">
        <h3 className="text-base font-semibold text-white">Related Resources &amp; Compliance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <Link to="/privacy-policy" className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl flex items-center justify-between text-slate-300 hover:text-white">
            <span>Privacy Policy</span>
            <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
          </Link>
          <Link to="/terms-and-conditions" className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl flex items-center justify-between text-slate-300 hover:text-white">
            <span>Terms &amp; Conditions</span>
            <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
          </Link>
          <Link to="/data-deletion" className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl flex items-center justify-between text-slate-300 hover:text-white">
            <span>Data Deletion Instructions</span>
            <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
          </Link>
        </div>
      </section>
    </LegalLayout>
  );
}
