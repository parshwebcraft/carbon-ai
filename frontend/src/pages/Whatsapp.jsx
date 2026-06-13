import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { dateTime, errMsg, relative, inr } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MessageCircle, Send, Sparkles, Loader2, Brain, Target,
  TrendingUp, AlertTriangle, ChevronRight, RefreshCw,
} from "lucide-react";

const SENTIMENT_STYLE = {
  Positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Neutral:  "bg-slate-50  text-slate-600   border-slate-200",
  Negative: "bg-rose-50   text-rose-600    border-rose-200",
};

export default function Whatsapp() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analysing, setAnalysing] = useState(false);

  function loadConvos() {
    api.get("/whatsapp/conversations")
      .then(r => {
        setConversations(r.data);
        if (!activeId && r.data.length) setActiveId(r.data[0].lead_id);
      })
      .catch(e => toast.error(errMsg(e)));
  }
  useEffect(loadConvos, []);

  useEffect(() => {
    if (!activeId) return;
    api.get(`/whatsapp/${activeId}`).then(r => setMsgs(r.data));
    setAiAnalysis(null);
  }, [activeId]);

  async function send() {
    if (!text.trim() || !activeId) return;
    try {
      await api.post("/whatsapp", { lead_id: activeId, direction: "out", message: text });
      setText("");
      const r = await api.get(`/whatsapp/${activeId}`); setMsgs(r.data);
      loadConvos();
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function sendCloud() {
    if (!text.trim() || !activeId) return;
    try {
      const { data } = await api.post(`/whatsapp/send-external/${activeId}`, { text });
      setText("");
      const r = await api.get(`/whatsapp/${activeId}`); setMsgs(r.data);
      loadConvos();
      toast.success(data.delivered_via_cloud ? "Sent via WhatsApp Cloud API" : "Saved locally (Cloud not configured)");
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function aiDraft() {
    if (!activeId) return;
    setAiBusy(true);
    try {
      const { data } = await api.post(`/ai/whatsapp-reply/${activeId}`);
      setText(data.reply);
      toast.success("AI draft ready");
    } catch (e) { toast.error(errMsg(e)); }
    finally { setAiBusy(false); }
  }

  async function analyseConversation() {
    if (!activeId) return;
    setAnalysing(true);
    try {
      const { data } = await api.post(`/ai/whatsapp-analyse/${activeId}`);
      setAiAnalysis(data);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setAnalysing(false); }
  }

  const active = conversations.find(c => c.lead_id === activeId);

  return (
    <div data-testid="whatsapp-page" className="space-y-4">
      <div>
        <h1 className="font-serif text-3xl">WhatsApp</h1>
        <p className="text-sm text-slate-600">{conversations.length} active conversations (mocked)</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr_300px] gap-4 h-[72vh]">
        {/* Conversations list */}
        <Card className="border-amber-100 bg-white overflow-hidden">
          <div className="overflow-y-auto h-full" data-testid="whatsapp-conversations">
            {conversations.length === 0
              ? <div className="p-5 text-center text-slate-500">No conversations.</div>
              : conversations.map(c => (
                <button
                  key={c.lead_id}
                  data-testid={`convo-${c.lead_id}`}
                  className={`w-full text-left px-4 py-3 border-b border-amber-50 hover:bg-amber-50/30 ${activeId === c.lead_id ? "bg-amber-50" : ""}`}
                  onClick={() => setActiveId(c.lead_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900 truncate">{c.lead_name}</div>
                    <div className="text-[10px] text-slate-400">{relative(c.last_at)}</div>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{c.lead_phone}</div>
                  <div className="text-sm text-slate-600 truncate mt-0.5">
                    {c.last_direction === "out" ? "↗ " : "↙ "}{c.last_message}
                  </div>
                </button>
              ))}
          </div>
        </Card>

        {/* Message thread */}
        <Card className="border-amber-100 bg-white overflow-hidden flex flex-col">
          {!active ? (
            <div className="flex-1 grid place-items-center text-slate-500">
              <div className="text-center">
                <MessageCircle className="h-8 w-8 mx-auto opacity-50" />
                <p className="mt-2 text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{active.lead_name}</div>
                  <Link to={`/leads/${active.lead_id}`} className="text-xs text-amber-700 hover:underline"
                    data-testid="open-lead-from-whatsapp">View lead →</Link>
                </div>
                <Button size="sm" variant="outline"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-1.5"
                  onClick={analyseConversation}
                  disabled={analysing || msgs.length === 0}
                  data-testid="whatsapp-analyse-btn"
                >
                  {analysing
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Brain className="h-3.5 w-3.5" />}
                  {analysing ? "Analysing…" : "AI Analysis"}
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#FBF8F3]">
                {msgs.map(m => (
                  <div key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.direction === "out" ? "bg-emerald-50 ml-auto" : "bg-white border border-amber-100"}`}>
                    <div className="text-sm text-slate-800 whitespace-pre-wrap">{m.message}</div>
                    <div className="text-[10px] text-slate-500 mt-1 text-right">{dateTime(m.created_at)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-amber-100 p-3 flex flex-wrap gap-2">
                <Input data-testid="whatsapp-page-input" placeholder="Type a message…" value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && send()}
                  className="flex-1 min-w-[140px]" />
                <Button data-testid="whatsapp-page-ai" variant="outline" disabled={aiBusy} onClick={aiDraft}>
                  <Sparkles className="h-4 w-4 mr-1.5 text-amber-700" /> AI
                </Button>
                <Button data-testid="whatsapp-page-send" className="bg-emerald-600 hover:bg-emerald-700" onClick={send}>
                  <Send className="h-4 w-4" />
                </Button>
                <Button data-testid="whatsapp-page-send-cloud" variant="outline" onClick={sendCloud}>
                  Cloud
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* AI Copilot Analysis Panel */}
        <Card className="border-amber-100 bg-white overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100 bg-amber-50/40">
            <Brain className="h-4 w-4 text-amber-700" />
            <h2 className="font-semibold text-slate-800 text-sm">AI Conversation Analysis</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!active && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                <Brain className="h-8 w-8 mb-2 text-slate-200" />
                <p className="text-sm">Select a conversation</p>
              </div>
            )}

            {active && !aiAnalysis && !analysing && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center gap-3">
                <Sparkles className="h-8 w-8 text-slate-200" />
                <p className="text-sm">Click AI Analysis to get insights on this conversation</p>
                <Button size="sm" className="bg-amber-700 hover:bg-amber-800 mt-1"
                  onClick={analyseConversation} disabled={msgs.length === 0}>
                  <Brain className="h-3.5 w-3.5 mr-1.5" /> Analyse Now
                </Button>
              </div>
            )}

            {analysing && (
              <div className="h-full flex flex-col items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-amber-400 mb-2" />
                <p className="text-sm text-slate-400">AI is analysing…</p>
              </div>
            )}

            {aiAnalysis && !analysing && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                  <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">Summary</p>
                  <p className="text-sm text-slate-700">{aiAnalysis.summary}</p>
                </div>

                {/* Key metrics */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-sky-500" /> Intent
                    </span>
                    <span className="text-xs font-semibold text-slate-700">{aiAnalysis.intent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Sentiment
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SENTIMENT_STYLE[aiAnalysis.sentiment] || SENTIMENT_STYLE.Neutral}`}>
                      {aiAnalysis.sentiment}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        <ChevronRight className="h-3.5 w-3.5 text-violet-500" /> Conversion
                      </span>
                      <span className={`text-xs font-bold ${
                        aiAnalysis.conversion_probability >= 70 ? "text-emerald-600" :
                        aiAnalysis.conversion_probability >= 40 ? "text-amber-600" : "text-rose-500"
                      }`}>{aiAnalysis.conversion_probability}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          aiAnalysis.conversion_probability >= 70 ? "bg-emerald-500" :
                          aiAnalysis.conversion_probability >= 40 ? "bg-amber-500" : "bg-rose-400"
                        }`}
                        style={{ width: `${aiAnalysis.conversion_probability}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Objections */}
                {aiAnalysis.objections && (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <p className="text-xs text-rose-600 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Objections
                    </p>
                    <p className="text-xs text-slate-700">{aiAnalysis.objections || "None detected"}</p>
                  </div>
                )}

                {/* Next action */}
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                  <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide mb-1">Suggested Next Step</p>
                  <p className="text-sm text-slate-700 font-medium">{aiAnalysis.next_action}</p>
                </div>

                <Button size="sm" variant="ghost" className="w-full text-xs text-amber-700 hover:bg-amber-50"
                  onClick={analyseConversation}>
                  <RefreshCw className="h-3 w-3 mr-1.5" /> Re-Analyse
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
