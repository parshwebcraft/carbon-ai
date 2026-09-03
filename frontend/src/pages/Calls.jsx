import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { dateTime, errMsg, inr } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "sonner";
import {
  Phone, TrendingUp, Sparkles, Loader2, ChevronDown, ChevronUp,
  Clock, FileText, RefreshCw, Volume2,
} from "lucide-react";

const SENTIMENT_COLOR = {
  Positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Neutral:  "bg-slate-50  text-slate-500   border-slate-200",
  Negative: "bg-rose-50   text-rose-600    border-rose-200",
};

function ScoreBadge({ score }) {
  if (score == null) return null;
  const color = score >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
              : score >= 50 ? "text-indigo-600 bg-indigo-50 border-indigo-200"
              : "text-rose-500 bg-rose-50 border-rose-200";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      <TrendingUp className="h-2.5 w-2.5" /> {score}
    </span>
  );
}

export default function Calls() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [analysing, setAnalysing] = useState(null);
  const [insights, setInsights] = useState({}); // call_id -> insight data
  const [selectedIds, setSelectedIds] = useState(new Set());

  function load() {
    setLoading(true);
    api.get("/calls")
      .then(r => {
        setItems(r.data);
        setSelectedIds(new Set());
      })
      .catch(e => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }

  async function syncOmni() {
    setSyncing(true);
    try {
      const res = await api.post("/calls/sync-omnidim");
      toast.success(res.data.message || "OmniDimension calls synced!");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSyncing(false);
    }
  }

  useEffect(load, []);

  const totalDur = items.reduce((s, c) => s + (c.call_duration || 0), 0);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === items.length) {
        return new Set();
      } else {
        return new Set(items.map((item) => item.id));
      }
    });
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected call(s)?`)) return;
    try {
      await api.post("/calls/delete-multiple", Array.from(selectedIds));
      toast.success("Selected calls deleted successfully.");
      setSelectedIds(new Set());
      load();
    } catch (e) {
      toast.error(errMsg(e, "Failed to delete selected calls"));
    }
  };

  const deleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete ALL call logs in the database? This cannot be undone.")) return;
    try {
      await api.post("/calls/delete-all");
      toast.success("All call logs deleted successfully.");
      setSelectedIds(new Set());
      load();
    } catch (e) {
      toast.error(errMsg(e, "Failed to delete all calls"));
    }
  };

  async function analyseCall(callId) {
    setAnalysing(callId);
    try {
      const { data } = await api.post(`/ai/call-insights/${callId}`);
      setInsights(prev => ({ ...prev, [callId]: data }));
      toast.success("AI analysis complete");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setAnalysing(null);
    }
  }

  return (
    <div data-testid="calls-page" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Call Logs</h1>
          <p className="text-sm text-slate-600">
            {items.length} calls · {(totalDur / 60).toFixed(0)} minutes total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <label className="flex items-center text-xs text-slate-600 cursor-pointer mr-2 border border-slate-200 px-2 py-1.5 rounded bg-white hover:bg-slate-50">
              <input
                type="checkbox"
                checked={items.length > 0 && selectedIds.size === items.length}
                onChange={toggleSelectAll}
                className="mr-1.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              Select All
            </label>
          )}
          <Button 
            variant="outline" 
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5" 
            onClick={syncOmni}
            disabled={syncing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Omni Calls"}
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="destructive" className="bg-rose-600 hover:bg-rose-700 text-white" onClick={deleteSelected}>
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700" onClick={deleteAll}>
            Delete All
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading && (
          <Card className="border-indigo-100 p-8 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Loading calls…
          </Card>
        )}

        {!loading && items.length === 0 && (
          <Card className="border-indigo-100 p-10 text-center text-slate-400">
            <Phone className="h-10 w-10 mx-auto mb-3 text-slate-200" />
            <p className="text-sm">No calls yet.</p>
          </Card>
        )}

        {items.map(c => {
          const isExpanded = expanded === c.id;
          const insight = insights[c.id];

          return (
            <Card key={c.id} className="border-indigo-100 bg-white overflow-hidden">
              {/* Main row */}
              <div className="flex items-start gap-4 p-4">
                {/* Left: checkbox + icon */}
                <div className="flex items-center gap-2 self-center shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                    <Phone className="h-4.5 w-4.5 text-indigo-700" />
                  </div>
                </div>

                {/* Center: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {/* Lead name */}
                    <Link to={`/leads/${c.lead_id}`}
                      className="font-semibold text-slate-800 hover:text-indigo-700 transition-colors text-sm">
                      {c.lead_name}
                    </Link>
                    <StatusBadge value={c.call_status} />
                    {c.sentiment && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SENTIMENT_COLOR[c.sentiment] || SENTIMENT_COLOR.Neutral}`}>
                        {c.sentiment}
                      </span>
                    )}
                    <ScoreBadge score={c.lead_score} />
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2">{c.call_summary}</p>

                  {c.recording_url && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <audio 
                        controls 
                        preload="none"
                        className="h-7 w-full max-w-sm rounded-lg"
                        src={c.recording_url.startsWith("http") ? c.recording_url : `${api.defaults.baseURL.replace(/\/api\/?$/, "")}${c.recording_url}`}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor(c.call_duration / 60)}m {c.call_duration % 60}s
                    </span>
                    <span>{dateTime(c.created_at)}</span>
                    {c.vapi_call_id && (
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        ID: {c.vapi_call_id}
                      </span>
                    )}
                  </div>

                  {/* AI insight (if fetched) */}
                  {insight && (
                    <div className="mt-3 rounded-xl bg-indigo-50 border border-indigo-100 p-3 space-y-1">
                      <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">AI Analysis</p>
                      <p className="text-xs text-slate-700">{insight.summary}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">Next action:</span> {insight.next_action}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: action buttons */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" variant="outline"
                    className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1"
                    onClick={() => analyseCall(c.id)}
                    disabled={analysing === c.id}
                    data-testid={`ai-analyse-call-${c.id}`}
                  >
                    {analysing === c.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Sparkles className="h-3 w-3" />}
                    AI
                  </Button>

                  {c.transcript && (
                    <Button size="sm" variant="ghost"
                      className="h-8 text-xs text-slate-500 hover:bg-slate-50 gap-1"
                      onClick={() => setExpanded(isExpanded ? null : c.id)}
                      data-testid={`toggle-transcript-${c.id}`}
                    >
                      <FileText className="h-3 w-3" />
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Expandable transcript */}
              {isExpanded && c.transcript && (
                <div className="border-t border-indigo-50 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Transcript</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                    {c.transcript}
                  </pre>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
