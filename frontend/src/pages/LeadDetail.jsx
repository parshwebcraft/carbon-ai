import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { inr, dateShort, dateTime, errMsg, relative } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StatusBadge from "@/components/StatusBadge";
import {
  ArrowLeft, Save, Bot, Phone, FileText, MessageCircle, Plus,
  Sparkles, PhoneCall,
} from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["New", "Contacted", "Follow Up", "Interested", "Visit Scheduled",
  "Quotation Sent", "Negotiation", "Won", "Lost"];

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [acts, setActs] = useState([]);
  const [calls, setCalls] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [newMsg, setNewMsg] = useState("");
  const [script, setScript] = useState("");
  const [scriptOpen, setScriptOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  function loadAll() {
    api.get(`/leads/${id}`).then(r => setLead(r.data));
    api.get(`/activities`, { params: { lead_id: id } }).then(r => setActs(r.data));
    api.get(`/calls`, { params: { lead_id: id } }).then(r => setCalls(r.data));
    api.get(`/whatsapp/${id}`).then(r => setMsgs(r.data));
    api.get(`/quotations`, { params: { lead_id: id } }).then(r => setQuotes(r.data));
    api.get(`/ai-logs`, { params: { lead_id: id } }).then(r => setAiLogs(r.data));
  }
  useEffect(loadAll, [id]);

  async function saveLead() {
    setSaving(true);
    try {
      const { id: _, created_at, updated_at, ...payload } = lead;
      const { data } = await api.put(`/leads/${id}`, payload);
      setLead(data); toast.success("Lead saved");
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  async function addNote() {
    if (!note.trim()) return;
    try {
      await api.post("/activities", { lead_id: Number(id), activity_type: "Note", description: note });
      setNote(""); toast.success("Note added");
      api.get(`/activities`, { params: { lead_id: id } }).then(r => setActs(r.data));
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function sendMsg() {
    if (!newMsg.trim()) return;
    try {
      await api.post("/whatsapp", { lead_id: Number(id), direction: "out", message: newMsg });
      setNewMsg("");
      api.get(`/whatsapp/${id}`).then(r => setMsgs(r.data));
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function sendExternal() {
    if (!newMsg.trim()) return;
    try {
      const { data } = await api.post(`/whatsapp/send-external/${id}`, { text: newMsg });
      setNewMsg("");
      api.get(`/whatsapp/${id}`).then(r => setMsgs(r.data));
      toast.success(data.delivered_via_cloud ? "Sent via WhatsApp Cloud API" : "Saved locally (Cloud not configured)");
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function aiDraftReply() {
    setAiBusy(true);
    try {
      const { data } = await api.post(`/ai/whatsapp-reply/${id}`);
      setNewMsg(data.reply);
      toast.success("AI draft ready — review & send");
    } catch (e) { toast.error(errMsg(e)); }
    finally { setAiBusy(false); }
  }

  async function createQuote() {
    const amount = Number(prompt("Quotation amount in ₹") || 0);
    if (!amount) return;
    try {
      await api.post("/quotations", { lead_id: Number(id), amount, status: "Draft" });
      toast.success("Quotation created");
      api.get(`/quotations`, { params: { lead_id: id } }).then(r => setQuotes(r.data));
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function logCall() {
    try {
      await api.post("/calls", {
        lead_id: Number(id),
        call_duration: Math.floor(Math.random() * 600 + 30),
        call_status: "Completed",
        call_summary: "Manual call log entry",
      });
      api.get(`/calls`, { params: { lead_id: id } }).then(r => setCalls(r.data));
      toast.success("Call logged");
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function generateScript() {
    setAiBusy(true);
    try {
      const { data } = await api.post(`/ai/call-script/${id}`);
      setScript(data.script);
      setScriptOpen(true);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setAiBusy(false); }
  }

  async function placeAiCall() {
    if (!lead.phone) { toast.error("Lead has no phone number"); return; }
    if (!window.confirm(`Place AI voice call to ${lead.name} (${lead.phone}) via Vapi?`)) return;
    setAiBusy(true);
    try {
      const { data } = await api.post(`/voice/place-call/${id}`);
      toast.success(`AI call started — Vapi id ${data.vapi_call_id || data.call_id}`);
      api.get(`/calls`, { params: { lead_id: id } }).then(r => setCalls(r.data));
    } catch (e) { toast.error(errMsg(e)); }
    finally { setAiBusy(false); }
  }

  async function aiInsightsForCall(callId) {
    setAiBusy(true);
    try {
      const { data } = await api.post(`/ai/call-insights/${callId}`);
      toast.success(`Sentiment: ${data.sentiment}`);
      api.get(`/ai-logs`, { params: { lead_id: id } }).then(r => setAiLogs(r.data));
      api.get(`/calls`, { params: { lead_id: id } }).then(r => setCalls(r.data));
    } catch (e) { toast.error(errMsg(e)); }
    finally { setAiBusy(false); }
  }

  if (!lead) return <div className="text-slate-500" data-testid="lead-loading">Loading…</div>;

  return (
    <div className="space-y-5" data-testid="lead-detail-page">
      <Link to="/leads" data-testid="back-to-leads" className="inline-flex items-center text-sm text-slate-600 hover:text-amber-800">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl text-slate-900">{lead.name}</h1>
            <StatusBadge value={lead.status} />
          </div>
          <p className="text-sm text-slate-600 mt-0.5">
            {lead.customer_type} • {lead.city} • {lead.source}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Budget</div>
          <div className="font-serif text-2xl text-amber-800">{inr(lead.budget)}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 border-amber-100 bg-white lg:col-span-2 space-y-3">
          <h2 className="font-serif text-lg">Lead Information</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Phone" value={lead.phone} onChange={v => setLead({ ...lead, phone: v })} testid="lead-phone" />
            <Field label="Email" value={lead.email} onChange={v => setLead({ ...lead, email: v })} testid="lead-email" />
            <Field label="City" value={lead.city} onChange={v => setLead({ ...lead, city: v })} testid="lead-city" />
            <Field label="Company" value={lead.company} onChange={v => setLead({ ...lead, company: v })} testid="lead-company" />
            <Field label="Budget (₹)" type="number" value={lead.budget}
              onChange={v => setLead({ ...lead, budget: Number(v) || 0 })} testid="lead-budget" />
            <div>
              <Label className="text-xs text-slate-600">Status</Label>
              <Select value={lead.status} onValueChange={v => setLead({ ...lead, status: v })}>
                <SelectTrigger data-testid="lead-status-select" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-600">Notes</Label>
              <Textarea data-testid="lead-notes" className="mt-1" rows={3} value={lead.notes || ""}
                onChange={(e) => setLead({ ...lead, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button data-testid="save-lead-btn" className="bg-amber-700 hover:bg-amber-800" disabled={saving} onClick={saveLead}>
              <Save className="h-4 w-4 mr-1.5" /> Save Changes
            </Button>
          </div>
        </Card>

        <Card className="p-5 border-amber-100 bg-white space-y-3">
          <h2 className="font-serif text-lg">Quick actions</h2>
          <Button data-testid="quick-log-call" variant="outline" className="w-full justify-start" onClick={logCall}>
            <Phone className="h-4 w-4 mr-2" /> Log a Call
          </Button>
          <Button data-testid="ai-call-script" variant="outline" className="w-full justify-start"
            disabled={aiBusy} onClick={generateScript}>
            <Sparkles className="h-4 w-4 mr-2 text-amber-700" /> AI Call Script
          </Button>
          <Button data-testid="ai-voice-call" className="w-full justify-start bg-amber-700 hover:bg-amber-800"
            disabled={aiBusy} onClick={placeAiCall}>
            <PhoneCall className="h-4 w-4 mr-2" /> Place AI Voice Call
          </Button>
          <Button data-testid="quick-quote" variant="outline" className="w-full justify-start" onClick={createQuote}>
            <FileText className="h-4 w-4 mr-2" /> Create Quotation
          </Button>
          <div className="pt-2">
            <Label className="text-xs text-slate-600">Add Activity Note</Label>
            <Textarea data-testid="lead-note-input" className="mt-1" rows={2}
              value={note} onChange={e => setNote(e.target.value)} />
            <Button data-testid="add-note-btn" className="mt-2 w-full bg-slate-900" onClick={addNote}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Note
            </Button>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="activities">
        <TabsList className="bg-amber-50">
          <TabsTrigger value="activities" data-testid="tab-activities">Activities</TabsTrigger>
          <TabsTrigger value="calls" data-testid="tab-calls">Calls ({calls.length})</TabsTrigger>
          <TabsTrigger value="whatsapp" data-testid="tab-whatsapp">WhatsApp ({msgs.length})</TabsTrigger>
          <TabsTrigger value="quotations" data-testid="tab-quotations">Quotations ({quotes.length})</TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">AI Agent ({aiLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card className="p-4 border-amber-100 bg-white">
            {acts.length === 0 ? <div className="text-sm text-slate-500 p-4">No activities yet.</div> :
              <ol className="relative border-l border-amber-200 ml-2">
                {acts.map(a => (
                  <li key={a.id} className="ml-4 py-3" data-testid={`activity-${a.id}`}>
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-amber-600" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-amber-700">{a.activity_type}</span>
                      <span className="text-xs text-slate-400">{relative(a.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-0.5">{a.description}</p>
                  </li>
                ))}
              </ol>}
          </Card>
        </TabsContent>

        <TabsContent value="calls">
          <Card className="border-amber-100 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-amber-50/60 text-slate-700">
                <tr>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Duration</th>
                  <th className="text-left px-4 py-2">Summary</th>
                  <th className="text-left px-4 py-2">When</th>
                  <th className="text-right px-4 py-2">AI</th>
                </tr>
              </thead>
              <tbody>
                {calls.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-slate-500">No calls.</td></tr> :
                  calls.map(c => (
                    <tr key={c.id} className="border-t border-amber-50">
                      <td className="px-4 py-2"><StatusBadge value={c.call_status} /></td>
                      <td className="px-4 py-2">{Math.round(c.call_duration / 60)}m {c.call_duration % 60}s</td>
                      <td className="px-4 py-2 text-slate-700">
                        {c.call_summary || "—"}
                        {c.sentiment && <span className="ml-2"><StatusBadge value={c.sentiment} /></span>}
                        {c.vapi_call_id && <div className="text-[10px] text-amber-700 mt-0.5">Vapi: {c.vapi_call_id}</div>}
                      </td>
                      <td className="px-4 py-2 text-slate-500">{dateTime(c.created_at)}</td>
                      <td className="px-4 py-2 text-right">
                        <Button data-testid={`ai-insights-${c.id}`} size="sm" variant="outline" disabled={aiBusy}
                          onClick={() => aiInsightsForCall(c.id)}>
                          <Sparkles className="h-3 w-3 mr-1 text-amber-700" /> AI
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card className="p-4 border-amber-100 bg-white">
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {msgs.length === 0 ? <div className="text-sm text-slate-500">No messages yet.</div> :
                msgs.map(m => (
                  <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 ${m.direction === "out" ? "bg-emerald-50 ml-auto" : "bg-amber-50"}`}>
                    <div className="text-sm text-slate-800 whitespace-pre-wrap">{m.message}</div>
                    <div className="text-[10px] text-slate-500 mt-1 text-right">{dateTime(m.created_at)}</div>
                  </div>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input data-testid="whatsapp-input" placeholder="Type a reply…" value={newMsg} onChange={e => setNewMsg(e.target.value)} className="flex-1 min-w-[200px]" />
              <Button data-testid="whatsapp-ai-draft" variant="outline" disabled={aiBusy} onClick={aiDraftReply}>
                <Sparkles className="h-4 w-4 mr-1.5 text-amber-700" /> AI Draft
              </Button>
              <Button data-testid="whatsapp-send" onClick={sendMsg} className="bg-emerald-600 hover:bg-emerald-700">
                <MessageCircle className="h-4 w-4 mr-1.5" /> Save
              </Button>
              <Button data-testid="whatsapp-send-cloud" variant="outline" onClick={sendExternal}>
                Send via Cloud
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="quotations">
          <Card className="border-amber-100 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-amber-50/60 text-slate-700">
                <tr><th className="text-left px-4 py-2">#</th><th className="text-right px-4 py-2">Amount</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Created</th></tr>
              </thead>
              <tbody>
                {quotes.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-slate-500">No quotations.</td></tr> :
                  quotes.map(q => (
                    <tr key={q.id} className="border-t border-amber-50">
                      <td className="px-4 py-2 font-mono text-xs">{q.quotation_number}</td>
                      <td className="px-4 py-2 text-right font-medium">{inr(q.amount)}</td>
                      <td className="px-4 py-2"><StatusBadge value={q.status} /></td>
                      <td className="px-4 py-2 text-slate-500">{dateShort(q.created_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="p-4 border-amber-100 bg-white space-y-3">
            {aiLogs.length === 0 ? <div className="text-sm text-slate-500">No AI agent activity for this lead.</div> :
              aiLogs.map(l => (
                <div key={l.id} className="rounded-lg border border-amber-100 bg-amber-50/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-4 w-4 text-amber-700" />
                    <StatusBadge value={l.sentiment} />
                    <span className="text-xs text-slate-500">{relative(l.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{l.conversation_summary}</p>
                  <p className="text-xs mt-1 text-amber-800"><span className="font-semibold">Next action:</span> {l.next_action}</p>
                </div>
              ))}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={scriptOpen} onOpenChange={setScriptOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-700" /> AI Call Script (DeepSeek)
            </DialogTitle>
          </DialogHeader>
          <pre data-testid="ai-script-output" className="whitespace-pre-wrap text-sm bg-amber-50/40 border border-amber-100 rounded-lg p-4 max-h-[55vh] overflow-y-auto font-sans">
{script}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(script); toast.success("Copied"); }}>Copy</Button>
            <Button className="bg-amber-700 hover:bg-amber-800" onClick={() => setScriptOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", testid }) {
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input data-testid={testid} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
