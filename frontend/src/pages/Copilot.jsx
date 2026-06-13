import { useCallback, useEffect, useRef, useState } from "react";
import api, { API_BASE } from "@/lib/api";
import { inr, errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bot, Lightbulb, Package, Tag, ShieldAlert, Handshake,
  Target, Wallet, Clock, User, TrendingUp, Play, Square,
  Send, RefreshCw, Loader2, Gem, ChevronRight, Sparkles,
  MessageSquare, History, Star, Flame, BarChart2, ListChecks,
  CheckCircle2, Zap,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-500";
}

function scoreBg(score) {
  if (score >= 75) return "bg-emerald-50 border-emerald-200";
  if (score >= 50) return "bg-amber-50 border-amber-200";
  return "bg-rose-50 border-rose-200";
}

function scoreBarColor(score) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-400";
}

const SUGGESTION_CONFIG = {
  next_question:      { icon: MessageSquare, label: "Next Question",          accent: "border-sky-200 bg-sky-50",      iconClass: "text-sky-600" },
  product_suggestion: { icon: Package,       label: "Product Recommendation", accent: "border-amber-200 bg-amber-50",  iconClass: "text-amber-700" },
  offer_suggestion:   { icon: Tag,           label: "Offer Suggestion",       accent: "border-violet-200 bg-violet-50", iconClass: "text-violet-600" },
  objection_handling: { icon: ShieldAlert,   label: "Objection Handling",     accent: "border-rose-200 bg-rose-50",    iconClass: "text-rose-600" },
  closing_suggestion: { icon: Handshake,     label: "Deal Closing",           accent: "border-emerald-200 bg-emerald-50", iconClass: "text-emerald-600" },
};

// ─── sub-components ───────────────────────────────────────────────────────────

function SuggestionCard({ type, content, confidence }) {
  const cfg = SUGGESTION_CONFIG[type] || { icon: Lightbulb, label: type, accent: "border-slate-200 bg-slate-50", iconClass: "text-slate-500" };
  const Icon = cfg.icon;
  return (
    <div className={`rounded-xl border p-4 ${cfg.accent} transition-all duration-300`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${cfg.iconClass} shrink-0`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cfg.label}</span>
        {confidence && (
          <span className="ml-auto text-[10px] bg-white/70 border border-white rounded-full px-2 py-0.5 text-slate-500">
            {Math.round(confidence * 100)}% conf
          </span>
        )}
      </div>
      <p className="text-sm text-slate-800 leading-relaxed">{content}</p>
    </div>
  );
}

function QualificationRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-amber-50 last:border-0">
      <div className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${highlight || "bg-slate-100"}`}>
        <Icon className="h-3.5 w-3.5 text-slate-600" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{label}</div>
        <div className="text-sm font-semibold text-slate-800 truncate">{value || "Unknown"}</div>
      </div>
    </div>
  );
}

function TranscriptBubble({ speaker, content, createdAt }) {
  const isCustomer = speaker === "Customer";
  return (
    <div className={`flex gap-2 ${isCustomer ? "justify-start" : "justify-end"} mb-3`}>
      {isCustomer && (
        <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-1">
          <User className="h-3.5 w-3.5 text-amber-700" />
        </div>
      )}
      <div className={`max-w-[80%] ${isCustomer ? "" : "order-first"}`}>
        <div className="text-[10px] text-slate-400 mb-1 font-medium">
          {speaker} {createdAt && `• ${new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </div>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isCustomer
            ? "bg-white border border-amber-100 text-slate-800 rounded-tl-sm"
            : "bg-amber-700 text-white rounded-tr-sm"
        }`}>
          {content}
        </div>
      </div>
      {!isCustomer && (
        <div className="h-7 w-7 rounded-full bg-amber-700 flex items-center justify-center shrink-0 mt-1">
          <Gem className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-100 bg-white hover:border-amber-300 transition-colors">
      <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
        <Gem className="h-4 w-4 text-amber-700" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-800 truncate">{product.product_name}</div>
        <div className="text-xs text-slate-500">{product.metal_type} · {product.category}</div>
        <div className="text-xs text-amber-700 font-semibold mt-0.5">{inr(product.price)}</div>
      </div>
      <div className="text-[10px] text-slate-400 max-w-[90px] text-right leading-tight">{product.reason}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Copilot() {
  // Session state
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [insight, setInsight] = useState(null);
  const [products, setProducts] = useState([]);
  const [historySummary, setHistorySummary] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [speaker, setSpeaker] = useState("Customer");
  const [aiLoading, setAiLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("suggestions");

  // Page-level tabs
  const [pageTab, setPageTab] = useState("session"); // "session" | "pipeline"

  // Pipeline state
  const [pipeline, setPipeline] = useState([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [batchScoring, setBatchScoring] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [creatingTask, setCreatingTask] = useState(null);

  const wsRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load leads ───────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/leads", { params: { page: 1, page_size: 100 } })
      .then((r) => setLeads(r.data.items || []))
      .catch(() => {});
  }, []);

  // ── Scroll transcript ────────────────────────────────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Cleanup WS ───────────────────────────────────────────────────────────
  useEffect(() => { return () => wsRef.current?.close(); }, []);

  // ── Pipeline loaders ─────────────────────────────────────────────────────
  function loadPipeline() {
    setPipelineLoading(true);
    api.get("/copilot/pipeline")
      .then((r) => setPipeline(r.data || []))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setPipelineLoading(false));
  }

  async function runBatchScore() {
    setBatchScoring(true);
    try {
      const res = await api.post("/copilot/batch-score");
      toast.success(res.data.message || "Scoring started");
      setTimeout(loadPipeline, 4000);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBatchScoring(false);
    }
  }

  function loadFollowUps() {
    setFollowUpsLoading(true);
    api.get("/copilot/follow-ups", { params: { stale_days: 7 } })
      .then((r) => setFollowUps(r.data || []))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setFollowUpsLoading(false));
  }

  async function createTaskFromFollowUp(fu) {
    setCreatingTask(fu.lead_id);
    try {
      await api.post("/copilot/follow-ups/create-task", {
        lead_id: fu.lead_id,
        title: `Follow up: ${fu.lead_name}`,
        description: fu.message,
      });
      toast.success("Task created!");
      setFollowUps((prev) => prev.filter((f) => f.lead_id !== fu.lead_id));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setCreatingTask(null);
    }
  }

  // ── WebSocket ────────────────────────────────────────────────────────────
  const connectWs = useCallback((sessionId) => {
    if (wsRef.current) wsRef.current.close();
    const wsBase = API_BASE.replace(/^http/, "ws");
    const token = localStorage.getItem("facets_token");
    const ws = new WebSocket(`${wsBase}/copilot/ws/${sessionId}?token=${token}`);
    ws.onopen = () => {
      ws._pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 25000);
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "suggestions" && msg.data) {
          const ai = msg.data;
          const newSuggestions = {};
          ["next_question","product_suggestion","offer_suggestion","objection_handling","closing_suggestion"].forEach((k) => {
            if (ai[k]) newSuggestions[k] = { content: ai[k], confidence: 0.85 };
          });
          setSuggestions(newSuggestions);
          setInsight((prev) => ({
            ...(prev || {}),
            lead_score: ai.lead_score ?? prev?.lead_score ?? 0,
            intent: ai.intent ?? prev?.intent ?? "Unknown",
            budget: ai.budget ?? prev?.budget ?? "Unknown",
            timeline: ai.timeline ?? prev?.timeline ?? "Unknown",
            decision_maker: ai.decision_maker ?? prev?.decision_maker ?? "Unknown",
          }));
          setAiLoading(false);
        }
      } catch (_) {}
    };
    ws.onerror = () => setAiLoading(false);
    ws.onclose = () => clearInterval(ws._pingInterval);
    wsRef.current = ws;
  }, []);

  // ── Session controls ─────────────────────────────────────────────────────
  async function startSession() {
    if (!selectedLead) { toast.error("Please select a lead first"); return; }
    setSessionLoading(true);
    try {
      const res = await api.post("/copilot/sessions", { lead_id: selectedLead.id });
      const sess = res.data;
      setSession(sess);
      setMessages([]); setSuggestions({}); setInsight(null);
      connectWs(sess.id);
      try { const r = await api.get(`/copilot/leads/${selectedLead.id}/insight`); setInsight(r.data); } catch (_) {}
      loadProducts();
      toast.success("AI Copilot session started");
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSessionLoading(false); }
  }

  async function endSession() {
    if (!session) return;
    try {
      await api.patch(`/copilot/sessions/${session.id}/end`);
      setSession((s) => ({ ...s, status: "ended" }));
      wsRef.current?.close();
      toast.success("Session ended");
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function sendMessage() {
    const content = msgInput.trim();
    if (!content || !session) return;
    if (session.status === "ended") { toast.error("Session has ended"); return; }
    const optimistic = { id: Date.now(), session_id: session.id, speaker, content, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setMsgInput("");
    setAiLoading(true);
    inputRef.current?.focus();
    try {
      await api.post(`/copilot/sessions/${session.id}/messages`, { speaker, content });
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setTimeout(() => pollSuggestions(), 3000);
      }
    } catch (e) { toast.error(errMsg(e)); setAiLoading(false); }
  }

  async function pollSuggestions() {
    if (!session) return;
    try {
      const res = await api.get(`/copilot/sessions/${session.id}/suggestions`);
      const map = {};
      (res.data || []).forEach((s) => { map[s.suggestion_type] = { content: s.content, confidence: s.confidence }; });
      setSuggestions(map);
    } catch (_) {}
    setAiLoading(false);
  }

  async function triggerAnalysis() {
    if (!session) return;
    setAiLoading(true);
    try {
      const res = await api.post(`/copilot/sessions/${session.id}/analyse`);
      const ai = res.data;
      const newSuggestions = {};
      ["next_question","product_suggestion","offer_suggestion","objection_handling","closing_suggestion"].forEach((k) => {
        if (ai[k]) newSuggestions[k] = { content: ai[k], confidence: 0.85 };
      });
      setSuggestions(newSuggestions);
      setInsight((prev) => ({
        ...(prev || {}),
        lead_score: ai.lead_score ?? 0,
        intent: ai.intent ?? "Unknown",
        budget: ai.budget ?? "Unknown",
        timeline: ai.timeline ?? "Unknown",
        decision_maker: ai.decision_maker ?? "Unknown",
      }));
    } catch (e) { toast.error(errMsg(e)); }
    finally { setAiLoading(false); }
  }

  async function loadProducts() {
    if (!selectedLead) return;
    try {
      const res = await api.get(`/copilot/leads/${selectedLead.id}/product-recommendations`);
      setProducts(res.data || []);
    } catch (_) {}
  }

  async function loadHistorySummary() {
    if (!selectedLead) return;
    setHistoryLoading(true);
    try {
      const res = await api.get(`/copilot/leads/${selectedLead.id}/history-summary`);
      setHistorySummary(res.data.summary || "");
    } catch (e) { toast.error(errMsg(e)); }
    finally { setHistoryLoading(false); }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const hasSuggestions = Object.keys(suggestions).length > 0;

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4" data-testid="copilot-page">

      {/* ── Page header + tab switcher ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-slate-900 flex items-center gap-2">
            <Bot className="h-7 w-7 text-amber-700" />
            AI Sales Copilot
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time AI assistance · Pipeline Intelligence · Follow-up Engine
          </p>
        </div>
        <div className="flex gap-1 bg-amber-50 border border-amber-100 rounded-xl p-1">
          {[
            { id: "session",  Icon: MessageSquare, label: "Live Session" },
            { id: "pipeline", Icon: BarChart2,      label: "Pipeline" },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => { setPageTab(id); if (id === "pipeline" && pipeline.length === 0) loadPipeline(); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pageTab === id ? "bg-amber-700 text-white shadow-sm" : "text-slate-600 hover:text-amber-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ LIVE SESSION TAB ══════════════════════════════════════════════ */}
      {pageTab === "session" && (
        <>
          {/* Lead selector + session controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={selectedLead?.id?.toString() || ""}
              onValueChange={(v) => {
                const lead = leads.find((l) => l.id === parseInt(v));
                setSelectedLead(lead || null);
                setSession(null); setMessages([]); setSuggestions({});
                setInsight(null); setHistorySummary("");
                wsRef.current?.close();
              }}
            >
              <SelectTrigger className="w-52 border-amber-200 bg-white" data-testid="lead-select">
                <SelectValue placeholder="Select a lead…" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id.toString()}>{l.name} — {l.status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!session || session.status === "ended" ? (
              <Button onClick={startSession} disabled={!selectedLead || sessionLoading}
                className="bg-amber-700 hover:bg-amber-800 gap-1.5" data-testid="start-session-btn">
                {sessionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Start Session
              </Button>
            ) : (
              <Button onClick={endSession} variant="outline"
                className="border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5" data-testid="end-session-btn">
                <Square className="h-4 w-4" /> End Session
              </Button>
            )}

            {session && (
              <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
                session.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}>
                <span className={`h-2 w-2 rounded-full ${session.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                Session #{session.id} — {session.status === "active" ? "Live" : "Ended"}
              </div>
            )}
          </div>

          {!session && (
            <Card className="p-10 border-amber-100 bg-white text-center">
              <Bot className="h-12 w-12 text-amber-200 mx-auto mb-4" />
              <h2 className="font-serif text-xl text-slate-700 mb-2">Ready to assist your sales team</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Select a lead and start a session. The AI will analyse the conversation in real-time
                and provide next-best-action suggestions, product recommendations, and lead qualification scores.
              </p>
            </Card>
          )}

          {session && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr_340px] gap-4 items-start">

              {/* LEFT: Transcript */}
              <Card className="border-amber-100 bg-white flex flex-col" style={{ height: "calc(100vh - 240px)", minHeight: 500 }}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-amber-100">
                  <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-amber-700" /> Conversation Transcript
                  </h2>
                  <span className="text-xs text-slate-400">{messages.length} messages</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-10">
                      <MessageSquare className="h-8 w-8 mb-3 text-slate-200" />
                      <p className="text-sm">Type the conversation below.</p>
                      <p className="text-xs mt-1">AI suggestions appear instantly after each message.</p>
                    </div>
                  )}
                  {messages.map((m) => (
                    <TranscriptBubble key={m.id} speaker={m.speaker} content={m.content} createdAt={m.created_at} />
                  ))}
                  {aiLoading && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 pl-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI is analysing…
                    </div>
                  )}
                  <div ref={transcriptEndRef} />
                </div>
                <div className="border-t border-amber-100 p-3 space-y-2">
                  <div className="flex gap-2">
                    <Select value={speaker} onValueChange={setSpeaker}>
                      <SelectTrigger className="w-36 h-9 text-xs border-amber-200" data-testid="speaker-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Customer">Customer</SelectItem>
                        <SelectItem value="Salesperson">Salesperson</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input ref={inputRef} value={msgInput} onChange={(e) => setMsgInput(e.target.value)}
                      onKeyDown={handleKeyDown} placeholder="Type message and press Enter…"
                      className="flex-1 h-9 text-sm border-amber-200 focus:border-amber-400"
                      disabled={session.status === "ended"} data-testid="message-input" />
                    <Button onClick={sendMessage} disabled={!msgInput.trim() || session.status === "ended"}
                      className="h-9 w-9 p-0 bg-amber-700 hover:bg-amber-800 shrink-0" data-testid="send-message-btn">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400">Press Enter to send · Shift+Enter for new line</p>
                </div>
              </Card>

              {/* CENTER: AI Suggestions */}
              <Card className="border-amber-100 bg-white flex flex-col" style={{ height: "calc(100vh - 240px)", minHeight: 500 }}>
                <div className="flex border-b border-amber-100">
                  {[
                    { id: "suggestions", Icon: Sparkles, label: "AI Suggestions" },
                    { id: "products",    Icon: Package,  label: "Products" },
                    { id: "history",     Icon: History,  label: "History" },
                  ].map(({ id, Icon, label }) => (
                    <button key={id}
                      onClick={() => {
                        setActiveTab(id);
                        if (id === "history" && !historySummary) loadHistorySummary();
                        if (id === "products" && products.length === 0) loadProducts();
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                        activeTab === id ? "text-amber-700 border-b-2 border-amber-700 bg-amber-50/50" : "text-slate-500 hover:text-slate-700"
                      }`}>
                      <Icon className="h-3.5 w-3.5" />{label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {activeTab === "suggestions" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          {hasSuggestions ? "AI suggestions based on transcript" : "Send a message to generate suggestions"}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-700 hover:bg-amber-50"
                          onClick={triggerAnalysis} disabled={aiLoading || messages.length === 0}
                          data-testid="refresh-suggestions-btn">
                          <RefreshCw className={`h-3 w-3 mr-1 ${aiLoading ? "animate-spin" : ""}`} /> Refresh
                        </Button>
                      </div>
                      {!hasSuggestions && !aiLoading && (
                        <div className="py-12 text-center text-slate-400">
                          <Sparkles className="h-8 w-8 mx-auto mb-3 text-slate-200" />
                          <p className="text-sm">Add conversation messages to get AI suggestions</p>
                        </div>
                      )}
                      {aiLoading && !hasSuggestions && (
                        <div className="py-12 text-center">
                          <Loader2 className="h-8 w-8 mx-auto mb-3 text-amber-400 animate-spin" />
                          <p className="text-sm text-slate-400">Generating suggestions…</p>
                        </div>
                      )}
                      {Object.entries(SUGGESTION_CONFIG).map(([type]) => {
                        const s = suggestions[type];
                        if (!s) return null;
                        return <SuggestionCard key={type} type={type} content={s.content} confidence={s.confidence} />;
                      })}
                    </div>
                  )}
                  {activeTab === "products" && (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-400 mb-3">AI-matched products for this lead</div>
                      {products.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                          <Package className="h-8 w-8 mx-auto mb-3 text-slate-200" />
                          <p className="text-sm">No products matched yet</p>
                          <Button variant="outline" size="sm" className="mt-3 border-amber-200 text-amber-700" onClick={loadProducts}>
                            Load Recommendations
                          </Button>
                        </div>
                      ) : products.map((p, i) => <ProductCard key={i} product={p} />)}
                    </div>
                  )}
                  {activeTab === "history" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">AI summary of past interactions</span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-700 hover:bg-amber-50"
                          onClick={loadHistorySummary} disabled={historyLoading}>
                          <RefreshCw className={`h-3 w-3 mr-1 ${historyLoading ? "animate-spin" : ""}`} /> Refresh
                        </Button>
                      </div>
                      {historyLoading ? (
                        <div className="py-10 text-center"><Loader2 className="h-7 w-7 mx-auto animate-spin text-amber-400" /></div>
                      ) : historySummary ? (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Star className="h-4 w-4 text-amber-700" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">AI Summary</span>
                          </div>
                          <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{historySummary}</div>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-slate-400">
                          <History className="h-8 w-8 mx-auto mb-3 text-slate-200" />
                          <p className="text-sm">Click Refresh to load AI summary</p>
                        </div>
                      )}
                      {selectedLead && (
                        <div className="mt-4 space-y-2">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead Profile</div>
                          <div className="rounded-xl border border-amber-100 bg-white p-4 space-y-2">
                            {[["Name", selectedLead.name], ["Status", selectedLead.status],
                              ["Budget", selectedLead.budget ? inr(selectedLead.budget) : "Unknown"],
                              ["Interest", selectedLead.customer_type || "Unknown"],
                              ["City", selectedLead.city || "Unknown"]].map(([k, v]) => (
                              <div key={k} className="flex justify-between text-sm">
                                <span className="text-slate-500">{k}</span>
                                <span className="font-medium">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* RIGHT: Lead Qualification */}
              <Card className="border-amber-100 bg-white" style={{ height: "calc(100vh - 240px)", minHeight: 500 }}>
                <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-100">
                  <Target className="h-4 w-4 text-amber-700" />
                  <h2 className="font-semibold text-slate-800 text-sm">Lead Qualification</h2>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100%-52px)]">
                  <div className={`rounded-xl border p-4 mb-4 ${insight ? scoreBg(insight.lead_score) : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" /> Lead Score
                      </span>
                      <span className={`text-2xl font-bold ${insight ? scoreColor(insight.lead_score) : "text-slate-300"}`}>
                        {insight ? `${insight.lead_score}%` : "--"}
                      </span>
                    </div>
                    <div className="h-2.5 bg-white/60 rounded-full overflow-hidden border border-white/40">
                      <div className={`h-full rounded-full transition-all duration-700 ${insight ? scoreBarColor(insight.lead_score) : "bg-slate-200"}`}
                        style={{ width: insight ? `${insight.lead_score}%` : "0%" }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {insight
                        ? insight.lead_score >= 75 ? "Hot lead — prioritise closing"
                        : insight.lead_score >= 50 ? "Warm lead — nurture further"
                        : "Cold lead — build interest"
                        : "Start conversation to score lead"}
                    </p>
                  </div>
                  <div className="space-y-0 divide-y divide-amber-50">
                    <QualificationRow icon={Lightbulb} label="Intent"           value={insight?.intent}         highlight="bg-sky-50" />
                    <QualificationRow icon={Wallet}    label="Budget"           value={insight?.budget}         highlight="bg-emerald-50" />
                    <QualificationRow icon={Clock}     label="Purchase Timeline" value={insight?.timeline}     highlight="bg-violet-50" />
                    <QualificationRow icon={User}      label="Decision Maker"   value={insight?.decision_maker} highlight="bg-amber-50" />
                  </div>
                  <div className="mt-5">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">BANT Qualification</div>
                    {[
                      { label: "Budget",    filled: !!(insight?.budget && insight.budget !== "Unknown") },
                      { label: "Authority", filled: !!(insight?.decision_maker && insight.decision_maker !== "Unknown") },
                      { label: "Need",      filled: !!(insight?.intent && insight.intent !== "Unknown") },
                      { label: "Timeline",  filled: !!(insight?.timeline && insight.timeline !== "Unknown") },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3 mb-2">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${item.filled ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-300"}`}>
                          {item.filled ? <ChevronRight className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-slate-300" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-slate-600 font-medium">{item.label}</span>
                            <span className={item.filled ? "text-emerald-600" : "text-slate-400"}>{item.filled ? "Qualified" : "Pending"}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${item.filled ? "bg-emerald-400 w-full" : "w-0"}`} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!insight && (
                    <div className="mt-6 text-center text-slate-400 py-4">
                      <Target className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                      <p className="text-xs">Qualification data will appear after AI analysis</p>
                    </div>
                  )}
                </div>
              </Card>

            </div>
          )}
        </>
      )}

      {/* ══ PIPELINE TAB ══════════════════════════════════════════════════ */}
      {pageTab === "pipeline" && (
        <div className="space-y-5">

          {/* Stats bar + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>{pipeline.length} leads</span>
              <span className="text-rose-500 font-medium flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" /> {pipeline.filter((l) => l.is_hot).length} hot
              </span>
              <span className="text-amber-600 font-medium">
                {pipeline.filter((l) => l.lead_score >= 50 && l.lead_score < 75).length} warm
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50"
                onClick={loadPipeline} disabled={pipelineLoading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${pipelineLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button size="sm" className="bg-amber-700 hover:bg-amber-800 gap-1.5"
                onClick={runBatchScore} disabled={batchScoring} data-testid="batch-score-btn">
                {batchScoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Batch Score All
              </Button>
            </div>
          </div>

          {/* Ranked leads table */}
          <Card className="border-amber-100 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="pipeline-table">
                <thead className="bg-amber-50/60 text-slate-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Lead</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3 w-44">AI Score</th>
                    <th className="text-left px-4 py-3">Intent</th>
                    <th className="text-left px-4 py-3">Budget</th>
                    <th className="text-left px-4 py-3">Timeline</th>
                    <th className="text-left px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineLoading ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-400" />
                      Loading pipeline…
                    </td></tr>
                  ) : pipeline.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">
                      <BarChart2 className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                      Click Refresh to load pipeline
                    </td></tr>
                  ) : pipeline.map((lead) => (
                    <tr key={lead.lead_id} className="border-t border-amber-50 hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {lead.is_hot && <Flame className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                          <div>
                            <div className="font-medium text-slate-800">{lead.name}</div>
                            <div className="text-xs text-slate-400">{lead.city}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium">
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${
                              lead.lead_score >= 75 ? "bg-emerald-500" :
                              lead.lead_score >= 50 ? "bg-amber-500" : "bg-rose-400"
                            }`} style={{ width: `${lead.lead_score}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-8 ${
                            lead.lead_score >= 75 ? "text-emerald-600" :
                            lead.lead_score >= 50 ? "text-amber-600" : "text-rose-500"
                          }`}>{lead.lead_score}%</span>
                        </div>
                        {!lead.has_insight && <div className="text-[10px] text-slate-400 mt-0.5">Not scored yet</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[120px] truncate">{lead.intent}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{lead.budget ? inr(lead.budget) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{lead.timeline}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-700 hover:bg-amber-50"
                          onClick={() => {
                            setSelectedLead({ id: lead.lead_id, name: lead.name, status: lead.status,
                              customer_type: lead.customer_type, budget: lead.budget, city: lead.city });
                            setPageTab("session");
                          }}>
                          <Bot className="h-3 w-3 mr-1" /> Copilot
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* AI Follow-Up Engine */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-amber-700" />
                AI Follow-Up Engine
                <span className="text-xs font-normal text-slate-400">(no activity in 7+ days)</span>
              </h2>
              <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50"
                onClick={loadFollowUps} disabled={followUpsLoading} data-testid="load-followups-btn">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${followUpsLoading ? "animate-spin" : ""}`} />
                Generate Follow-Ups
              </Button>
            </div>

            {followUpsLoading && (
              <div className="py-10 text-center">
                <Loader2 className="h-7 w-7 mx-auto animate-spin text-amber-400" />
                <p className="text-sm text-slate-400 mt-2">AI is generating personalised follow-ups…</p>
              </div>
            )}

            {!followUpsLoading && followUps.length === 0 && (
              <Card className="border-amber-100 bg-white p-8 text-center text-slate-400">
                <ListChecks className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">Click Generate Follow-Ups to get AI-suggested actions for stale leads</p>
              </Card>
            )}

            {followUps.length > 0 && (
              <div className="space-y-3">
                {followUps.map((fu, i) => (
                  <Card key={i} className={`p-4 border ${
                    fu.priority === "High"   ? "border-rose-200 bg-rose-50/40" :
                    fu.priority === "Medium" ? "border-amber-200 bg-amber-50/40" :
                    "border-slate-200 bg-white"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{fu.lead_name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            fu.priority === "High"   ? "bg-rose-100 text-rose-600" :
                            fu.priority === "Medium" ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-500"
                          }`}>{fu.priority}</span>
                          <span className="text-[10px] text-slate-400">{fu.days_stale}d silent</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            {fu.action_type === "WhatsApp" ? "💬" : fu.action_type === "Call" ? "📞" : "📧"} {fu.action_type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 italic">"{fu.message}"</p>
                        <div className="text-xs text-slate-400 mt-1">
                          {fu.customer_type} · {fu.budget ? inr(fu.budget) : "—"} · {fu.status}
                        </div>
                      </div>
                      <Button size="sm" className="bg-amber-700 hover:bg-amber-800 shrink-0 h-8 text-xs"
                        onClick={() => createTaskFromFollowUp(fu)} disabled={creatingTask === fu.lead_id}>
                        {creatingTask === fu.lead_id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Create Task
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
