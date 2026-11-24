import { useState, useEffect } from "react";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Smartphone,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Reusable WhatsApp Icon
function WhatsAppIcon({ className = "w-5 h-5 text-emerald-500" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.668-.699c.969.585 1.761.884 2.792.884h.001c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.77-5.769-5.77zm3.364 8.163c-.144.406-.837.774-1.173.824-.312.046-.713.075-2.285-.575-1.921-.795-3.155-2.751-3.25-2.879-.096-.128-.773-1.03-.773-1.964s.484-1.396.657-1.588c.173-.192.38-.24.507-.24.127 0 .254.001.365.006.117.006.275-.045.43.329.16.386.545 1.332.593 1.428.048.096.08.208.016.335-.064.127-.096.208-.192.32-.096.112-.202.25-.289.336-.096.096-.197.2-.085.392.112.192.497.82 1.066 1.327.733.653 1.352.855 1.544.951.192.096.304.08.416-.048.112-.128.48-.56.608-.752.128-.192.256-.16.432-.096.176.064 1.118.528 1.31.624.192.096.32.144.368.224.048.08.048.464-.096.87zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.306A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.154c-1.636 0-3.153-.473-4.436-1.288l-.318-.202-2.96.776.79-2.885-.221-.352A8.116 8.116 0 013.846 12c0-4.496 3.658-8.154 8.154-8.154 4.496 0 8.154 3.658 8.154 8.154 0 4.496-3.658 8.154-8.154 8.154z"/>
    </svg>
  );
}

export default function WhatsAppConnectModal({ open, onOpenChange, onConnected }) {
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);

  // Manual connect state
  const [activeTab, setActiveTab] = useState("embedded"); // "embedded" | "manual"
  const [manualPhoneId, setManualPhoneId] = useState("");
  const [manualWabaId, setManualWabaId] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [manualSaving, setManualSaving] = useState(false);

  // Load status & config
  async function loadData() {
    setLoading(true);
    try {
      const [stRes, cfgRes] = await Promise.all([
        api.get("/whatsapp/connection-status"),
        api.get("/whatsapp/embedded-signup/config"),
      ]);
      setStatus(stRes.data);
      setConfig(cfgRes.data);
    } catch (e) {
      console.error("Failed to load WhatsApp connection status", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualConnect(e) {
    e.preventDefault();
    if (!manualPhoneId.trim() || !manualToken.trim()) {
      toast.error("Phone Number ID and Access Token are required.");
      return;
    }
    setManualSaving(true);
    try {
      const res = await api.post("/whatsapp/manual-connect", {
        phone_number_id: manualPhoneId.trim(),
        waba_id: manualWabaId.trim() || null,
        access_token: manualToken.trim(),
      });
      toast.success(res.data.message || "WhatsApp Account connected successfully!");
      loadData();
      if (onConnected) onConnected(res.data);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setManualSaving(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // Load Facebook JS SDK dynamically
  const loadFbSdk = () => {
    return new Promise((resolve) => {
      if (window.FB) {
        resolve(window.FB);
        return;
      }
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: config?.app_id || "1598038242335524",
          autoLogAppEvents: true,
          xfbml: true,
          version: config?.version || "v21.0",
        });
        resolve(window.FB);
      };
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    });
  };

  // Launch Meta Embedded Signup Popup
  async function launchEmbeddedSignup() {
    setConnecting(true);
    try {
      const fb = await loadFbSdk();

      // Captured postMessage session info from popup
      let sessionData = { waba_id: null, phone_number_id: null };

      const messageListener = (event) => {
        if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
        try {
          const raw = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (raw.type === "WA_EMBEDDED_SIGNUP") {
            if (raw.data) {
              if (raw.data.waba_id) sessionData.waba_id = raw.data.waba_id;
              if (raw.data.phone_number_id) sessionData.phone_number_id = raw.data.phone_number_id;
            }
          }
        } catch (err) {
          // ignore non-json
        }
      };

      window.addEventListener("message", messageListener);

      fb.login(
        function (response) {
          window.removeEventListener("message", messageListener);

          (async () => {
            if (response.authResponse && response.authResponse.code) {
              const authCode = response.authResponse.code;
              toast.info("Exchanging Meta credentials and subscribing webhook...");

              try {
                const res = await api.post("/whatsapp/embedded-signup/callback", {
                  code: authCode,
                  waba_id: sessionData.waba_id,
                  phone_number_id: sessionData.phone_number_id,
                });

                toast.success(res.data.message || "WhatsApp Business connected successfully!");
                loadData();
                if (onConnected) onConnected(res.data);
              } catch (err) {
                toast.error(errMsg(err));
              } finally {
                setConnecting(false);
              }
            } else {
              setConnecting(false);
              if (response.status !== "connected") {
                toast.info("Login cancelled or closed.");
              }
            }
          })();
        },
        {
          config_id: config?.config_id || "3462057927307282",
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {},
          },
        }
      );
    } catch (e) {
      setConnecting(false);
      toast.error(errMsg(e));
    }
  }

  // Disconnect handler
  async function handleDisconnect() {
    if (!window.confirm("Are you sure you want to disconnect this WhatsApp number?")) return;
    setLoading(true);
    try {
      await api.post("/whatsapp/disconnect");
      toast.success("WhatsApp account disconnected.");
      loadData();
      if (onConnected) onConnected(null);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-indigo-100 dark:border-white/10">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
              <WhatsAppIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <DialogTitle className="font-serif text-lg text-slate-900 dark:text-white">
                Official WhatsApp Business
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Meta Cloud API & Embedded Signup
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-xs">Checking Meta connection...</span>
          </div>
        ) : status?.connected ? (
          /* ── CONNECTED STATE ── */
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Connected & Active
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Tier: {status.quality_rating || "GREEN"}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="text-xs text-slate-500 dark:text-slate-400">Official Phone Number</div>
                <div className="text-base font-semibold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  {status.display_phone_number || "Active on Cloud API"}
                </div>
                {status.verified_name && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Name: <span className="font-medium">{status.verified_name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Phone ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{status.phone_number_id}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">WABA ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{status.waba_id}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 gap-1.5"
                onClick={launchEmbeddedSignup}
                disabled={connecting}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${connecting ? "animate-spin" : ""}`} />
                {connecting ? "Reconnecting..." : "Reconnect Number"}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                onClick={handleDisconnect}
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          /* ── NOT CONNECTED STATE ── */
          <div className="space-y-4 py-2">
            {/* Tabs for Embedded vs Manual */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("embedded")}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === "embedded"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                1-Click Meta Signup
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === "manual"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Direct API Connect
              </button>
            </div>

            {activeTab === "embedded" ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-indigo-100 dark:border-white/10 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 space-y-2">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Meta Embedded Signup
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Connect your WhatsApp Business number directly through Meta&apos;s official onboarding popup without manual API setup.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1 text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Meta Developer Tip:
                  </div>
                  <p className="leading-relaxed">
                    If Facebook shows <span className="font-semibold">&quot;Facebook Login is currently unavailable&quot;</span>, add your Facebook account under <strong>App Roles &gt; Roles</strong> in developers.facebook.com, or switch to the <strong>Direct API Connect</strong> tab above.
                  </p>
                </div>

                <Button
                  className="w-full h-11 bg-[#1877F2] hover:bg-[#166fe5] text-white font-medium text-sm rounded-xl gap-2 shadow-sm transition-all"
                  onClick={launchEmbeddedSignup}
                  disabled={connecting}
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Opening Meta Signup...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Connect with Facebook (WhatsApp)
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleManualConnect} className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                    Phone Number ID <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. 1291136754082362"
                    value={manualPhoneId}
                    onChange={e => setManualPhoneId(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Found in Meta Developer Portal &gt; WhatsApp &gt; API Setup</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                    WhatsApp Business Account ID (WABA ID)
                  </label>
                  <Input
                    placeholder="e.g. 3580112308818227 (Optional)"
                    value={manualWabaId}
                    onChange={e => setManualWabaId(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                    Permanent Access Token <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="EAAG... (System User Token)"
                    value={manualToken}
                    onChange={e => setManualToken(e.target.value)}
                    className="h-9 text-xs font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-400">From Meta Business Manager &gt; System Users &gt; Generate Token</span>
                </div>

                <Button
                  type="submit"
                  disabled={manualSaving}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl gap-2 mt-2"
                >
                  {manualSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Verify &amp; Connect WhatsApp
                </Button>
              </form>
            )}

            <div className="text-[11px] text-center text-slate-400 dark:text-slate-500 pt-1">
              Powered by Meta WhatsApp Cloud API v21.0
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
