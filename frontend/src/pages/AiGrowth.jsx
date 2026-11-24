import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Bot, CreditCard, Layers, Plug, Sparkles, CheckCircle2, Copy, ExternalLink,
  Plus, Edit, Save, RefreshCw, Send, AlertCircle, Smartphone, Calendar,
  ArrowRight, ArrowLeft, Eye, MessageSquare, Check, X, ShieldCheck, Trash2,
  FileText, Upload, Loader2, Clock, Timer, Play, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import WhatsAppAnalyticsTab from "@/components/WhatsAppAnalyticsTab";


export default function AiGrowth() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "agents";

  const setTab = (t) => {
    setSearchParams({ tab: t });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
              AI & Growth Suite
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{user?.company_name || "Workspace"}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 text-slate-900 dark:text-white">
            {activeTab === "analytics" && "Real-Time WhatsApp Analytics & Conversion Cockpit"}
            {activeTab === "agents" && "AI Agents & Knowledge Base"}
            {activeTab === "payments" && "Razorpay Payment Links"}
            {activeTab === "apps" && "Apps & Integrations"}
            {activeTab === "templates" && "Create Meta WhatsApp Template"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {activeTab === "analytics" && "Live delivery receipts, blue ticks, bot autonomy, spaced drips, and Meta Cloud API cost metrics."}
            {activeTab === "agents" && "Configure 24/7 autonomous sales agents and custom agency knowledge chunks."}
            {activeTab === "payments" && "Send Razorpay payment links in chat and track settlement statuses."}
            {activeTab === "apps" && "Connect Google Meet & Calendar, Google Sheets, and Webhooks for automated sales loops."}
            {activeTab === "templates" && "Build, preview on WhatsApp mobile frame, and submit approved Meta broadcast templates."}
          </p>
        </div>

        {/* Horizontal Navigation Pills (Inspired by Alpha CRM) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-xl overflow-x-auto shadow-sm">
          <Link
            to="/campaigns"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-700 shadow-2xs"
          >
            <Send className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> 📢 Broadcast Campaigns
          </Link>
          <button
            onClick={() => setTab("analytics")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === "analytics"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" /> 📊 Analytics
          </button>
          <button
            onClick={() => setTab("agents")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === "agents"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10"
            }`}
          >
            <Bot className="h-3.5 w-3.5" /> AI Agents
          </button>
          <button
            onClick={() => setTab("templates")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === "templates"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" /> Templates
          </button>
          <button
            onClick={() => setTab("payments")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === "payments"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" /> Payment Links
          </button>
          <button
            onClick={() => setTab("apps")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === "apps"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10"
            }`}
          >
            <Plug className="h-3.5 w-3.5" /> Apps
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "analytics" && <WhatsAppAnalyticsTab />}
      {activeTab === "agents" && <AiAgentsTab />}
      {activeTab === "payments" && <PaymentLinksTab />}
      {activeTab === "apps" && <AppsIntegrationsTab />}
      {activeTab === "templates" && <MetaTemplateTab />}
    </div>
  );
}

// ===========================================================================
// 1. AI AGENTS TAB (KNOWLEDGE BASE + SIMULATOR)
// ===========================================================================
function AiAgentsTab() {
  const { user } = useAuth();
  const defaultBotName = `${user?.company_name || "Workspace"} Sales Bot`;

  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [agentName, setAgentName] = useState(defaultBotName);
  const [enabled, setEnabled] = useState(true);
  const [knowledge, setKnowledge] = useState("");
  const [prompt, setPrompt] = useState("");
  const [calendarLink, setCalendarLink] = useState("");
  const [founderPhone, setFounderPhone] = useState("");
  const [founderEmail, setFounderEmail] = useState("");
  const [testingAlert, setTestingAlert] = useState(false);
  const [dripFollowupEnabled, setDripFollowupEnabled] = useState(true);
  const [dripDay1Text, setDripDay1Text] = useState("");
  const [dripDay3Text, setDripDay3Text] = useState("");
  const [dripDay7Text, setDripDay7Text] = useState("");
  const [dripRunningManual, setDripRunningManual] = useState(false);

  // Custom Buttons & Footer
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  const [button1Title, setButton1Title] = useState("");
  const [button2Title, setButton2Title] = useState("");
  const [button3Title, setButton3Title] = useState("");
  const [showFooter, setShowFooter] = useState(false);
  const [footerText, setFooterText] = useState("");

  // Simulator
  const [simInput, setSimInput] = useState("");
  const [simMessages, setSimMessages] = useState([
    { sender: "bot", text: `Hello! I am ${defaultBotName}. How can I help your business grow today?` }
  ]);
  const [simLoading, setSimLoading] = useState(false);

  // Official Agency Profile PDF state
  const [profileInfo, setProfileInfo] = useState(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const profileFileInputRef = useRef(null);

  const fetchProfileStatus = async () => {
    try {
      const res = await api.get("/growth/agency-profile");
      setProfileInfo(res.data);
    } catch (e) {
      // ignore
    }
  };

  const handleProfileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a valid PDF document");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingProfile(true);
    const toastId = toast.loading("Uploading new Agency Profile PDF to WhatsApp engine…");
    try {
      const res = await api.post("/growth/upload-agency-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("New Agency Profile PDF uploaded! Live on WhatsApp immediately.", { id: toastId });
      setProfileInfo(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to upload Agency Profile PDF", { id: toastId });
    } finally {
      setUploadingProfile(false);
      if (profileFileInputRef.current) profileFileInputRef.current.value = "";
    }
  };

  const fetchAgent = async () => {
    try {
      const res = await api.get("/growth/ai-agent");
      if (res.data && res.data.exists && res.data.id) {
        setAgent(res.data);
        const name = res.data.agent_name || defaultBotName;
        setAgentName(name);
        setEnabled(res.data.enabled ?? true);
        setKnowledge(res.data.knowledge_chunks || "");
        setPrompt(res.data.qualification_prompt || "");
        setCalendarLink(res.data.calendar_link || "");
        setFounderPhone(res.data.founder_phone || "");
        setFounderEmail(res.data.founder_email || "");
        setDripFollowupEnabled(res.data.drip_followup_enabled ?? true);
        setDripDay1Text(res.data.drip_day1_text || "");
        setDripDay3Text(res.data.drip_day3_text || "");
        setDripDay7Text(res.data.drip_day7_text || "");
        setButtonsEnabled(res.data.buttons_enabled ?? false);
        setButton1Title(res.data.button1_title || "");
        setButton2Title(res.data.button2_title || "");
        setButton3Title(res.data.button3_title || "");
        setShowFooter(res.data.show_footer ?? false);
        setFooterText(res.data.footer_text || "");
        setSimMessages([
          { sender: "bot", text: `Hello! I am ${name}. How can I help your business grow today?` }
        ]);
      } else {
        setAgent(null);
        setAgentName(defaultBotName);
        setKnowledge("");
        setPrompt("Qualify the customer's requirement, approximate budget, and timeline. Offer to connect with a team specialist.");
        setCalendarLink("");
        setFounderPhone("");
        setFounderEmail("");
        setDripFollowupEnabled(true);
        setDripDay1Text("");
        setDripDay3Text("");
        setDripDay7Text("");
        setButtonsEnabled(false);
        setButton1Title("");
        setButton2Title("");
        setButton3Title("");
        setShowFooter(false);
        setFooterText("");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load AI Agent config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgent();
    fetchProfileStatus();
  }, []);

  const handleSave = async () => {
    if (!agentName.trim()) {
      toast.error("Please enter a name for your AI Agent");
      return;
    }
    if (!knowledge.trim()) {
      toast.error("Please provide knowledge base info about your business services and FAQs");
      return;
    }
    setSaving(true);
    try {
      await api.post("/growth/ai-agent", {
        agent_name: agentName,
        enabled,
        knowledge_chunks: knowledge,
        qualification_prompt: prompt,
        calendar_link: calendarLink,
        founder_phone: founderPhone,
        founder_email: founderEmail,
        auto_reply_enabled: enabled,
        drip_followup_enabled: dripFollowupEnabled,
        drip_day1_text: dripDay1Text,
        drip_day3_text: dripDay3Text,
        drip_day7_text: dripDay7Text,
        buttons_enabled: buttonsEnabled,
        button1_title: button1Title,
        button2_title: button2Title,
        button3_title: button3Title,
        show_footer: showFooter,
        footer_text: footerText,
      });
      toast.success("AI Agent and Drip settings saved successfully!");
      setEditOpen(false);
      fetchAgent();
    } catch (e) {
      toast.error("Failed to save AI Agent");
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlert = async () => {
    setTestingAlert(true);
    try {
      const res = await api.post("/growth/ai-agent/test-alert");
      if (res.data?.ok) {
        const waMsg = res.data.whatsapp_sent
          ? `WhatsApp delivered to ${res.data.owner_phone}`
          : `WhatsApp alert queued for ${res.data.owner_phone}`;
        const emailMsg = res.data.email_sent
          ? `Email sent to ${res.data.owner_email}`
          : `Email queued for ${res.data.owner_email}`;
        toast.success(`Dual Alert Sent! ${waMsg} & ${emailMsg}`);
      } else {
        toast.error("Failed to dispatch alert");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Alert test error");
    } finally {
      setTestingAlert(false);
    }
  };

  const handleToggleDripEngine = async (val) => {
    setDripFollowupEnabled(val);
    try {
      await api.post("/growth/ai-agent", { drip_followup_enabled: val });
      toast.success(val ? "Automated Spaced Follow-Up Drip activated" : "Automated Follow-Up Drip paused");
      fetchAgent();
    } catch (e) {
      toast.error("Failed to update Drip engine status");
    }
  };

  const handleRunDripNow = async () => {
    setDripRunningManual(true);
    const toastId = toast.loading("Evaluating leads for Day 1, Day 3, and Day 7 follow-ups...");
    try {
      const res = await api.post("/leads/drip/run-now");
      toast.success(`Drip scan complete! Dispatched ${res.data.dispatched_count} follow-up message(s).`, { id: toastId });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to trigger drip evaluation", { id: toastId });
    } finally {
      setDripRunningManual(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!window.confirm("Are you sure you want to delete this AI Agent? You can create a new one anytime.")) return;
    try {
      await api.delete("/growth/ai-agent");
      toast.success("AI Agent deleted successfully");
      setAgent(null);
      fetchAgent();
    } catch (e) {
      toast.error("Failed to delete AI Agent");
    }
  };

  const handleSimSend = async () => {
    if (!simInput.trim()) return;
    const userText = simInput.trim();
    setSimInput("");
    setSimMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setSimLoading(true);

    try {
      const res = await api.post("/growth/ai-agent/test", { message: userText });
      setSimMessages((prev) => [...prev, { sender: "bot", text: res.data.reply }]);
    } catch (e) {
      setSimMessages((prev) => [...prev, { sender: "bot", text: "Error connecting to AI. Please verify API keys." }]);
    } finally {
      setSimLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading AI Agent configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Card 1: Your AI Agents list (Inspired by Alpha CRM) */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your AI agents</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              An agent answers incoming messages only from its knowledge base. If it doesn't know, it says so and hands the chat to your team.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {agent && agent.id ? (
              <>
                <Button
                  onClick={() => setSimOpen(!simOpen)}
                  variant="outline"
                  className="text-xs h-9 gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Test Simulator
                </Button>
                <Button
                  onClick={() => setEditOpen(true)}
                  className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit Knowledge
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setAgentName(defaultBotName);
                  setKnowledge("");
                  setEditOpen(true);
                }}
                className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Create AI Agent
              </Button>
            )}
          </div>
        </div>

        {/* Empty State vs Active Agent Card */}
        {!agent || !agent.id ? (
          <div className="mt-5 p-8 rounded-xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/40 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-sm">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No AI Agent Created Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-5">
              Create your custom AI Sales Agent with your own bot name, business services, pricing, and FAQs.
            </p>
            <Button
              onClick={() => {
                setAgentName(defaultBotName);
                setKnowledge("");
                setEditOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-5 gap-2 font-semibold shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Create Your AI Agent
            </Button>
          </div>
        ) : (
          <div className="mt-5 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{agent?.agent_name}</span>
                  <Badge variant="outline" className={`text-[10px] ${agent?.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                    {agent?.enabled ? "Enabled" : "Paused"}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                  <span>{agent?.chunks_count || 0} knowledge chunks</span>
                  <span>&bull;</span>
                  {agent?.channels && agent.channels.length > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {agent.channels.length} channel ({agent.channels.join(", ")})
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      0 channels connected (No WhatsApp Connected)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-300">Auto-Reply:</span>
                <Switch
                  checked={agent?.enabled}
                  onCheckedChange={async (val) => {
                    setEnabled(val);
                    await api.post("/growth/ai-agent", { enabled: val, auto_reply_enabled: val });
                    fetchAgent();
                    toast.success(val ? "AI Sales Bot activated" : "AI Sales Bot paused");
                  }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="text-xs h-8 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Configure
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteAgent}
                className="text-xs h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                title="Delete Agent"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Card 2: Automated Spaced Follow-Up Drip Engine (Day 1, Day 3, Day 7) */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-md space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mt-0.5">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Automated Spaced Follow-Up Drip Engine
                </h2>
                <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800">
                  Day 1 · Day 3 · Day 7
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
                Automatically re-engage silent prospects who haven't responded within 24h, 72h, and 7 days with interactive quick reply buttons. Stops automatically the moment a lead sends any message or voice note.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/10">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Drip Engine:</span>
              <Switch
                checked={dripFollowupEnabled}
                onCheckedChange={handleToggleDripEngine}
              />
              <span className={`text-[11px] font-semibold ${dripFollowupEnabled ? "text-emerald-600" : "text-slate-400"}`}>
                {dripFollowupEnabled ? "Active" : "Paused"}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={dripRunningManual}
              onClick={handleRunDripNow}
              className="text-xs h-9 gap-1.5 border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold"
            >
              {dripRunningManual ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-indigo-600 dark:fill-indigo-400" />
                  <span>Run Drip Check Now</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="text-xs h-9 gap-1.5 dark:border-white/10 dark:text-slate-200"
            >
              <Edit className="h-3.5 w-3.5" /> Customize Drip
            </Button>
          </div>
        </div>

        {/* 3 Pipeline Stages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Stage 1 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                  Day 1 Follow-Up
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  ~24h silence
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                "{dripDay1Text || "Hi {name}! 👋 Just following up to see if you had a chance to review the details we shared yesterday? Let me know if you have any questions or if you'd like to book a quick 15-minute discovery call!"}"
              </p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Interactive WhatsApp Buttons</div>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">📅 Book a Call</span>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">✅ Still Interested</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">👤 Talk to Team</span>
              </div>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                  Day 3 Check-In
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  ~72h silence
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                "{dripDay3Text || "Hi {name}, quick check-in from Parsh Web Craft! We are currently finalizing our project delivery sprints for this month. Would you like us to reserve a slot for your project or share our agency overview portfolio?"}"
              </p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Interactive WhatsApp Buttons</div>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">📅 Book a Call</span>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">📑 View Packages</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">⏳ Later this month</span>
              </div>
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                  Day 7 Final Nudge
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  ~7 days silence
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                "{dripDay7Text || "Hi {name}, hope you're having a productive week! I understand you might be busy right now, so I won't crowd your WhatsApp. Whenever you're ready to proceed with your project, feel free to ping us right here. Wishing you the best! 😊"}"
              </p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Interactive WhatsApp Buttons</div>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">👤 Talk to Team</span>
              </div>
            </div>
          </div>
        </div>

        {/* Protection Banner */}
        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            <strong>Anti-Spam Safeguard:</strong> The automated drip halts instantly the moment a lead replies, sends a voice note, or when marked "Won" or "Needs Human".
          </span>
        </div>
      </div>

      {/* Simulator Sandbox */}
      {simOpen && (
        <div className="bg-white dark:bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-sm space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">AI Sales Bot Simulator</h3>
              <Badge variant="secondary" className="text-[10px] dark:bg-slate-800 dark:text-slate-300">Testing Knowledge Base</Badge>
            </div>
            <button onClick={() => setSimOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat bubbles */}
          <div className="h-64 overflow-y-auto p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 space-y-3 text-xs">
            {simMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2 rounded-2xl leading-relaxed ${
                    m.sender === "user"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 rounded-bl-none shadow-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {simLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800/90 px-3.5 py-2 rounded-2xl text-slate-400 italic border border-slate-200 dark:border-white/10">
                  Bot is thinking...
                </div>
              </div>
            )}
          </div>

          {/* Simulator input */}
          <div className="flex gap-2">
            <Input
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSimSend()}
              placeholder="Ask anything, e.g. 'What are your website packages?' or 'Can I schedule a meeting?'"
              className="text-xs h-10 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
            <Button
              onClick={handleSimSend}
              disabled={simLoading || !simInput.trim()}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Knowledge Drawer / Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {agent && agent.id ? "Configure AI Sales Bot & Knowledge" : "Create Your AI Sales Bot"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {agent && agent.id
                    ? "Edit business services, pricing packages, FAQs, and qualification logic."
                    : "Enter your custom bot name and provide knowledge base info about your services, pricing, and FAQs."}
                </p>
              </div>
              <button onClick={() => setEditOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Agent Name</label>
                <Input
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. My Agency Sales Assistant"
                  className="text-xs h-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              {/* Official Agency Profile PDF Upload Card */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Official Agency Profile PDF (Brochure / Services Catalog)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    ● Live on WhatsApp
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Jab customer WhatsApp par <strong>"Agency Profile / Brochure"</strong> mangta hai ya <strong>[📑 Agency Profile]</strong> button dabata hai, to yahi PDF direct customer ke WhatsApp par deliver hoti hai.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <input
                    type="file"
                    ref={profileFileInputRef}
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={handleProfileUpload}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={uploadingProfile}
                    onClick={() => profileFileInputRef.current?.click()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5 shadow-2xs font-semibold"
                  >
                    {uploadingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading PDF…</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload New Agency Profile (PDF)</span>
                      </>
                    )}
                  </Button>

                  <a
                    href="https://api.parshagent.com/uploads/brochures/ParshWebCraft_Services_Overview.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View / Download Current PDF</span>
                  </a>

                  {profileInfo && profileInfo.size_kb > 0 && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Size: {profileInfo.size_kb} KB · Updated: {profileInfo.updated_at || "Live"}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Knowledge Base Chunks (Agency Services, Pricing, FAQs)
                  </label>
                  <span className="text-[10px] text-slate-400">Markdown supported</span>
                </div>
                <Textarea
                  value={knowledge}
                  onChange={(e) => setKnowledge(e.target.value)}
                  rows={10}
                  className="text-xs font-mono leading-relaxed bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  placeholder="Paste your business service packages, pricing, timeline, and FAQs..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Qualification Strategy (System Rules)
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="text-xs bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  placeholder="e.g. Inquire about business type, budget, and launch timeline..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Discovery Calendar Link (Calendly / Google Meet)
                  </label>
                  <Input
                    value={calendarLink}
                    onChange={(e) => setCalendarLink(e.target.value)}
                    placeholder="https://calendly.com/your-agency/15min"
                    className="text-xs h-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* WhatsApp Interactive Buttons & Footer Customization */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      💬 WhatsApp Quick-Reply Buttons & Footer
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Customize whether to attach interactive action buttons and company footer to AI replies.
                    </p>
                  </div>
                </div>

                {/* Buttons Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Enable Interactive Action Buttons
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      If disabled, AI sends natural plain text replies without any buttons.
                    </span>
                  </div>
                  <Switch
                    checked={buttonsEnabled}
                    onCheckedChange={setButtonsEnabled}
                  />
                </div>

                {buttonsEnabled && (
                  <div className="space-y-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Custom Action Buttons (Max 3, up to 20 chars each)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        value={button1Title}
                        onChange={(e) => setButton1Title(e.target.value)}
                        placeholder="Button 1 (e.g. 📅 Book a Call)"
                        maxLength={20}
                        className="text-xs h-8 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10"
                      />
                      <Input
                        value={button2Title}
                        onChange={(e) => setButton2Title(e.target.value)}
                        placeholder="Button 2 (e.g. 📑 View Pricing)"
                        maxLength={20}
                        className="text-xs h-8 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10"
                      />
                      <Input
                        value={button3Title}
                        onChange={(e) => setButton3Title(e.target.value)}
                        placeholder="Button 3 (e.g. 👤 Talk to Team)"
                        maxLength={20}
                        className="text-xs h-8 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10"
                      />
                    </div>
                  </div>
                )}

                {/* Footer Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Show Message Footer
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Display small footer text at the bottom of WhatsApp messages.
                    </span>
                  </div>
                  <Switch
                    checked={showFooter}
                    onCheckedChange={setShowFooter}
                  />
                </div>

                {showFooter && (
                  <div className="pt-2">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Custom Footer Text (Max 60 chars)
                    </label>
                    <Input
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      placeholder="e.g. Your Company Support"
                      maxLength={60}
                      className="text-xs h-8 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10"
                    />
                  </div>
                )}
              </div>

              {/* Instant Dual Alerts Configuration */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      ⚡ Instant Owner Dual Alerts (WhatsApp + Email)
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleTestAlert}
                    disabled={testingAlert}
                    variant="outline"
                    className="text-[11px] h-7 px-2.5 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 gap-1"
                  >
                    <Send className="w-3 h-3" />
                    {testingAlert ? "Sending..." : "🔔 Send Test Alert"}
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Whenever a customer books a discovery call, requests a quotation, or asks for a human, ParshAgent instantly sends a formatted WhatsApp notification to your phone and an HTML email to your inbox.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      📱 Owner Alert WhatsApp Number
                    </label>
                    <Input
                      value={founderPhone}
                      onChange={(e) => setFounderPhone(e.target.value)}
                      placeholder="e.g. 918442097839"
                      className="text-xs h-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      📧 Owner Alert Email Address
                    </label>
                    <Input
                      value={founderEmail}
                      onChange={(e) => setFounderEmail(e.target.value)}
                      placeholder="e.g. admin@parshwebcraft.com"
                      className="text-xs h-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Drip Follow-Up Custom Templates */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Spaced Follow-Up Drip Templates (Day 1, Day 3, Day 7)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Use <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{"{name}"}</code> for prospect's name
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Day 1 Message (~24 Hours Inactivity)
                    </label>
                    <Textarea
                      value={dripDay1Text}
                      onChange={(e) => setDripDay1Text(e.target.value)}
                      rows={2}
                      className="text-xs bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                      placeholder="Hi {name}! 👋 Just following up to see if you had a chance to review the details we shared yesterday? Let me know if you have any questions or if you'd like to book a quick 15-minute discovery call!"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Day 3 Message (~72 Hours Inactivity)
                    </label>
                    <Textarea
                      value={dripDay3Text}
                      onChange={(e) => setDripDay3Text(e.target.value)}
                      rows={2}
                      className="text-xs bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                      placeholder="Hi {name}, quick check-in from Parsh Web Craft! We are currently finalizing our project delivery sprints for this month. Would you like us to reserve a slot for your project or share our agency overview portfolio?"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Day 7 Final Nudge (~7 Days Inactivity)
                    </label>
                    <Textarea
                      value={dripDay7Text}
                      onChange={(e) => setDripDay7Text(e.target.value)}
                      rows={2}
                      className="text-xs bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                      placeholder="Hi {name}, hope you're having a productive week! I understand you might be busy right now, so I won't crowd your WhatsApp. Whenever you're ready to proceed with your project, feel free to ping us right here. Wishing you the best! 😊"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2 bg-slate-50 dark:bg-slate-950/80">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} className="dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {saving ? "Saving..." : (agent && agent.id ? "Save Changes" : "Create & Launch Bot")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// 2. PAYMENT LINKS TAB (RAZORPAY INTEGRATION)
// ===========================================================================
function PaymentLinksTab() {
  const [config, setConfig] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Form states
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  // Create link modal
  const [createOpen, setCreateOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [amount, setAmount] = useState(5000);
  const [desc, setDesc] = useState("Website Project Token Advance");
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        api.get("/growth/payments/config"),
        api.get("/growth/payments/links"),
      ]);
      setConfig(cRes.data);
      setKeyId(cRes.data.key_id || "");
      setLinks(lRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.post("/growth/payments/config", {
        key_id: keyId,
        key_secret: keySecret || undefined,
        webhook_secret: webhookSecret || undefined,
      });
      toast.success("Razorpay credentials saved successfully!");
      fetchData();
    } catch (e) {
      toast.error("Failed to save credentials");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreateLink = async () => {
    if (!custName.trim() || !amount) {
      toast.error("Please enter customer name and amount");
      return;
    }
    setCreating(true);
    try {
      const res = await api.post("/growth/payments/create-link", {
        customer_name: custName,
        customer_phone: custPhone,
        amount: Number(amount),
        description: desc,
      });
      toast.success("Payment link generated!");
      navigator.clipboard.writeText(res.data.payment_url);
      toast.info("Link copied to clipboard!");
      setCreateOpen(false);
      setCustName("");
      setCustPhone("");
      fetchData();
    } catch (e) {
      toast.error("Failed to create link");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading payment links...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Card 1: Razorpay Credentials (Inspired by Alpha CRM Screen 2) */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-5 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Razorpay account</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Payments go directly to <strong>your</strong> Razorpay account. Keys: Razorpay Dashboard &rarr; Account & Settings &rarr; API Keys.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Key ID</label>
            <Input
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="rzp_live_..."
              className="text-xs h-9 font-mono bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Key Secret</label>
            <Input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder={config?.has_secret ? "••••••••••••••••" : "Paste to set or replace"}
              className="text-xs h-9 font-mono bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Webhook secret</label>
            <Input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Paste to set or replace"
              className="text-xs h-9 font-mono bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Webhook URL:</span>
              <code className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">{config?.webhook_url}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(config?.webhook_url);
                  toast.success("Webhook URL copied!");
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Events: <span className="font-mono text-slate-600 dark:text-slate-300">payment_link.paid, payment_link.expired, payment_link.cancelled</span>
            </div>
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="h-8 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white self-end md:self-auto"
          >
            {savingConfig ? "Saving..." : "Save Keys"}
          </Button>
        </div>
      </div>

      {/* Card 2: Payment Links Table (Inspired by Alpha CRM Screen 2) */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payment links</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Send Razorpay payment links in chat and see when they're paid.</p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Generate Link
          </Button>
        </div>

        {links.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No payment links created yet. Click "Generate Link" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50/50 dark:bg-white/[0.02]">
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {links.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.04]">
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{l.created_at}</td>
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{l.customer_name}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">₹{l.amount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{l.description}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className={`text-[10px] ${
                        l.status === "paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                      }`}>
                        {l.status === "paid" ? "Paid" : "Created"}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(l.payment_url);
                            toast.success("Payment link copied!");
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Copy Link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <a
                          href={l.payment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Link Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Razorpay Payment Link</h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Customer Name</label>
                <Input
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Rohan Sharma"
                  className="text-xs h-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Customer Phone (Optional)</label>
                <Input
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="text-xs h-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Amount (INR)</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  className="text-xs h-9 font-semibold bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Description</label>
                <Input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Token Advance for Website Design"
                  className="text-xs h-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} className="dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateLink}
                disabled={creating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {creating ? "Generating..." : "Generate & Copy Link"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// 3. APPS & INTEGRATIONS TAB (GOOGLE MEET, SHEETS, N8N)
// ===========================================================================
function AppsIntegrationsTab() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    try {
      const res = await api.get("/growth/integrations");
      setApps(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleToggle = async (appId, currentVal) => {
    try {
      await api.post("/growth/integrations/toggle", { id: appId, enabled: !currentVal });
      toast.success("Integration updated!");
      fetchApps();
    } catch (e) {
      toast.error("Failed to update integration");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading integrations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-md">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Connected Apps</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Connect apps: Webhook / n8n, Google Sheets, Google Meet & Calendar.</p>

        {/* 3 Grid Cards (Inspired by Alpha CRM Screen 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          {apps.map((app) => (
            <div
              key={app.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      {app.id === "n8n_webhook" && <Plug className="h-5 w-5 text-rose-500" />}
                      {app.id === "google_sheets" && <Layers className="h-5 w-5 text-emerald-500" />}
                      {app.id === "google_meet" && <Calendar className="h-5 w-5 text-blue-500" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{app.name}</h3>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{app.category}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${
                    app.status === "Ready" || app.status === "Connected"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10"
                  }`}>
                    {app.status}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  {app.description}
                </p>
              </div>

              <div>
                {app.id === "n8n_webhook" ? (
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(app.webhook_endpoint);
                      toast.success("Webhook URL copied to clipboard!");
                    }}
                    variant="outline"
                    className="w-full text-xs h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Copy Webhook URL
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleToggle(app.id, app.enabled)}
                    className={`w-full text-xs h-9 ${
                      app.enabled
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {app.enabled ? "Disconnect" : "Connect"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// 4. META WHATSAPP TEMPLATE TAB (BUILDER + LIVE PHONE PREVIEW + SYNC)
// ===========================================================================
function MetaTemplateTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const compName = user?.company_name || "Your Company";

  const [viewMode, setViewMode] = useState("list"); // "list" | "create"
  const [templates, setTemplates] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterCat, setFilterCat] = useState("ALL");
  const [selectedDetailTemplate, setSelectedDetailTemplate] = useState(null);

  // Create Wizard State
  const [step, setStep] = useState(1);
  const [templateType, setTemplateType] = useState("Standard");
  const [templateName, setTemplateName] = useState("fee_due_reminder");
  const [language, setLanguage] = useState("English");
  const [category, setCategory] = useState("Utility");

  const [headerType, setHeaderType] = useState("None");
  const [headerText, setHeaderText] = useState("");
  const [bodyText, setBodyText] = useState(`Dear {{1}}, your fee payment of ₹{{2}} is due on {{3}}. Please click below to pay online.`);
  const [footerText, setFooterText] = useState("Reply STOP to unsubscribe");

  const [sampleValues, setSampleValues] = useState(["Parent Name", "4500", "31st October"]);

  const [buttons, setButtons] = useState([
    { type: "Quick Reply", text: "Paid Already" },
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Load templates list
  const loadTemplates = async () => {
    setLoadingList(true);
    try {
      const res = await api.get("/growth/meta-templates");
      setTemplates(res.data || []);
    } catch (e) {
      toast.error("Failed to load Meta templates");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Sync templates from Meta WABA
  const handleSyncMeta = async () => {
    setSyncing(true);
    try {
      const res = await api.post("/growth/meta-templates/sync");
      toast.success(`Synced ${res.data?.synced_count || 0} templates directly from Meta WABA!`);
      await loadTemplates();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not sync with Meta WABA. Check credentials.");
    } finally {
      setSyncing(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (tmpl) => {
    if (!window.confirm(`Delete template '${tmpl.name}' from ParshAgent & Meta?`)) return;
    try {
      await api.delete(`/growth/meta-templates/${tmpl.id}`);
      toast.success(`Template '${tmpl.name}' deleted.`);
      setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to delete template");
    }
  };

  // Render variables in body preview
  const previewBody = bodyText
    .replace("{{1}}", sampleValues[0] || "Parent Name")
    .replace("{{2}}", sampleValues[1] || "4500")
    .replace("{{3}}", sampleValues[2] || "31st Oct")
    .replace("{{4}}", sampleValues[3] || "https://pay.link");

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post("/growth/meta-templates", {
        name: templateName,
        language: language === "English" ? "en_US" : "hi",
        category: category.toUpperCase(),
        template_type: templateType.toUpperCase(),
        header_type: headerType.toUpperCase(),
        header_text: headerText || undefined,
        body_text: bodyText,
        footer_text: footerText || undefined,
        buttons: buttons.map((b) => ({ type: "QUICK_REPLY", text: b.text })),
        sample_values: sampleValues,
      });

      if (res.data?.meta_submitted) {
        toast.success(`🎉 Template '${templateName}' submitted to Meta Graph API! (Status: ${res.data.status})`);
      } else {
        toast.success(`Template '${templateName}' saved locally. (Meta offline/pending review)`);
      }
      setViewMode("list");
      setStep(1);
      await loadTemplates();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create template");
    } finally {
      setSubmitting(false);
    }
  };

  // Detect variable count in bodyText
  const varMatches = (bodyText.match(/\{\{(\d+)\}\}/g) || []);
  const varCount = new Set(varMatches).size;

  const filteredTemplates = templates.filter((t) => {
    if (filterCat === "ALL") return true;
    if (filterCat === "UTILITY") return t.category === "UTILITY";
    if (filterCat === "MARKETING") return t.category === "MARKETING";
    if (filterCat === "APPROVED") return t.status === "APPROVED";
    if (filterCat === "PENDING") return t.status === "PENDING" || t.status === "DRAFT";
    return true;
  });

  return (
    <div className="space-y-6">
      {viewMode === "list" ? (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-md space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Meta WhatsApp Template Manager</h2>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 border-emerald-300">
                    {templates.length} Total Templates
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pre-approved Meta templates for Class Reminders, Fee Alerts & Outbound Broadcasts (bypasses 24-hr restriction).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncMeta}
                disabled={syncing}
                className="text-xs h-9 gap-1.5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-emerald-600" : ""}`} />
                {syncing ? "Syncing Meta..." : "Sync from Meta"}
              </Button>
              <Button
                size="sm"
                onClick={() => setViewMode("create")}
                className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Create Template
              </Button>
            </div>
          </div>

          {/* Pricing Explainer Banner for SaaS Clients (Schools, Gyms, Clinics) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                U
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Utility Category
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-normal">~₹0.15 / message</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Best for School fee reminders, Gym class reminders, OTPs, Payment receipts & Appointment alerts.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                M
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Marketing Category
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-normal">~₹0.80 / message</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Best for promotional offers, seasonal discounts, webinars, and new product launches.
                </p>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: "ALL", label: `All (${templates.length})` },
              { id: "UTILITY", label: `Utility (${templates.filter((t) => t.category === "UTILITY").length})` },
              { id: "MARKETING", label: `Marketing (${templates.filter((t) => t.category === "MARKETING").length})` },
              { id: "APPROVED", label: `Approved (${templates.filter((t) => t.status === "APPROVED").length})` },
              { id: "PENDING", label: `Pending/Draft (${templates.filter((t) => t.status !== "APPROVED").length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterCat(f.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filterCat === f.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Templates Table */}
          {loadingList ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              Loading templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 border border-dashed rounded-xl p-8">
              No templates found in this category. Click "+ Create Template" to build one or "Sync from Meta" to fetch existing templates.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="py-3 px-4">Template Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4">Message Snippet</th>
                    <th className="py-3 px-3">Language</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                  {filteredTemplates.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedDetailTemplate(t)}
                      className="hover:bg-emerald-50/40 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                      title="Click row to view full template details"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:underline underline-offset-2">
                            {t.name}
                          </span>
                          <Eye className="h-3 w-3 text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            t.category === "UTILITY"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400"
                          }`}
                        >
                          {t.category || "UTILITY"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {t.status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                          </span>
                        ) : t.status === "REJECTED" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400" title={t.rejection_reason || "Rejected by Meta"}>
                            <AlertCircle className="h-3.5 w-3.5" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Pending Review
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">
                        {t.body_text}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] uppercase">
                        {t.language || "en_US"}
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(t)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 dark:hover:bg-rose-950/30"
                            title="Delete template"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Template Detail Dialog (AiSensy Style Modal with Timeline & WhatsApp Bubble) */}
          <Dialog
            open={Boolean(selectedDetailTemplate)}
            onOpenChange={(isOpen) => {
              if (!isOpen) setSelectedDetailTemplate(null);
            }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl">
              {selectedDetailTemplate && (
                <div className="space-y-5">
                  {/* Top Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                          {selectedDetailTemplate.name}
                        </h3>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            selectedDetailTemplate.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                              : selectedDetailTemplate.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                          }`}
                        >
                          {selectedDetailTemplate.status || "APPROVED"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          Meta ID: {selectedDetailTemplate.meta_id || "Active on WABA"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Language: <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">{selectedDetailTemplate.language || "en_US"}</span> • Type: Positional Template
                      </p>
                    </div>
                  </div>

                  {/* Category Impact Banner (Like AiSensy) */}
                  <div
                    className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs ${
                      selectedDetailTemplate.category === "UTILITY"
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300"
                        : "bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/40 text-purple-900 dark:text-purple-300"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs uppercase tracking-wide">
                        Category: {selectedDetailTemplate.category || "UTILITY"}
                      </span>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        {selectedDetailTemplate.category === "UTILITY"
                          ? "Utility templates are approved for transactional updates, class reminders, fee dues & alerts."
                          : "Marketing templates are used for promotions, discount offers, sales re-targeting & webinars."}
                      </p>
                    </div>
                    <div className="md:text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block">Meta Billing Rate</span>
                      <span className="text-xs font-bold font-mono">
                        {selectedDetailTemplate.category === "UTILITY" ? "~₹0.15 / message" : "~₹0.80 / message"}
                      </span>
                    </div>
                  </div>

                  {/* 2-Column Split: Template Journey (Left) + WhatsApp Message Bubble (Right) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-1">
                    {/* Left: Template Journey Timeline */}
                    <div className="md:col-span-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Template Journey
                      </h4>

                      <div className="space-y-4 relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                        {/* Step 1: Created */}
                        <div className="relative">
                          <div className="absolute -left-5 top-1 h-3.5 w-3.5 rounded-full bg-slate-400 border-2 border-white dark:border-slate-900" />
                          <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <FileText className="h-3 w-3 text-slate-500" /> Created & Submitted
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {selectedDetailTemplate.created_at || "Recent"}
                          </div>
                        </div>

                        {/* Step 2: Meta Review */}
                        <div className="relative">
                          <div className="absolute -left-5 top-1 h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                          <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <ShieldCheck className="h-3 w-3 text-blue-500" /> Meta AI Review
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Processed via Meta Graph API v21.0
                          </div>
                        </div>

                        {/* Step 3: Current Status */}
                        <div className="relative">
                          <div
                            className={`absolute -left-5 top-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              selectedDetailTemplate.status === "APPROVED"
                                ? "bg-emerald-500"
                                : selectedDetailTemplate.status === "REJECTED"
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            }`}
                          />
                          <div
                            className={`font-semibold text-xs flex items-center gap-1.5 ${
                              selectedDetailTemplate.status === "APPROVED"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : selectedDetailTemplate.status === "REJECTED"
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {selectedDetailTemplate.status === "APPROVED" && (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Approved by Meta
                              </>
                            )}
                            {selectedDetailTemplate.status === "REJECTED" && (
                              <>
                                <AlertCircle className="h-3 w-3" /> Rejected by Meta
                              </>
                            )}
                            {selectedDetailTemplate.status !== "APPROVED" && selectedDetailTemplate.status !== "REJECTED" && (
                              <>
                                <RefreshCw className="h-3 w-3 animate-spin" /> Pending Meta Review
                              </>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {selectedDetailTemplate.status === "APPROVED"
                              ? "Ready for automated broadcasts outside the 24h window."
                              : selectedDetailTemplate.status === "REJECTED"
                              ? `Reason: ${selectedDetailTemplate.rejection_reason || "Policy guideline mismatch"}`
                              : "Meta review queue (typically 5 mins to 1 hour)."}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: WhatsApp Message Bubble Card */}
                    <div className="md:col-span-7 bg-[#EFEAE2] dark:bg-[#0c1317] p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#075E54] dark:text-emerald-400 mb-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>WhatsApp Message Content</span>
                      </div>

                      {/* Bubble */}
                      <div className="bg-white dark:bg-[#1F2C34] rounded-2xl rounded-tl-xs p-3.5 shadow-sm text-xs space-y-2 max-w-[96%] border border-slate-100 dark:border-white/5">
                        {/* Header */}
                        {selectedDetailTemplate.header_text && (
                          <div className="font-bold text-slate-900 dark:text-white pb-1 border-b border-slate-100 dark:border-white/5">
                            {selectedDetailTemplate.header_text}
                          </div>
                        )}

                        {/* Body Text (Full text with linebreaks preserved) */}
                        <div className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                          {selectedDetailTemplate.body_text}
                        </div>

                        {/* Footer */}
                        {selectedDetailTemplate.footer_text && (
                          <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-50 dark:border-white/5">
                            {selectedDetailTemplate.footer_text}
                          </div>
                        )}

                        {/* Buttons */}
                        {selectedDetailTemplate.buttons && selectedDetailTemplate.buttons.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                            {selectedDetailTemplate.buttons.map((b, idx) => (
                              <div
                                key={idx}
                                className="w-full py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-emerald-700 dark:text-emerald-400 font-semibold text-center text-[11px] shadow-2xs"
                              >
                                {b.text || b.title}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-[9px] text-slate-400 text-right flex items-center justify-end gap-1 pt-1">
                          <span>10:45</span>
                          <CheckCircle2 className="h-2.5 w-2.5 text-blue-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/10 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedDetailTemplate.name);
                        toast.success(`Copied '${selectedDetailTemplate.name}' to clipboard!`);
                      }}
                      className="text-xs h-9 dark:border-white/10 gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy Name
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDetailTemplate(null)}
                        className="text-xs h-9 dark:border-white/10"
                      >
                        Close
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedDetailTemplate(null);
                          navigate("/campaigns?tab=whatsapp");
                        }}
                        className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                      >
                        <Send className="h-3.5 w-3.5" /> Launch Broadcast
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        /* Create Template Wizard View */
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("list")}
                className="text-xs h-8 dark:border-white/10"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Templates
              </Button>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Meta Template</h2>
            </div>
            <div className="text-xs text-slate-400">
              Direct submission to Meta Graph API
            </div>
          </div>

          {/* Step Wizard Bar */}
          <div className="flex items-center justify-between max-w-2xl mx-auto mb-8 overflow-x-auto pb-2">
            {[
              { num: 1, label: "Basic Info" },
              { num: 2, label: "Header" },
              { num: 3, label: "Body & Variables" },
              { num: 4, label: "Buttons" },
              { num: 5, label: "Review & Submit" },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s.num
                      ? "bg-emerald-600 text-white"
                      : step > s.num
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                </div>
                <span className={`text-xs font-medium ${step === s.num ? "text-slate-900 dark:text-white font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                  {s.label}
                </span>
                {s.num < 5 && <div className="h-0.5 w-6 md:w-10 bg-slate-200 dark:bg-white/10 mx-1" />}
              </div>
            ))}
          </div>

          {/* Split View: Form on Left, WhatsApp Live Mockup on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Category (Determines Meta Billing Rate)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "Utility", rate: "~₹0.15 / msg", desc: "For reminders, fee alerts, class links, appointment updates" },
                        { id: "Marketing", rate: "~₹0.80 / msg", desc: "For offers, discount coupons, promotions, product launches" },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategory(c.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all ${
                            category === c.id
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-sm"
                              : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/60 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-900 dark:text-white">{c.id}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                              {c.rate}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            {c.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Template Name (Meta Identifier)</label>
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                      placeholder="e.g. fee_due_reminder or class_reminder_batch_a"
                      className="text-xs h-9 font-mono bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Only lowercase letters, numbers, and underscores allowed.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full text-xs h-9 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/80 text-slate-900 dark:text-white px-3"
                      >
                        <option value="English">English (en_US)</option>
                        <option value="Hindi">Hindi (hi)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Template Type</label>
                      <select
                        value={templateType}
                        onChange={(e) => setTemplateType(e.target.value)}
                        className="w-full text-xs h-9 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/80 text-slate-900 dark:text-white px-3"
                      >
                        <option value="Standard">Standard Text & Buttons</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Header Type (Optional)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {["None", "Text"].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHeaderType(h)}
                          className={`p-3 rounded-xl border text-center text-xs font-semibold transition-all ${
                            headerType === h
                              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                              : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/60 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>

                  {headerType === "Text" && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Header Title (max 60 chars)</label>
                      <Input
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value.slice(0, 60))}
                        placeholder={`e.g. ${compName} Official Notice`}
                        className="text-xs h-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Message Body</label>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          className="text-[10px] h-7 px-2 dark:border-white/10 text-emerald-600"
                          onClick={() => setBodyText((prev) => prev + ` {{${varCount + 1}}}`)}
                        >
                          + Variable {`{{${varCount + 1}}}`}
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      rows={5}
                      placeholder="e.g. Dear {{1}}, your fees of ₹{{2}} is due on {{3}}."
                      className="text-xs leading-relaxed bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                    />
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">Quick inserts:</span>
                      <button
                        type="button"
                        onClick={() => setBodyText("Dear {{1}}, your tuition/fees of ₹{{2}} is due on {{3}}. Please pay online: {{4}}")}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                      >
                        School Fees Alert
                      </button>
                      <button
                        type="button"
                        onClick={() => setBodyText("Hi {{1}}, your upcoming class {{2}} is scheduled today at {{3}}. Join link: {{4}}")}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                      >
                        Class Join Reminder
                      </button>
                      <button
                        type="button"
                        onClick={() => setBodyText("Hi {{1}}, your gym membership expires on {{2}}. Renew today to retain your active slot: {{3}}")}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                      >
                        Gym Renewal Alert
                      </button>
                    </div>
                  </div>

                  {/* Sample Values for Meta Approval (Mandatory by Meta) */}
                  {varCount > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
                      <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        Sample Values for Meta Approval (Mandatory)
                      </div>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">
                        Meta AI requires realistic sample text for each variable to approve your template.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                        {Array.from({ length: varCount }).map((_, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                              {`{{${idx + 1}}}`} Sample:
                            </span>
                            <Input
                              value={sampleValues[idx] || ""}
                              onChange={(e) => {
                                const updated = [...sampleValues];
                                updated[idx] = e.target.value;
                                setSampleValues(updated);
                              }}
                              placeholder={`Sample for {{${idx + 1}}}`}
                              className="text-xs h-7 bg-white dark:bg-slate-900"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Footer Text (Optional)</label>
                    <Input
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      placeholder="e.g. Reply STOP to unsubscribe"
                      className="text-xs h-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Quick Reply Buttons (Max 3)</label>
                  {buttons.map((b, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={b.text}
                        onChange={(e) => {
                          const updated = [...buttons];
                          updated[idx].text = e.target.value;
                          setButtons(updated);
                        }}
                        className="text-xs h-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-2 text-rose-500 dark:border-white/10 dark:hover:bg-white/10"
                        onClick={() => setButtons(buttons.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {buttons.length < 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
                      onClick={() => setButtons([...buttons, { type: "Quick Reply", text: "Paid Already" }])}
                    >
                      <Plus className="h-3 w-3" /> Add Button
                    </Button>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 text-xs">
                  <h4 className="font-bold text-slate-900 dark:text-white">Review Template Submission</h4>
                  <p className="text-slate-500 dark:text-slate-400">
                    Ready to submit template <strong>{templateName}</strong> to Meta Graph API for automated review.
                  </p>
                  <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                    <div>&bull; <strong>Name:</strong> <span className="font-mono text-emerald-600">{templateName}</span></div>
                    <div>&bull; <strong>Category:</strong> {category} ({category === "Utility" ? "~₹0.15/msg" : "~₹0.80/msg"})</div>
                    <div>&bull; <strong>Language:</strong> {language}</div>
                    <div>&bull; <strong>Variables Detected:</strong> {varCount} ({sampleValues.slice(0, varCount).join(", ")})</div>
                    <div>&bull; <strong>Buttons:</strong> {buttons.length} quick replies</div>
                  </div>
                </div>
              )}

              {/* Wizard Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="text-xs h-9 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                {step < 5 ? (
                  <Button
                    size="sm"
                    onClick={() => setStep((s) => Math.min(5, s + 1))}
                    className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting to Meta...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" /> Submit to Meta API
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* WhatsApp Mobile Frame Preview (5 cols) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-[300px] h-[550px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800 relative flex flex-col">
                {/* Phone Speaker & Camera Notch */}
                <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2" />

                {/* WhatsApp App Mockup View */}
                <div className="flex-1 rounded-[26px] overflow-hidden bg-[#E5DDD5] dark:bg-[#0B141A] flex flex-col justify-between p-2">
                  {/* WhatsApp Chat Header */}
                  <div className="bg-[#005C4B] text-white px-3 py-2 rounded-t-xl flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs uppercase">
                      {compName.charAt(0) || "B"}
                    </div>
                    <div>
                      <div className="font-semibold text-xs leading-none">{compName}</div>
                      <div className="text-[9px] text-emerald-200">Official Business</div>
                    </div>
                  </div>

                  {/* Message Bubble Canvas */}
                  <div className="flex-1 py-3 overflow-y-auto space-y-2">
                    <div className="text-center text-[9px] text-slate-500 bg-white/60 dark:bg-black/30 rounded-full px-2 py-0.5 w-fit mx-auto">
                      TODAY
                    </div>

                    <div className="bg-white dark:bg-[#1F2C34] rounded-2xl p-3 shadow-sm text-xs space-y-1.5 max-w-[92%]">
                      {headerType === "Text" && headerText && (
                        <div className="font-bold text-slate-900 dark:text-white text-xs pb-1 border-b border-slate-100 dark:border-white/5">
                          {headerText}
                        </div>
                      )}
                      <div className="text-slate-800 dark:text-slate-200 text-[11px] leading-relaxed">
                        {previewBody}
                      </div>
                      {footerText && (
                        <div className="text-[9px] text-slate-400 italic pt-1">
                          {footerText}
                        </div>
                      )}
                      <div className="text-[9px] text-slate-400 text-right flex items-center justify-end gap-1">
                        14:45 <CheckCircle2 className="h-2.5 w-2.5 text-blue-500" />
                      </div>
                    </div>

                    {/* Quick Reply Buttons Preview */}
                    {buttons.length > 0 && (
                      <div className="space-y-1 max-w-[92%]">
                        {buttons.map((b, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-[#1F2C34] text-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm"
                          >
                            {b.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom WhatsApp bar */}
                  <div className="bg-white/80 dark:bg-[#1F2C34] px-2 py-1.5 rounded-b-xl flex items-center justify-between text-[10px] text-slate-400">
                    <span>Type a message</span>
                    <Send className="h-3 w-3 text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

