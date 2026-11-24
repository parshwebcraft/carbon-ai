import React from "react";
import LegalLayout from "@/components/LegalLayout";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { Cookie, Shield, CheckCircle, Database, HelpCircle } from "lucide-react";

export default function CookiePolicy() {
  return (
    <LegalLayout
      activePage="/cookie-policy"
      title="Cookie &amp; Local Storage Policy"
      subtitle="How ParshAgent uses browser storage technologies to maintain secure user sessions and application state."
      lastUpdated="October 16, 2026"
    >
      <SEO
        title="Cookie & Local Storage Policy | ParshAgent AI CRM"
        description="Learn how ParshAgent utilizes essential client-side local storage for session authentication. Understand our zero-advertising-cookies commitment."
        canonical="https://parshagent.com/cookie-policy"
      />

      {/* Highlights Card */}
      <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-5 sm:p-6 mb-8 text-slate-200">
        <div className="flex items-start gap-3">
          <Cookie className="h-6 w-6 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-white text-base">Zero Advertising Cookies Commitment</h3>
            <p className="text-xs sm:text-sm text-slate-300">
              ParshAgent does not deploy third-party advertising cookies or cross-site behavioral tracking scripts. We utilize strictly essential browser storage to keep you logged in to your CRM dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white">1. What Are Cookies &amp; Local Storage?</h2>
        <p>
          Cookies are small text files placed on your device by websites you visit. Similar modern web technologies, such as browser Local Storage (<code className="text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded">localStorage</code>) and Session Storage, store technical data directly within your web browser to preserve user preferences and authentication state between visits.
        </p>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-400" />
          <span>2. How ParshAgent Uses Storage Technologies</span>
        </h2>
        <p>
          We use strictly essential client-side storage mechanisms necessary for the core functionality of the platform:
        </p>

        <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/5">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-white/5 text-slate-300 font-semibold border-b border-white/10">
              <tr>
                <th className="p-3.5 sm:p-4">Key / Identifier</th>
                <th className="p-3.5 sm:p-4">Type</th>
                <th className="p-3.5 sm:p-4">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              <tr>
                <td className="p-3.5 sm:p-4 font-mono text-indigo-300">facets_token</td>
                <td className="p-3.5 sm:p-4">localStorage</td>
                <td className="p-3.5 sm:p-4">Stores the secure JWT access token required to authenticate API requests to your CRM dashboard.</td>
              </tr>
              <tr>
                <td className="p-3.5 sm:p-4 font-mono text-indigo-300">facets_refresh</td>
                <td className="p-3.5 sm:p-4">localStorage</td>
                <td className="p-3.5 sm:p-4">Used to refresh expired session tokens without forcing you to log in repeatedly.</td>
              </tr>
              <tr>
                <td className="p-3.5 sm:p-4 font-mono text-indigo-300">facets_user</td>
                <td className="p-3.5 sm:p-4">localStorage</td>
                <td className="p-3.5 sm:p-4">Caches user profile details (name, email, role) to render the navigation header smoothly.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          <span>3. Third-Party Analytics &amp; Advertising</span>
        </h2>
        <p>
          ParshAgent does <strong>NOT</strong> install third-party tracking pixels, marketing beacons, or advertising cookies (such as Facebook Pixel or cross-domain ad retargeters). Any communication with third parties (such as Meta’s WhatsApp Cloud API or Razorpay) takes place via server-to-server API calls or secure payment redirects, not via tracking cookies embedded in your browser.
        </p>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-indigo-400" />
          <span>4. Managing &amp; Clearing Browser Storage</span>
        </h2>
        <p>
          You have full control over data stored on your device. You can view, clear, or block cookies and local storage through your browser settings:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
          <li><strong>Google Chrome:</strong> Settings &gt; Privacy and Security &gt; Cookies and other site data.</li>
          <li><strong>Mozilla Firefox:</strong> Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data.</li>
          <li><strong>Apple Safari:</strong> Preferences &gt; Privacy &gt; Manage Website Data.</li>
        </ul>
        <p className="text-xs sm:text-sm text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
          <strong>Note:</strong> Because <code className="bg-white/5 px-1 py-0.5 rounded">localStorage</code> is required to authenticate your account session, clearing or blocking it will log you out of the CRM dashboard and require you to sign in again.
        </p>
      </section>

      {/* Section 5 */}
      <section className="space-y-3 border-t border-white/10 pt-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-indigo-400" />
          <span>5. Contact Us</span>
        </h2>
        <p className="text-sm text-slate-300">
          If you have questions regarding our use of cookies or browser storage, please contact us at:{" "}
          <a href="mailto:support@parshwebcraft.in" className="text-indigo-400 underline">support@parshwebcraft.in</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
