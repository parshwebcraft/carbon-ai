import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Wifi,
  Save,
  LogOut,
  Smartphone,
  Info,
  ChevronRight,
  ExternalLink,
  Lock,
} from "lucide-react";

// Reusable WhatsApp Icon
function WhatsAppIcon({ className = "w-5 h-5 text-emerald-500" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.668-.699c.969.585 1.761.884 2.792.884h.001c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.77-5.769-5.77zm3.364 8.163c-.144.406-.837.774-1.173.824-.312.046-.713.075-2.285-.575-1.921-.795-3.155-2.751-3.25-2.879-.096-.128-.773-1.03-.773-1.964s.484-1.396.657-1.588c.173-.192.38-.24.507-.24.127 0 .254.001.365.006.117.006.275-.045.43.329.16.386.545 1.332.593 1.428.048.096.08.208.016.335-.064.127-.096.208-.192.32-.096.112-.202.25-.289.336-.096.096-.197.2-.085.392.112.192.497.82 1.066 1.327.733.653 1.352.855 1.544.951.192.096.304.08.416-.048.112-.128.48-.56.608-.752.128-.192.256-.16.432-.096.176.064 1.118.528 1.31.624.192.096.32.144.368.224.048.08.048.464-.096.87zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.306A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.154c-1.636 0-3.153-.473-4.436-1.288l-.318-.202-2.96.776.79-2.885-.221-.352A8.116 8.116 0 013.846 12c0-4.496 3.658-8.154 8.154-8.154 4.496 0 8.154 3.658 8.154 8.154 0 4.496-3.658 8.154-8.154 8.154z"/>
    </svg>
  );
}

export default function MetaWhatsApp() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Form State
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [appId, setAppId] = useState("");

  // Live status from API
  const [status, setStatus] = useState(null);

  const webhookUrl = status?.webhook_url || "https://parshagent.com/api/whatsapp/webhook";
  const verifyToken = status?.verify_token || "ParshAgent_WA_Verify_2026_9xK7mP4q";

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.get("/whatsapp/connection-status");
      setStatus(res.data);
      if (res.data) {
        if (res.data.phone_number_id) setPhoneNumberId(res.data.phone_number_id);
        if (res.data.waba_id) setWabaId(res.data.waba_id);
        if (res.data.app_id) setAppId(res.data.app_id);
      }
    } catch (e) {
      console.error("Failed to load connection status", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function copyToClipboard(text, isWebhook = true) {
    navigator.clipboard.writeText(text);
    if (isWebhook) {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
      toast.success("Webhook URL copied to clipboard!");
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
      toast.success("Verify Token copied to clipboard!");
    }
  }

  // Fetch / Test Connection
  async function handleFetch() {
    if (!phoneNumberId.trim()) {
      toast.error("Please enter Business Phone Number ID to test.");
      return;
    }
    if (!accessToken.trim() && !status?.connected) {
      toast.error("Please enter Meta Access Token to test.");
      return;
    }
    setFetching(true);
    try {
      const res = await api.post("/whatsapp/fetch-meta-details", {
        phone_number_id: phoneNumberId.trim(),
        access_token: accessToken.trim() || undefined,
      });
      if (res.data.success) {
        toast.success(
          `Connected! Phone: ${res.data.display_phone_number} | Verified Name: ${res.data.verified_name || "Official"}`
        );
        loadData();
      } else {
        toast.error(res.data.message || "Meta validation failed.");
      }
    } catch (e) {
      toast.error(errMsg(e, "Could not reach Meta API"));
    } finally {
      setFetching(false);
    }
  }

  // Save Connection
  async function handleSave(e) {
    if (e) e.preventDefault();
    if (!phoneNumberId.trim()) {
      toast.error("Business Phone Number ID is required.");
      return;
    }
    if (!accessToken.trim() && !status?.connected) {
      toast.error("Meta Access Token is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/whatsapp/manual-connect", {
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim() || null,
        access_token: accessToken.trim() || undefined,
      });
      toast.success(res.data.message || "Meta API keys saved successfully!");
      loadData();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  // Disconnect
  async function handleDisconnect() {
    if (!window.confirm("Are you sure you want to disconnect this WhatsApp number?")) return;
    try {
      await api.post("/whatsapp/disconnect");
      toast.success("WhatsApp disconnected.");
      setAccessToken("");
      loadData();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/dashboard" className="hover:text-slate-800 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/whatsapp" className="hover:text-slate-800 transition-colors">
          WhatsApp
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-slate-800">wa-meta-manual</span>
      </div>

      {/* Main Card (Matching Alpha CRM wa-meta-manual) */}
      <Card className="border border-slate-200/90 bg-white rounded-2xl shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <WhatsAppIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Meta API Keys</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Manual Setup
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Connect your WhatsApp Business account using official Meta Cloud API keys.
              </p>
            </div>
          </div>

          {status?.connected && (
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-3 py-1 text-xs font-semibold gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Active on Cloud API
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 h-8 gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </Button>
            </div>
          )}
        </div>

        {/* Info Banner (Exact Alpha CRM Style) */}
        <div className="mx-6 mt-6 p-4 rounded-xl bg-sky-50/80 border border-sky-200/80 text-sky-950 flex items-start gap-3 text-xs leading-relaxed">
          <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-sky-900 block mb-0.5">
              Official WhatsApp Cloud API Direct Setup:
            </span>
            <p className="text-sky-800">
              WhatsApp Embed Login (Continue with Facebook) abhi review/verification phase me hai. Aap niche diye gaye Manual Setup se apni Meta Business API keys daal kar apna official WhatsApp number instantly link kar sakte hain.
            </p>
          </div>
        </div>

        {/* Live Connected Status Details (If already connected) */}
        {status?.connected && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs grid sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Official Phone Number</div>
              <div className="text-sm font-bold text-slate-900 font-mono mt-0.5 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                {status.display_phone_number}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Verified Name</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">
                {status.verified_name || "Official WhatsApp Business"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Quality Rating</div>
              <div className="text-sm font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {status.quality_rating || "GREEN"}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Webhook URL Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span>🔗 Your Webhook URL</span>
              </label>
              <span className="text-[10px] text-slate-400">
                Paste this into Meta Developer Portal &gt; WhatsApp &gt; Configuration
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 flex items-center truncate">
                {webhookUrl}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(webhookUrl, true)}
                className="h-10 px-3.5 border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5 shrink-0"
              >
                {copiedWebhook ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedWebhook ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Verify Token Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span>🛡️ Webhook Verify Token</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 flex items-center truncate">
                {verifyToken}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(verifyToken, false)}
                className="h-10 px-3.5 border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5 shrink-0"
              >
                {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedToken ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-4">
            {/* Input 1: WhatsApp Business Account ID (WABA ID) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                WhatsApp Business Account ID
              </label>
              <Input
                placeholder="e.g. 3580112308818227"
                value={wabaId}
                onChange={e => setWabaId(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
              <span className="text-[11px] text-slate-400">
                Found in Meta Business Suite &gt; Business Settings &gt; WhatsApp Accounts
              </span>
            </div>

            {/* Input 2: Meta Access Token */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Meta Access Token <span className="text-rose-500">*</span>
              </label>
              <Input
                type="password"
                placeholder={status?.connected ? "•••••••••••••••• (Leave blank to keep saved token)" : "EAAG... (Permanent System User Token)"}
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                className="h-10 text-xs font-mono rounded-xl"
              />
              <span className="text-[11px] text-slate-400">
                Permanent token recommended (from Meta Business Manager &gt; System Users)
              </span>
            </div>

            {/* Input 3: Business Phone Number ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Business Phone Number ID <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. 1291136754082362"
                value={phoneNumberId}
                onChange={e => setPhoneNumberId(e.target.value)}
                className="h-10 text-xs font-mono rounded-xl"
                required
              />
              <span className="text-[11px] text-slate-400">
                Found in Meta Developer Portal &gt; WhatsApp &gt; API Setup
              </span>
            </div>

            {/* Input 4: App ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                App ID
              </label>
              <Input
                placeholder="e.g. 1598038242335524"
                value={appId}
                onChange={e => setAppId(e.target.value)}
                className="h-10 text-xs font-mono rounded-xl"
              />
              <span className="text-[11px] text-slate-400">
                Found at the top of your Meta Developer App dashboard
              </span>
            </div>
          </div>

          {/* Action Buttons: Save & Fetch (Exact Alpha CRM Style) */}
          <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#008069] hover:bg-[#006654] text-white font-semibold text-xs h-11 px-6 rounded-xl shadow-xs gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleFetch}
              disabled={fetching}
              className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs h-11 px-5 rounded-xl gap-2"
            >
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4 text-emerald-600" />}
              Fetch
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
