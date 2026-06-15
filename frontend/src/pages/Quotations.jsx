import { useEffect, useState } from "react";
import api from "@/lib/api";
import { inr, dateShort, errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2, Gem, X, CheckCircle2 } from "lucide-react";

const STATUSES = ["Draft", "Sent", "Accepted", "Rejected"];

export default function Quotations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiPanel, setAiPanel] = useState(null); // { lead_id, quotation_id }
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  function load() {
    setLoading(true);
    api.get("/quotations")
      .then(r => setItems(r.data))
      .catch(e => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function setStatus(q, s) {
    try { await api.put(`/quotations/${q.id}`, { status: s }); load(); }
    catch (e) { toast.error(errMsg(e)); }
  }

  async function openAiSuggest(q) {
    setAiPanel(q);
    setAiResult(null);
    setAiLoading(true);
    try {
      const res = await api.post(`/ai/quotation-suggest/${q.lead_id}`);
      setAiResult(res.data);
    } catch (e) {
      toast.error(errMsg(e));
      setAiPanel(null);
    } finally {
      setAiLoading(false);
    }
  }

  const total = items.reduce((s, q) => s + (q.amount || 0), 0);
  const accepted = items.filter(q => q.status === "Accepted").reduce((s, q) => s + (q.amount || 0), 0);

  return (
    <div data-testid="quotations-page" className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl">Quotations</h1>
        <p className="text-sm text-slate-600">
          {items.length} total · Pipeline {inr(total)} · Accepted {inr(accepted)}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 items-start">

        {/* ── Quotations Table ── */}
        <Card className="border-amber-100 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="quotations-table">
              <thead className="bg-amber-50/60 text-slate-700">
                <tr>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Lead</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-left px-4 py-3">AI</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-500">Loading…</td></tr>
                ) : items.map(q => (
                  <tr key={q.id} className={`border-t border-amber-50 transition-colors ${aiPanel?.id === q.id ? "bg-amber-50/40" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs">{q.quotation_number}</td>
                    <td className="px-4 py-3 text-slate-700">Lead #{q.lead_id}</td>
                    <td className="px-4 py-3 text-right font-medium">{inr(q.amount)}</td>
                    <td className="px-4 py-3">
                      <Select value={q.status} onValueChange={v => setStatus(q, v)}>
                        <SelectTrigger data-testid={`quote-status-${q.id}`} className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{dateShort(q.created_at)}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 gap-1"
                        onClick={() => openAiSuggest(q)}
                        data-testid={`ai-suggest-${q.id}`}
                      >
                        <Sparkles className="h-3 w-3" /> Suggest
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── AI Suggest Panel ── */}
        {aiPanel ? (
          <Card className="border-amber-200 bg-white sticky top-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-700 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">AI Product Suggestions</div>
                  <div className="text-xs text-slate-400">Quotation {aiPanel.quotation_number} · Lead #{aiPanel.lead_id}</div>
                </div>
              </div>
              <button onClick={() => { setAiPanel(null); setAiResult(null); }}
                className="text-slate-400 hover:text-slate-700 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {aiLoading && (
                <div className="py-12 text-center">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-500 mb-3" />
                  <p className="text-sm text-slate-500">AI is analysing lead profile…</p>
                </div>
              )}

              {!aiLoading && aiResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                    <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                      AI Recommendation
                    </div>
                    <p className="text-sm text-slate-700">{aiResult.summary}</p>
                  </div>

                  {/* Products */}
                  <div className="space-y-2">
                    {(aiResult.recommendations || []).map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-amber-100 hover:border-amber-300 bg-white transition-colors">
                        <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <Gem className="h-4 w-4 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{rec.product_name}</div>
                          <div className="text-xs font-semibold text-amber-700">{inr(rec.price)}</div>
                          <div className="text-xs text-slate-500 mt-0.5 leading-snug">{rec.reason}</div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${rec.product_name} — ${inr(rec.price)}`);
                            toast.success("Product details copied!");
                          }}
                          className="text-xs text-slate-400 hover:text-amber-700 shrink-0 mt-1"
                          title="Copy to clipboard"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="border-dashed border-amber-200 bg-amber-50/20 p-8 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-amber-300" />
            <p className="text-sm text-slate-500 font-medium">AI Product Suggestions</p>
            <p className="text-xs text-slate-400 mt-1">
              Click the ✨ Suggest button on any quotation to get AI-powered product recommendations tailored to that lead.
            </p>
          </Card>
        )}

      </div>
    </div>
  );
}
