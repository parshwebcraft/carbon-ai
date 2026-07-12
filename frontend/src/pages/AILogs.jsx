import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { relative, errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/card"; // Wait, button import from card? Ah! Lucide Button should be from ui/button!
import { Button as UIButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { Bot, Edit3, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export default function AILogs() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  function load() {
    api.get("/ai-logs").then(r => {
      setItems(r.data);
      setSelectedIds([]);
    }).catch(e => toast.error(errMsg(e)));
  }
  useEffect(load, []);

  async function handleDelete(lid) {
    if (!window.confirm("Are you sure you want to delete this agent log?")) return;
    try {
      await api.delete(`/ai-logs/${lid}`);
      toast.success("Log deleted");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function handleDeleteSelected() {
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected agent logs?`)) return;
    try {
      await api.post("/ai-logs/delete-multiple", selectedIds);
      toast.success("Selected logs deleted");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL AI Agent logs from the database?")) return;
    try {
      await api.post("/ai-logs/delete-all");
      toast.success("All logs deleted");
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
      setSelectedIds(items.map(l => l.id));
    }
  }

  return (
    <div data-testid="ai-logs-page" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">AI Agent Activity</h1>
          <p className="text-sm text-slate-600">{items.length} conversations processed by the AI sales assistant</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && isAdmin && (
            <UIButton 
              variant="destructive"
              onClick={handleDeleteSelected}
              className="bg-rose-600 hover:bg-rose-700 h-9"
            >
              Delete Selected ({selectedIds.length})
            </UIButton>
          )}
          {items.length > 0 && isAdmin && (
            <UIButton 
              variant="outline" 
              onClick={handleDeleteAll}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 h-9"
            >
              Delete All
            </UIButton>
          )}
          {items.length > 0 && (
            <UIButton variant="outline" onClick={toggleSelectAll} className="h-9">
              {selectedIds.length === items.length ? "Deselect All" : "Select All"}
            </UIButton>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <UIButton className="bg-indigo-700 hover:bg-indigo-800 h-9"><Plus className="h-4 w-4 mr-1.5" />Add Log</UIButton>
            </DialogTrigger>
            <NewAILogDialog onSaved={() => { setOpen(false); load(); }} />
          </Dialog>
        </div>
      </div>

      <div className="space-y-3" data-testid="ai-logs-list">
        {items.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-indigo-200 bg-indigo-50/10">
            <Bot className="h-8 w-8 mx-auto text-indigo-300 mb-2" />
            <div className="text-sm text-slate-500 font-medium">No Agent Logs Found</div>
            <div className="text-xs text-slate-400 mt-1">Logs are automatically created during AI dialer campaigns.</div>
          </Card>
        ) : items.map(l => (
          <Card key={l.id} className="p-4 border-indigo-100 bg-white hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3 mb-1">
              <input 
                type="checkbox" 
                checked={selectedIds.includes(l.id)}
                onChange={() => toggleSelect(l.id)}
                className="rounded border-indigo-300 text-indigo-700 focus:ring-indigo-500 h-4 w-4"
              />
              <Bot className="h-4 w-4 text-indigo-700" />
              <Link to={`/leads/${l.lead_id}`} className="text-sm font-semibold text-indigo-800 hover:underline" data-testid={`ai-lead-link-${l.id}`}>Lead #{l.lead_id}</Link>
              <StatusBadge value={l.sentiment} />
              
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-slate-400 mr-2">{relative(l.created_at)}</span>
                <button 
                  onClick={() => { setEditingLog(l); setEditOpen(true); }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Edit Log"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(l.id)}
                    className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-700 pl-6">{l.conversation_summary}</p>
            <p className="text-xs mt-2 text-indigo-800 pl-6"><span className="font-semibold">Next action:</span> {l.next_action}</p>
          </Card>
        ))}
      </div>

      {editingLog && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <EditAILogDialog log={editingLog} onSaved={() => { setEditOpen(false); setEditingLog(null); load(); }} />
        </Dialog>
      )}
    </div>
  );
}

function NewAILogDialog({ onSaved }) {
  const [form, setForm] = useState({ lead_id: "", conversation_summary: "", next_action: "", sentiment: "Positive" });
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
    if (!form.lead_id || !form.conversation_summary.trim()) return;
    setSaving(true);
    try {
      await api.post("/ai-logs", {
        lead_id: Number(form.lead_id),
        conversation_summary: form.conversation_summary,
        next_action: form.next_action,
        sentiment: form.sentiment,
      });
      toast.success("Agent log created");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-serif">New Agent Log</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-slate-600">Lead *</Label>
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
          <Label className="text-xs text-slate-600">Conversation Summary *</Label>
          <Input value={form.conversation_summary} onChange={e => setForm({ ...form, conversation_summary: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Next Action Description</Label>
          <Input value={form.next_action} onChange={e => setForm({ ...form, next_action: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Customer Sentiment</Label>
          <Select value={form.sentiment} onValueChange={v => setForm({ ...form, sentiment: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Positive">Positive</SelectItem>
              <SelectItem value="Neutral">Neutral</SelectItem>
              <SelectItem value="Negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <UIButton className="bg-indigo-700 hover:bg-indigo-800" disabled={saving || !form.conversation_summary.trim()} onClick={save}>Save</UIButton>
      </DialogFooter>
    </DialogContent>
  );
}

function EditAILogDialog({ log, onSaved }) {
  const [form, setForm] = useState({
    lead_id: log.lead_id || "",
    conversation_summary: log.conversation_summary || "",
    next_action: log.next_action || "",
    sentiment: log.sentiment || "Positive",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      lead_id: log.lead_id || "",
      conversation_summary: log.conversation_summary || "",
      next_action: log.next_action || "",
      sentiment: log.sentiment || "Positive",
    });
  }, [log]);

  async function save() {
    if (!form.conversation_summary.trim()) return;
    setSaving(true);
    try {
      await api.put(`/ai-logs/${log.id}`, {
        lead_id: Number(form.lead_id),
        conversation_summary: form.conversation_summary,
        next_action: form.next_action,
        sentiment: form.sentiment,
      });
      toast.success("Agent log updated");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-serif">Edit Agent Log</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-slate-600">Conversation Summary *</Label>
          <Input value={form.conversation_summary} onChange={e => setForm({ ...form, conversation_summary: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Next Action Description</Label>
          <Input value={form.next_action} onChange={e => setForm({ ...form, next_action: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Customer Sentiment</Label>
          <Select value={form.sentiment} onValueChange={v => setForm({ ...form, sentiment: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Positive">Positive</SelectItem>
              <SelectItem value="Neutral">Neutral</SelectItem>
              <SelectItem value="Negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <UIButton className="bg-indigo-700 hover:bg-indigo-800" disabled={saving} onClick={save}>Save</UIButton>
      </DialogFooter>
    </DialogContent>
  );
}
