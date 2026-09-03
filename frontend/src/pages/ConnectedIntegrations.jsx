import { useEffect, useState } from "react";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Mail, MessageSquare, Table, Sparkles, Brain, Phone, Calendar,
  Globe, Link, Plug, Activity, Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";

const APP_INFO = {
  omnidim: { label: "AI Voice Agent", desc: "Autonomous AI sales calling engine and auto appointment booking", icon: Phone, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  whatsapp: { label: "Meta WhatsApp", desc: "Send automated WhatsApp notifications via Meta Cloud API", icon: MessageSquare, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  google_sheets: { label: "Google Sheets", desc: "Instantly sync leads and activity columns to Google spreadsheets", icon: Table, color: "text-green-500 bg-green-500/10 border-green-500/20" },
  excel: { label: "Excel Integration", desc: "Download and sync task logs into Microsoft Office 365 cloud", icon: Table, color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
  smtp: { label: "SMTP Email", desc: "Configure custom SMTP server to dispatch proposal and quotation emails", icon: Mail, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  openai: { label: "OpenAI GPT-4", desc: "Process natural language workflows and sentiment telemetry with GPT-4o-mini", icon: Sparkles, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  deepseek: { label: "DeepSeek AI", desc: "Supercharge your automated follow-ups using DeepSeek-V3 LLM", icon: Brain, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  vapi: { label: "Secondary Voice", desc: "Secondary voice agent pipeline for outbound calls", icon: Phone, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  google_calendar: { label: "Google Calendar", desc: "Sync showroom and virtual appointments to client Google Calendars", icon: Calendar, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  rest_api: { label: "REST API Outbound", desc: "Push JSON data events to external software APIs", icon: Globe, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  webhook: { label: "Incoming Webhooks", desc: "Create endpoints to receive lead data from Elementor, Webflow, etc.", icon: Link, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
};

export default function ConnectedIntegrations() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configApp, setConfigApp] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [testLoading, setTestLoading] = useState(null); // name of app being tested

  function load() {
    setLoading(true);
    api.get("/automation/integrations")
      .then(r => setApps(r.data))
      .catch(e => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggleApp(app) {
    try {
      const updated = await api.post("/automation/integrations", {
        app_name: app.app_name,
        enabled: !app.enabled,
        api_key: app.api_key,
        secret_key: app.secret_key,
        webhook_url: app.webhook_url,
      });
      toast.success(`${APP_INFO[app.app_name]?.label || app.app_name} ${!app.enabled ? "enabled" : "disabled"}`);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function handleTest(appName) {
    setTestLoading(appName);
    try {
      const res = await api.post(`/automation/integrations/${appName}/test`);
      if (res.data.success) {
        toast.success(res.data.message || "Connection test succeeded!");
      } else {
        toast.error(res.data.message || "Connection check failed.");
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setTestLoading(null);
    }
  }

  return (
    <div data-testid="integrations-page" className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Connected Integrations</h1>
        <p className="text-sm text-slate-600">
          Sync ParshCall AI with third-party software, email, and LLM APIs to power your automations.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">Loading Integrations…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {apps.map(app => {
            const info = APP_INFO[app.app_name] || { label: app.app_name, desc: "", icon: Plug, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" };
            const Icon = info.icon;
            
            return (
              <Card key={app.id} className="p-5 bg-white border-indigo-100 hover:shadow-md transition-shadow flex flex-col justify-between h-[210px]">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${info.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${app.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"}`}>
                        {app.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <Switch 
                        checked={app.enabled} 
                        onCheckedChange={() => toggleApp(app)} 
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm mt-1">{info.label}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{info.desc}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs flex-1 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-100"
                    onClick={() => { setConfigApp(app); setConfigOpen(true); }}
                  >
                    Configure
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs border border-transparent hover:border-slate-200 text-slate-500 hover:bg-slate-50"
                    disabled={!app.enabled || testLoading === app.app_name}
                    onClick={() => handleTest(app.app_name)}
                  >
                    {testLoading === app.app_name ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Activity className="h-3 w-3 mr-1" />
                    )}
                    Test
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {configApp && (
        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <ConfigDialog app={configApp} onSaved={() => { setConfigOpen(false); setConfigApp(null); load(); }} />
        </Dialog>
      )}
    </div>
  );
}

function ConfigDialog({ app, onSaved }) {
  const info = APP_INFO[app.app_name] || { label: app.app_name };
  
  // SMTP special UI fields
  const isSmtp = app.app_name === "smtp";
  const [smtpForm, setSmtpForm] = useState(() => {
    if (!isSmtp) return {};
    try {
      return JSON.parse(app.api_key) || { host: "smtp.gmail.com", port: 587, username: "", password: "", sender: "" };
    } catch {
      return { host: "smtp.gmail.com", port: 587, username: "", password: "", sender: "" };
    }
  });

  const [apiKey, setApiKey] = useState(app.api_key || "");
  const [secretKey, setSecretKey] = useState(app.secret_key || "");
  const [webhookUrl, setWebhookUrl] = useState(app.webhook_url || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const finalApiKey = isSmtp ? JSON.stringify(smtpForm) : apiKey;
      await api.post("/automation/integrations", {
        app_name: app.app_name,
        enabled: app.enabled,
        api_key: finalApiKey,
        secret_key: secretKey,
        webhook_url: webhookUrl,
      });
      toast.success(`${info.label} settings saved successfully.`);
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-md bg-white">
      <DialogHeader>
        <DialogTitle className="font-serif">Configure {info.label}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {isSmtp ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-600">SMTP Host / Server Address</Label>
              <Input placeholder="smtp.gmail.com" value={smtpForm.host} onChange={e => setSmtpForm({ ...smtpForm, host: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">SMTP Port (usually 587)</Label>
                <Input type="number" placeholder="587" value={smtpForm.port} onChange={e => setSmtpForm({ ...smtpForm, port: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Sender Address (From)</Label>
                <Input placeholder="noreply@domain.com" value={smtpForm.sender} onChange={e => setSmtpForm({ ...smtpForm, sender: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">SMTP Username (Email)</Label>
              <Input placeholder="user@gmail.com" value={smtpForm.username} onChange={e => setSmtpForm({ ...smtpForm, username: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-slate-600">SMTP Password</Label>
              <Input type="password" placeholder="••••••••••••" value={smtpForm.password} onChange={e => setSmtpForm({ ...smtpForm, password: e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {app.app_name !== "webhook" && (
              <div>
                <Label className="text-xs text-slate-600">API Key / Token</Label>
                <Input 
                  type="password"
                  placeholder="Enter API Key / Token" 
                  value={apiKey} 
                  onChange={e => setApiKey(e.target.value)} 
                />
              </div>
            )}

            {app.app_name === "whatsapp" && (
              <div>
                <Label className="text-xs text-slate-600">Phone Number ID</Label>
                <Input 
                  placeholder="Enter Meta Phone Number ID" 
                  value={secretKey} 
                  onChange={e => setSecretKey(e.target.value)} 
                />
              </div>
            )}

            {app.app_name === "omnidim" && (
              <div>
                <Label className="text-xs text-slate-600">Voice Agent ID</Label>
                <Input 
                  placeholder="e.g. 248152" 
                  value={secretKey} 
                  onChange={e => setSecretKey(e.target.value)} 
                />
              </div>
            )}

            {(app.app_name === "rest_api" || app.app_name === "webhook") && (
              <div>
                <Label className="text-xs text-slate-600">Webhook URL</Label>
                <Input 
                  placeholder="https://api.yourdomain.com/endpoint" 
                  value={webhookUrl} 
                  onChange={e => setWebhookUrl(e.target.value)} 
                />
              </div>
            )}

            {app.app_name === "webhook" && (
              <div>
                <Label className="text-xs text-slate-600">Secret Verification Token (Optional)</Label>
                <Input 
                  type="password"
                  placeholder="Verification signature token" 
                  value={secretKey} 
                  onChange={e => setSecretKey(e.target.value)} 
                />
              </div>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button className="bg-indigo-700 hover:bg-indigo-800 text-white" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
