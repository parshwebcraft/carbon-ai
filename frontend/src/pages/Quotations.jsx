import { useEffect, useState } from "react";
import api from "@/lib/api";
import { inr, dateShort, errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2, Gem, X, CheckCircle2, Plus, Edit3, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

const STATUSES = ["Draft", "Sent", "Accepted", "Rejected"];

export default function Quotations() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiPanel, setAiPanel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  function load() {
    setLoading(true);
    api.get("/quotations")
      .then(r => {
        setItems(r.data);
        setSelectedIds([]);
      })
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

  async function handleDelete(qid) {
    if (!window.confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await api.delete(`/quotations/${qid}`);
      toast.success("Quotation deleted");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function handleDeleteSelected() {
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected quotations?`)) return;
    try {
      await api.post("/quotations/delete-multiple", selectedIds);
      toast.success("Selected quotations deleted");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL quotations from the database?")) return;
    try {
      await api.post("/quotations/delete-all");
      toast.success("All quotations deleted");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(q => q.id));
    }
  }

  const total = items.reduce((s, q) => s + (q.amount || 0), 0);
  const accepted = items.filter(q => q.status === "Accepted").reduce((s, q) => s + (q.amount || 0), 0);

  return (
    <div data-testid="quotations-page" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Quotations</h1>
          <p className="text-sm text-slate-600">
            {items.length} total · Pipeline {inr(total)} · Accepted {inr(accepted)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && isAdmin && (
            <Button 
              variant="destructive"
              onClick={handleDeleteSelected}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete Selected ({selectedIds.length})
            </Button>
          )}
          {items.length > 0 && isAdmin && (
            <Button 
              variant="outline" 
              onClick={handleDeleteAll}
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              Delete All
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-700 hover:bg-indigo-800"><Plus className="h-4 w-4 mr-1.5" />New Quotation</Button>
            </DialogTrigger>
            <NewQuotationDialog onSaved={() => { setOpen(false); load(); }} />
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 items-start">
        {/* ── Quotations Table ── */}
        <Card className="border-indigo-100 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="quotations-table">
              <thead className="bg-indigo-50/60 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input 
                      type="checkbox"
                      checked={selectedIds.length === items.length && items.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-indigo-300 text-indigo-700 h-4 w-4"
                    />
                  </th>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Lead</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-6 text-center text-slate-500">Loading…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-slate-500 font-medium">No quotations created yet.</td></tr>
                ) : items.map(q => (
                  <tr key={q.id} className={`border-t border-indigo-50 transition-colors ${aiPanel?.id === q.id ? "bg-indigo-50/40" : ""}`}>
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(q.id)}
                        onChange={() => toggleSelect(q.id)}
                        className="rounded border-indigo-300 text-indigo-700 h-4 w-4"
                      />
                    </td>
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1"
                          onClick={() => openAiSuggest(q)}
                          data-testid={`ai-suggest-${q.id}`}
                        >
                          <Sparkles className="h-3 w-3" /> Suggest
                        </Button>
                        <button 
                          onClick={() => { setEditingQuote(q); setEditOpen(true); }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit Details"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(q.id)}
                            className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── AI Suggest Panel ── */}
        {aiPanel ? (
          <Card className="border-indigo-200 bg-white sticky top-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-700 flex items-center justify-center">
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
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-indigo-500 mb-3" />
                  <p className="text-sm text-slate-500">AI is analysing lead profile…</p>
                </div>
              )}

              {!aiLoading && aiResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                    <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">
                      AI Recommendation
                    </div>
                    <p className="text-sm text-slate-700">{aiResult.summary}</p>
                  </div>

                  {/* Products */}
                  <div className="space-y-2">
                    {(aiResult.recommendations || []).map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-indigo-100 hover:border-indigo-300 bg-white transition-colors">
                        <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <Gem className="h-4 w-4 text-indigo-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{rec.product_name}</div>
                          <div className="text-xs font-semibold text-indigo-700">{inr(rec.price)}</div>
                          <div className="text-xs text-slate-500 mt-0.5 leading-snug">{rec.reason}</div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${rec.product_name} — ${inr(rec.price)}`);
                            toast.success("Product details copied!");
                          }}
                          className="text-xs text-slate-400 hover:text-indigo-700 shrink-0 mt-1"
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
          <Card className="border-dashed border-indigo-200 bg-indigo-50/20 p-8 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-3 text-indigo-300" />
            <p className="text-sm text-slate-500 font-medium">AI Product Suggestions</p>
            <p className="text-xs text-slate-400 mt-1">
              Click the ✨ Suggest button on any quotation to get AI-powered product recommendations tailored to that lead.
            </p>
          </Card>
        )}
      </div>

      {editingQuote && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <EditQuotationDialog quotation={editingQuote} onSaved={() => { setEditOpen(false); setEditingQuote(null); load(); }} />
        </Dialog>
      )}
    </div>
  );
}

function NewQuotationDialog({ onSaved }) {
  const [form, setForm] = useState({ lead_id: "", amount: 15000, status: "Draft" });
  const [leads, setLeads] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/leads?page=1&page_size=200")
      .then(res => {
        const items = res.data.items || [];
        setLeads(items);
        if (items.length > 0) setForm(prev => ({ ...prev, lead_id: String(items[0].id) }));
      });
  }, []);

  async function save() {
    if (!form.lead_id) return;
    setSaving(true);
    try {
      await api.post("/quotations", {
        lead_id: Number(form.lead_id),
        amount: Number(form.amount) || 0,
        status: form.status,
      });
      toast.success("Quotation created");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-serif">New Quotation</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-slate-600">Assign to Lead *</Label>
          <Select value={form.lead_id} onValueChange={v => setForm({ ...form, lead_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger>
            <SelectContent>
              {leads.map(l => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name} ({l.city || "Unknown"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-600">Quotation Amount (₹) *</Label>
          <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Status</Label>
          <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button className="bg-indigo-700 hover:bg-indigo-800" disabled={saving || !form.lead_id} onClick={save}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditQuotationDialog({ quotation, onSaved }) {
  const [form, setForm] = useState({
    amount: quotation.amount || 0,
    status: quotation.status || "Draft",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      amount: quotation.amount || 0,
      status: quotation.status || "Draft",
    });
  }, [quotation]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/quotations/${quotation.id}`, {
        amount: Number(form.amount) || 0,
        status: form.status,
      });
      toast.success("Quotation updated");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-serif">Edit Quotation</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-slate-600">Quotation Number</Label>
          <Input disabled value={quotation.quotation_number} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Amount (₹) *</Label>
          <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Status</Label>
          <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button className="bg-indigo-700 hover:bg-indigo-800" disabled={saving} onClick={save}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
