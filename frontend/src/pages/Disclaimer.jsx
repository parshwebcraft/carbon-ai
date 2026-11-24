import React from "react";
import LegalLayout from "@/components/LegalLayout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { AlertCircle, Brain, TrendingUp, Radio, ShieldCheck, Mail } from "lucide-react";

export default function Disclaimer() {
  return (
    <LegalLayout
      activePage="/disclaimer"
      title="Platform Disclaimer"
      subtitle="Important legal clarifications regarding AI outputs, sales outcome disclaimers, and automated communications."
      lastUpdated="October 16, 2026"
    >
      <SEO
        title="Disclaimer | ParshAgent AI CRM"
        description="Read the official product disclaimer for ParshAgent. Understand the scope of AI voice agent outputs, commercial outcomes, and third-party dependencies."
        canonical="https://parshagent.com/disclaimer"
      />

      {/* Highlights Card */}
      <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-5 sm:p-6 mb-8 text-slate-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-white text-base">Important Notice</h3>
            <p className="text-xs sm:text-sm text-slate-300">
              ParshAgent is a software productivity and communication automation platform. AI-generated voice conversations, CRM summaries, and suggested replies are algorithmic tools designed to assist business users. Human supervision is always recommended.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-400" />
          <span>1. Nature of Artificial Intelligence (AI) Outputs</span>
        </h2>
        <p>
          ParshAgent incorporates Large Language Models (LLMs), automated speech recognition (ASR), and text-to-speech (TTS) voice synthesis. While our models are designed to converse naturally in Indian English, Hindi, and Hinglish, artificial intelligence systems can occasionally generate unintended phrasing, incorrect factual statements, or interpretive variances (commonly referred to as "hallucinations").
        </p>
        <p>
          You acknowledge that:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>All AI conversational battlecards, lead scores, and draft replies are recommendations and should be reviewed by qualified personnel.</li>
          <li>ParshAgent does not warrant the absolute accuracy, completeness, or suitability of any AI-generated response in specialized contexts.</li>
          <li>You are responsible for reviewing automated scripts and configuring guardrails appropriate for your specific industry.</li>
        </ul>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          <span>2. No Commercial or Revenue Guarantees</span>
        </h2>
        <p>
          Case studies, return-on-investment (ROI) calculators, and marketing examples displayed on our website illustrate potential efficiencies under simulated or optimal business scenarios. They do <strong>NOT</strong> constitute a warranty, promise, or legal guarantee of specific sales volumes, conversion percentages, closed transactions, or revenue increases for your company.
        </p>
        <p>
          Actual conversion performance depends on numerous independent variables beyond ParshAgent’s control, including product quality, market demand, lead list quality, pricing competitiveness, and sales team responsiveness.
        </p>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Radio className="h-5 w-5 text-indigo-400" />
          <span>3. Automated Telephony &amp; Network Dependencies</span>
        </h2>
        <p>
          Automated voice calls and WhatsApp messages depend on third-party telecommunications infrastructure, mobile networks, internet routing, and Meta’s WhatsApp servers. ParshAgent does not guarantee that voice calls will connect without jitter, latency, or carrier dropped packets, nor that message deliveries will be instantaneous at all times.
        </p>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-400" />
          <span>4. Regulatory &amp; Consent Compliance</span>
        </h2>
        <p>
          Compliance with telemarketing and data privacy laws is a fundamental legal obligation of the business account holder. You are exclusively responsible for ensuring that:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>You possess valid consent or opt-in authorizations from individuals whom you contact via automated voice or WhatsApp.</li>
          <li>Your communications comply with the Telecom Regulatory Authority of India (TRAI) directives, National Customer Preference Register (NCPR / NDNC), and applicable anti-spam laws.</li>
          <li>Your messaging complies with Meta's WhatsApp Business Platform Terms, Commerce Policies, and 24-hour customer service window guidelines.</li>
        </ul>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">5. No Professional, Legal, or Financial Advice</h2>
        <p>
          The content on our website, in documentation, and produced by our automated agents is provided solely for software informational purposes. ParshAgent does not provide legal, financial, accounting, taxation, or certified medical advice. You should seek independent counsel from certified professionals for guidance in those areas.
        </p>
      </section>

      {/* Section 6 */}
      <section className="space-y-3 border-t border-white/10 pt-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Mail className="h-5 w-5 text-indigo-400" />
          <span>6. Questions Regarding This Disclaimer</span>
        </h2>
        <p>For questions or clarifications regarding this disclaimer, please contact:</p>
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 text-xs sm:text-sm text-slate-300 space-y-1">
          <div><strong className="text-white">Email:</strong> <a href="mailto:support@parshwebcraft.in" className="text-indigo-400 underline">support@parshwebcraft.in</a></div>
          <div><strong className="text-white">Phone:</strong> <a href="tel:+919521347419" className="text-indigo-400 underline">+91 95213 47419</a></div>
          <div><strong className="text-white">Address:</strong> ParshAgent / ParshWebCraft, Ahmedabad, Gujarat, India</div>
        </div>
      </section>
    </LegalLayout>
  );
}
