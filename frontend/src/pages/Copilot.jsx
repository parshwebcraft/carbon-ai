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
  AlertTriangle, CheckCircle2, Phone, MessageCircle, Zap,
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
  next_question:      { icon: MessageSquare, label: "Next Question",          accent: "border-sky-200 bg-sky-50",     iconClass: "text-sky-600" },
  product_suggestion: { icon: Package,       label: "Product Recommendation", accent: "border-amber-200 bg-amber-50", iconClass: "text-amber-700" },
  offer_suggestion:   { icon: Tag,           label: "Offer Suggestion",       accent: "border-violet-200 bg-violet-50", iconClass: "text-violet-600" },
  objection_handling: { icon: ShieldAlert,   label: "Objection Handling",     accent: "border-rose-200 bg-rose-50",   iconClass: "text-rose-600" },
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
  const [activeTab, setActiveTab] = useState("suggestions"); // suggestions | products | history

  // Pipeline Intelligence state
  const [pageTab, setPageTab] = useState("session"); // session | pipeline
  const [pipeline, setPipeline] = useState([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [batchScoring, setBatchScoring] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [creatingTask, setCreatingTask] = useState(null); // lead_id being converted

  const wsRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Load leads on mount ──────────────────────────────────────────────────
  useEffect(() => {
    api.get("/leads", { params: { page: 1, page_size: 100 } })
      .then((r) => setLeads(r.data.items || []))
      .catch(() => {});
  }, []);

  // ── Pipeline data loaders ────────────────────────────────────────────────
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
      toast.success("Task created in Tasks!");
      setFollowUps((prev) => prev.filter((f) => f.lead_id !== fu.lead_id));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setCreatingTask(null);
    }
  }

  // ── Scroll transcript to bottom ──────────────────────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Cleanup WS on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  // ── WebSocket connection ─────────────────────────────────────────────────
  const connectWs = useCallback((sessionId) => {
    if (wsRef.current) wsRef.current.close();

    const wsBase = API_BASE.replace(/^http/, "ws");
    const token = localStorage.getItem("facets_token");
    const url = `${wsBase}/copilot/ws/${sessionId}?token=${token}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      // Send ping every 25s to keep alive
      ws._pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 25000);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "suggestions" && msg.data) {
          const ai = msg.data;
          // Build suggestion map from flat AI response
          const newSuggestions = {};
          ["next_question", "product_suggestion", "offer_suggestion",
           "objection_handling", "closing_suggestion"].forEach((k) => {
            if (ai[k]) newSuggestions[k] = { content: ai[k], confidence: 0.85 };
          });
          setSuggestions(newSuggestions);
          // Update insight fields
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

  // ── Start session ────────────────────────────────────────────────────────
  async function startSession() {
    if (!selectedLead) {
      toast.error("Please select a lead first");
      return;
    }
    setSessionLoading(true);
    try {
      const res = await api.post("/copilot/sessions", { lead_id: selectedLead.id });
      const sess = res.data;
      setSession(sess);
      setMessages([]);
      setSuggestions({});
      setInsight(null);
      connectWs(sess.id);

      // Load existing insight if any
      try {
        const insRes = await api.get(`/copilot/leads/${selectedLead.id}/insight`);
        setInsight(insRes.data);
      } catch (_) {}

      // Load product recommendations
      loadProducts();

      toast.success("AI Copilot session started");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSessionLoading(false);
    }
  }

  // ── End session ──────────────────────────────────────────────────────────
  async function endSession() {
    if (!session) return;
    try {
      await api.patch(`/copilot/sessions/${session.id}/end`);
      setSession((s) => ({ ...s, status: "ended" }));
      wsRef.current?.close();
      toast.success("Session ended");
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────
  async function sendMessage() {
    const content = msgInput.trim();
    if (!content || !session) return;
    if (session.status === "ended") {
      toast.error("Session has ended");
      return;
    }

    const optimistic = { id: Date.now(), session_id: session.id, speaker, content, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setMsgInput("");
    setAiLoading(true);
    inputRef.current?.focus();

    try {
      await api.post(`/copilot/sessions/${session.id}/messages`, { speaker, content });
      // WS will deliver the AI suggestions; fallback to polling if WS not connected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setTimeout(() => pollSuggestions(), 3000);
      }
    } catch (e) {
      toast.error(errMsg(e));
      setAiLoading(false);
    }
  }

  // ── Poll suggestions (WS fallback) ───────────────────────────────────────
  async function pollSuggestions() {
    if (!session) return;
    try {
      const res = await api.get(`/copilot/sessions/${session.id}/suggestions`);
      const map = {};
      (res.data || []).forEach((s) => {
        map[s.suggestion_type] = { content: s.content, confidence: s.confidence };
      });
      setSuggestions(map);
    } catch (_) {}
    setAiLoading(false);
  }

  // ── Trigger manual AI refresh ────────────────────────────────────────────
  async function triggerAnalysis() {
    if (!session) return;
    setAiLoading(true);
    try {
      const res = await api.post(`/copilot/sessions/${session.id}/analyse`);
      const ai = res.data;
      const newSuggestions = {};
      ["next_question", "product_suggestion", "offer_suggestion",
       "objection_handling", "closing_suggestion"].forEach((k) => {
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
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setAiLoading(false);
    }
  }

  // ── Load product recommendations ──────────────────────────────────────────
  async function loadProducts() {
    if (!selectedLead) return;
    try {
      const res = await api.get(`/copilot/leads/${selectedLead.id}/product-recommendations`);
      setProducts(res.data || []);
    } catch (_) {}
  }

  // ── Load history summary ──────────────────────────────────────────────────
  async function loadHistorySummary() {
    if (!selectedLead) return;
    setHistoryLoading(true);
    try {
      const res = await api.get(`/copilot/leads/${selectedLead.id}/history-summary`);
      setHistorySummary(res.data.summary || "");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setHistoryLoading(false);
    }
  }

  // ── Key press handler ─────────────────────────────────────────────────────
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const hasSuggestions = Object.keys(suggestions).length > 0;

  return (
    <div className="space-y-4" data-testid="copilot-page">
      {/* ── Page header + tab switcher ────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-slate-900 flex items-center gap-2">
            <Bot className="h-7 w-7 text-amber-700" />
            AI Sales Copilot
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time AI assistance during customer conversations
          </p>
        </div>

        {/* Lead selector + session controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={selectedLead?.id?.toString() || ""}
            onValueChange={(v) => {
              const lead = leads.find((l) => l.id === parseInt(v));
              setSelectedLead(lead || null);
              setSession(null);
              setMessages([]);
              setSuggestions({});
              setInsight(null);
              setHistorySummary("");
              wsRef.current?.close();
            }}
          >
            <SelectTrigger className="w-52 border-amber-200 bg-white" data-testid="lead-select">
              <SelectValue placeholder="Select a lead…" />
            </SelectTrigger>
            <SelectContent>
              {leads.map((l) => (
                <SelectItem key={l.id} value={l.id.toString()}>
                  {l.name} — {l.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!session || session.status === "ended" ? (
            <Button
              onClick={startSession}
              disabled={!selectedLead || sessionLoading}
              className="bg-amber-700 hover:bg-amber-800 gap-1.5"
              data-testid="start-session-btn"
            >
              {sessionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Session
            </Button>
          ) : (
            <Button
              onClick={endSession}
              variant="outline"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5"
              data-testid="end-session-btn"
            >
              <Square className="h-4 w-4" /> End Session
            </Button>
          )}
        </div>
      </div>

      {/* Session status badge */}
      {session && (
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full w-fit ${
          session.status === "active"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-slate-100 text-slate-500 border border-slate-200"
        }`}>
          <span className={`h-2 w-2 rounded-full ${session.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
          Session #{session.id} — {session.status === "active" ? "Live" : "Ended"}
        </div>
      )}

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

          {/* ── LEFT: Transcript Panel ───────────────────────────────── */}
          <Card className="border-amber-100 bg-white flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-amber-100">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-amber-700" />
                Conversation Transcript
              </h2>
              <span className="text-xs text-slate-400">{messages.length} messages</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-10">
                  <MessageSquare className="h-8 w-8 mb-3 text-slate-200" />
                  <p className="text-sm">Type the conversation below.</p>
                  <p className="text-xs mt-1">AI suggestions appear instantly after each message.</p>
                </div>
              )}
              {messages.map((m) => (
                <TranscriptBubble
                  key={m.id}
                  speaker={m.speaker}
                  content={m.content}
                  createdAt={m.created_at}
                />
              ))}
              {aiLoading && (
                <div className="flex items-center gap-2 text-xs text-amber-600 pl-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  AI is analysing…
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Input area */}
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
                <Input
                  ref={inputRef}
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type message and press Enter…"
                  className="flex-1 h-9 text-sm border-amber-200 focus:border-amber-400"
                  disabled={session.status === "ended"}
                  data-testid="message-input"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!msgInput.trim() || session.status === "ended"}
                  className="h-9 w-9 p-0 bg-amber-700 hover:bg-amber-800 shrink-0"
                  data-testid="send-message-btn"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-slate-400">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </Card>

          {/* ── CENTER: AI Suggestions ───────────────────────────────── */}
          <Card className="border-amber-100 bg-white flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
            {/* Tabs */}
            <div className="flex border-b border-amber-100">
              {[
                { id: "suggestions", icon: Sparkles, label: "AI Suggestions" },
                { id: "products",    icon: Package,  label: "Products" },
                { id: "history",     icon: History,  label: "History" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "history" && !historySummary) loadHistorySummary();
                    if (tab.id === "products" && products.length === 0) loadProducts();
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? "text-amber-700 border-b-2 border-amber-700 bg-amber-50/50"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Suggestions tab */}
              {activeTab === "suggestions" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {hasSuggestions ? "AI suggestions based on transcript" : "Send a message to generate suggestions"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-amber-700 hover:bg-amber-50"
                      onClick={triggerAnalysis}
                      disabled={aiLoading || messages.length === 0}
                      data-testid="refresh-suggestions-btn"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${aiLoading ? "animate-spin" : ""}`} />
                      Refresh
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
                    return (
                      <SuggestionCard
                        key={type}
                        type={type}
                        content={s.content}
                        confidence={s.confidence}
                      />
                    );
                  })}
                </div>
              )}

              {/* Products tab */}
              {activeTab === "products" && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 mb-3">AI-matched products for this lead</div>
                  {products.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Package className="h-8 w-8 mx-auto mb-3 text-slate-200" />
                      <p className="text-sm">No products matched yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 border-amber-200 text-amber-700"
                        onClick={loadProducts}
                      >
                        Load Recommendations
                      </Button>
                    </div>
                  ) : (
                    products.map((p, i) => <ProductCard key={i} product={p} />)
                  )}
                </div>
              )}

              {/* History tab */}
              {activeTab === "history" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">AI summary of past interactions</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-amber-700 hover:bg-amber-50"
                      onClick={loadHistorySummary}
                      disabled={historyLoading}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${historyLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                  {historyLoading ? (
                    <div className="py-10 text-center">
                      <Loader2 className="h-7 w-7 mx-auto animate-spin text-amber-400" />
                    </div>
                  ) : historySummary ? (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="h-4 w-4 text-amber-700" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">AI Summary</span>
                      </div>
                      <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                        {historySummary}
                      </div>
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
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Name</span>
                          <span className="font-medium">{selectedLead.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Status</span>
                          <span className="font-medium">{selectedLead.status}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Budget</span>
                          <span className="font-medium">{selectedLead.budget ? inr(selectedLead.budget) : "Unknown"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Interest</span>
                          <span className="font-medium">{selectedLead.customer_type || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">City</span>
                          <span className="font-medium">{selectedLead.city || "Unknown"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* ── RIGHT: Lead Qualification Panel ─────────────────────── */}
          <Card className="border-amber-100 bg-white" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
            <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-100">
              <Target className="h-4 w-4 text-amber-700" />
              <h2 className="font-semibold text-slate-800 text-sm">Lead Qualification</h2>
            </div>

            <div className="p-4 overflow-y-auto h-[calc(100%-52px)]">
              {/* Lead Score */}
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
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${insight ? scoreBarColor(insight.lead_score) : "bg-slate-200"}`}
                    style={{ width: insight ? `${insight.lead_score}%` : "0%" }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  {insight
                    ? insight.lead_score >= 75 ? "Hot lead — prioritise closing"
                    : insight.lead_score >= 50 ? "Warm lead — nurture further"
                    : "Cold lead — build interest"
                    : "Start conversation to score lead"}
                </p>
              </div>

              {/* Qualification fields */}
              <div className="space-y-0 divide-y divide-amber-50">
                <QualificationRow icon={Lightbulb}  label="Intent"          value={insight?.intent}          highlight="bg-sky-50" />
                <QualificationRow icon={Wallet}      label="Budget"          value={insight?.budget}          highlight="bg-emerald-50" />
                <QualificationRow icon={Clock}       label="Purchase Timeline" value={insight?.timeline}     highlight="bg-violet-50" />
                <QualificationRow icon={User}        label="Decision Maker"  value={insight?.decision_maker}  highlight="bg-amber-50" />
              </div>

              {/* Qualification Progress */}
              <div className="mt-5">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  BANT Qualification
                </div>
                {[
                  { label: "Budget",    filled: !!(insight?.budget && insight.budget !== "Unknown"), },
                  { label: "Authority", filled: !!(insight?.decision_maker && insight.decision_maker !== "Unknown"), },
                  { label: "Need",      filled: !!(insight?.intent && insight.intent !== "Unknown"), },
                  { label: "Timeline",  filled: !!(insight?.timeline && insight.timeline !== "Unknown"), },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 mb-2">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                      item.filled ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-300"
                    }`}>
                      {item.filled ? <ChevronRight className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full bg-slate-300" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-slate-600 font-medium">{item.label}</span>
                        <span className={item.filled ? "text-emerald-600" : "text-slate-400"}>
                          {item.filled ? "Qualified" : "Pending"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${item.filled ? "bg-emerald-400 w-full" : "w-0"}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty state */}
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
    </div>
  );
}
