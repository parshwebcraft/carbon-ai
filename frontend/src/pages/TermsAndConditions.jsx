import React from "react";
import LegalLayout from "@/components/LegalLayout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { FileText, ShieldAlert, CheckCircle, Scale, Mail } from "lucide-react";

export default function TermsAndConditions() {
  return (
    <LegalLayout
      activePage="/terms-and-conditions"
      title="Terms &amp; Conditions"
      subtitle="The contractual terms and legal conditions governing your use of ParshAgent's CRM, AI calling, and sales automation platform."
      lastUpdated="October 16, 2026"
    >
      <SEO
        title="Terms & Conditions | ParshAgent AI CRM"
        description="Review the Terms & Conditions governing access to ParshAgent CRM, automated voice calling, WhatsApp messaging integrations, and related software services."
        canonical="https://parshagent.com/terms-and-conditions"
      />

      {/* Notice Card */}
      <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-5 sm:p-6 mb-8 text-slate-200">
        <div className="flex items-start gap-3">
          <FileText className="h-6 w-6 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-white text-base">Service Agreement Overview</h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Please read these Terms &amp; Conditions carefully before accessing ParshAgent. By signing up or utilizing our services, you confirm that you have read, understood, and agreed to be legally bound by this agreement.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
        <p>
          These Terms and Conditions (“Terms”) constitute a legally binding agreement between you (the “Customer”, “User”, or “You”) and <strong>ParshAgent</strong>, a software service operated by <strong>ParshWebCraft</strong> (“we”, “our”, or “us”), governing your access to and use of our website (<a href="https://parshagent.com" className="text-indigo-400 underline">https://parshagent.com</a>), applications, AI telephony features, and WhatsApp automation tools.
        </p>
        <p>
          If you are entering into these Terms on behalf of an enterprise, company, or legal entity, you represent and warrant that you possess full legal authority to bind that entity to these conditions.
        </p>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">2. Description of Service</h2>
        <p>
          ParshAgent provides autonomous business software tools encompassing:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>Customer Relationship Management (CRM) and lead stage pipelines.</li>
          <li>Outbound AI Voice Calling and real-time sales copilot assistance.</li>
          <li>Official Meta WhatsApp Cloud API messaging and conversational follow-ups.</li>
          <li>Quotation creation, sales workflow automation, and customer interaction logs.</li>
        </ul>
        <p>
          We continuously update and enhance our software. We reserve the right to modify, replace, or temporarily suspend specific platform features with prior notice where practicable.
        </p>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">3. User Accounts &amp; Security</h2>
        <p>
          To access the dashboard, you must register for an authorized account with accurate, complete, and current information. You are solely responsible for maintaining the confidentiality of your login credentials and for all activities conducted under your account. You must notify us immediately at <a href="mailto:support@parshwebcraft.in" className="text-indigo-400 underline">support@parshwebcraft.in</a> upon becoming aware of any breach of security or unauthorized access.
        </p>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-indigo-400" />
          <span>4. Permitted &amp; Prohibited Use</span>
        </h2>
        <p>You agree to use ParshAgent exclusively for legitimate business communication purposes and shall NOT:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
          <li>Transmit unsolicited commercial bulk communications ("spam") or conduct harassing, threatening, or deceptive calls or messages.</li>
          <li>Violate applicable telecom regulations, including Telecom Regulatory Authority of India (TRAI) directives, National Do Not Call (NDNC / DND) registries, or telemarketing guidelines.</li>
          <li>Violate the Meta WhatsApp Business Messaging Policy, Commerce Policy, or terms governing acceptable messaging formats.</li>
          <li>Attempt to reverse-engineer, decompile, bypass security measures, or probe vulnerabilities of the ParshAgent infrastructure.</li>
          <li>Store, transmit, or process unlawful content, malware, fraudulent schemes, or infringing intellectual property.</li>
        </ul>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-indigo-400" />
          <span>5. Customer Responsibility for Consent &amp; Lead Data</span>
        </h2>
        <p>
          As between you and ParshAgent, you retain ownership of all customer data, contact records, and lead lists uploaded to your workspace. 
        </p>
        <p>
          <strong>Mandatory Customer Warranty:</strong> You expressly represent and warrant that you have obtained all necessary prior opt-ins, express consents, and legal permissions from your recipients prior to triggering outbound voice calls, WhatsApp messages, or automated email follow-ups through ParshAgent. ParshAgent disclaims any liability arising from your failure to obtain required recipient consent.
        </p>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">6. Third-Party Platform Dependencies</h2>
        <p>
          Our services integrate with third-party software providers, including Meta Platforms, Inc. (WhatsApp Cloud API), telephony voice carriers, and payment gateways. You acknowledge that:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300">
          <li>Service availability, message delivery rates, and template approvals depend in part on Meta’s infrastructure and policies.</li>
          <li>Telephony connectivity depends on carrier networks and telecom infrastructure.</li>
          <li>ParshAgent is not responsible for suspensions, number bans, or delivery delays resulting from third-party policy violations or upstream technical outages.</li>
        </ul>
      </section>

      {/* Section 7 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">7. Subscriptions, Invoicing &amp; Billing</h2>
        <p>
          Access to premium features, AI voice calling credits, and dedicated messaging pipelines is provided under software subscription tiers. Subscription fees are billed in advance in Indian Rupees (INR) or specified currencies. Payments are processed securely via authorized third-party gateways (such as Razorpay).
        </p>
        <p>
          Subscription renewals, credit allocations, and cancellation terms are governed by the specific tier chosen during purchase. Fees paid are non-refundable except as expressly required by applicable statutory law.
        </p>
      </section>

      {/* Section 8 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">8. Intellectual Property</h2>
        <p>
          ParshAgent, including its source code, user interfaces, branding, proprietary algorithms, documentation, and design assets, is and remains the exclusive intellectual property of ParshWebCraft. You are granted a limited, revocable, non-exclusive, non-transferable license to access and use the platform solely for your internal business operations during your active subscription.
        </p>
      </section>

      {/* Section 9 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">9. Disclaimers &amp; Limitation of Liability</h2>
        <p>
          ParshAgent is provided on an “AS IS” and “AS AVAILABLE” basis. To the maximum extent permitted by applicable law, we make no warranties, whether express, implied, or statutory, regarding platform uptime, merchantability, fitness for a particular purpose, or that AI voice simulations will be error-free or result in specific commercial outcomes.
        </p>
        <p>
          In no event shall ParshAgent or ParshWebCraft be liable for indirect, incidental, punitive, or consequential damages, including loss of profits, data loss, or business interruption, arising from your use of or inability to use the platform. Our aggregate liability under these Terms shall not exceed the total fees paid by you to ParshAgent during the twelve (12) months immediately preceding the event giving rise to liability.
        </p>
      </section>

      {/* Section 10 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">10. Suspension &amp; Termination</h2>
        <p>
          We reserve the right to suspend or terminate your account access immediately, without prior notice or liability, if you breach these Terms, engage in fraudulent activities, or cause harm to our infrastructure or other users. Upon termination, your right to use the platform ceases immediately.
        </p>
      </section>

      {/* Section 11 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Scale className="h-5 w-5 text-indigo-400" />
          <span>11. Governing Law &amp; Jurisdiction</span>
        </h2>
        <p>
          These Terms and any dispute arising out of or related to your use of ParshAgent shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles. You agree to submit to the exclusive jurisdiction of the competent courts situated in <strong>Ahmedabad, Gujarat, India</strong>.
        </p>
      </section>

      {/* Section 12 */}
      <section className="space-y-3 border-t border-white/10 pt-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Mail className="h-5 w-5 text-indigo-400" />
          <span>12. Contact Information</span>
        </h2>
        <p>For legal inquiries, notices, or support concerning these Terms, please reach out to:</p>
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 text-xs sm:text-sm text-slate-300 space-y-1.5">
          <div><strong className="text-white">Platform:</strong> ParshAgent (operated by ParshWebCraft)</div>
          <div><strong className="text-white">Support &amp; Legal Notices:</strong> <a href="mailto:support@parshwebcraft.in" className="text-indigo-400 underline">support@parshwebcraft.in</a></div>
          <div><strong className="text-white">Phone:</strong> <a href="tel:+919521347419" className="text-indigo-400 underline">+91 95213 47419</a></div>
          <div><strong className="text-white">Headquarters:</strong> Ahmedabad, Gujarat, India</div>
        </div>
      </section>
    </LegalLayout>
  );
}
