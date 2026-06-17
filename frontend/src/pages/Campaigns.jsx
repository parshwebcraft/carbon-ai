import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, Play, Pause, RotateCcw, Trash2, Settings, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { errMsg, dateShort } from "@/lib/format";

const STATUSES = ["New", "Contacted", "Follow Up", "Interested", "Visit Scheduled",
  "Quotation Sent", "Negotiation", "Won", "Lost"];
const SOURCES = ["Website", "WhatsApp", "Instagram", "Facebook", "Walk-In", "Referral", "Google Ads"];

const statusStyle = (s) => ({
  draft: "bg-slate-100 text-slate-700",
  running: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-rose-100 text-rose-800",
}[s] || "bg-slate-100 text-slate-700");

export default function Campaigns() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [provider, setProvider] = useState("mock");

  function load() {
    setLoading(true);
    api.get("/campaigns").then(r => setItems(r.data.items))
      .catch(e => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
    api.get("/settings/calling/provider").then(r => setProvider(r.data.provider)).catch(() => {});
  }
  useEffect(load, []);
  useEffect(() => {
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div data-testid="campaigns-page" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-amber-700" /> AI Calling Campaigns
          </h1>
          <div className="text-sm text-slate-600">
            Bulk outbound AI dialer — provider:&nbsp;
            <Badge variant="outline" data-testid="campaigns-provider-badge"
                   className={provider === "vapi" ? "border-emerald-300 text-emerald-800" : "border-amber-300 text-amber-800"}>
              {provider === "vapi" ? "Vapi.ai (live)" : "MOCK"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button data-testid="campaigns-settings-btn" variant="outline">
                <Settings className="h-4 w-4 mr-1.5" /> Calling Settings
              </Button>
            </DialogTrigger>
            <CallingSettingsDialog onClose={() => setSettingsOpen(false)} />
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="campaigns-new-btn" className="bg-amber-700 hover:bg-amber-800">
                <Plus className="h-4 w-4 mr-1.5" /> New Campaign
              </Button>
            </DialogTrigger>
            <NewCampaignDialog onSaved={() => { setOpen(false); load(); }} />
          </Dialog>
        </div>
      </div>

      <Card className="border-amber-100 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="campaigns-table">
            <thead className="bg-amber-50/60 text-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Campaign</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Targets</th>
                <th className="text-right px-4 py-3 font-semibold">Connected</th>
                <th className="text-right px-4 py-3 font-semibold">Interested</th>
                <th className="text-right px-4 py-3 font-semibold">Appts</th>
                <th className="text-right px-4 py-3 font-semibold">Quotes</th>
                <th className="text-right px-4 py-3 font-semibold">Conv%</th>
                <th className="text-left px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-6 text-center text-slate-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-slate-500">
                  No campaigns yet. Click <b>New Campaign</b> to start your first bulk AI dialer.
                </td></tr>
              ) : items.map((c) => (
                <tr key={c.id} className="border-t border-amber-50 hover:bg-amber-50/30">
                  <td className="px-4 py-3">
                    <Link to={`/campaigns/${c.id}`} data-testid={`campaign-row-${c.id}`}
                          className="font-medium text-slate-900 hover:text-amber-800">
                      {c.name}
                    </Link>
                    <div className="text-xs text-slate-500">{c.description || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{c.stats?.total_targets ?? 0}</td>
                  <td className="px-4 py-3 text-right text-emerald-800">{c.stats?.connected ?? 0}</td>
                  <td className="px-4 py-3 text-right">{c.stats?.interested_leads ?? 0}</td>
                  <td className="px-4 py-3 text-right">{c.stats?.appointment_bookings ?? 0}</td>
                  <td className="px-4 py-3 text-right">{c.stats?.quotations_requested ?? 0}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {((c.stats?.conversion_rate ?? 0) * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{dateShort(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CallingSettingsDialog({ onClose }) {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get("/settings/calling").then(r => setS(r.data)).catch(e => toast.error(errMsg(e)));
  }, []);
  async function save() {
    setSaving(true);
    try {
      await api.put("/settings/calling", s);
      toast.success("Calling settings updated");
      onClose();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }
  if (!s) return <DialogContent><div className="p-4">Loading…</div></DialogContent>;
  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-serif">Calling Settings</DialogTitle>
        <DialogDescription>Default pacing for all campaigns (per-campaign overrides allowed).</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Daily Call Limit" testid="settings-daily-limit"
          value={s.daily_call_limit}
          onChange={(v) => setS({ ...s, daily_call_limit: Number(v) || 0 })} />
        <NumberField label="Calls / Minute" testid="settings-cpm"
          value={s.calls_per_minute}
          onChange={(v) => setS({ ...s, calls_per_minute: Number(v) || 0 })} />
        <TimeField label="Start Time (IST)" testid="settings-start"
          value={s.start_time}
          onChange={(v) => setS({ ...s, start_time: v })} />
        <TimeField label="End Time (IST)" testid="settings-end"
          value={s.end_time}
          onChange={(v) => setS({ ...s, end_time: v })} />

        <div className="col-span-2 border-t pt-3 mt-1 font-serif text-sm font-semibold text-amber-900">
          Vapi.ai Integration
        </div>
        <div className="col-span-2">
          <TextField label="Vapi API Key" testid="settings-vapi-key" type="password"
            value={s.vapi_api_key}
            onChange={(v) => setS({ ...s, vapi_api_key: v })} />
        </div>
        <div className="col-span-2">
          <TextField label="Vapi Phone Number ID" testid="settings-vapi-phone"
            value={s.vapi_phone_number_id}
            onChange={(v) => setS({ ...s, vapi_phone_number_id: v })} />
        </div>
        <div className="col-span-2">
          <TextField label="Vapi Assistant ID (Optional)" testid="settings-vapi-assistant"
            value={s.vapi_assistant_id}
            onChange={(v) => setS({ ...s, vapi_assistant_id: v })} />
        </div>
      </div>
      <DialogFooter>
        <Button data-testid="settings-save"
          className="bg-amber-700 hover:bg-amber-800"
          disabled={saving} onClick={save}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---------------------------------------------------------------------------

function NewCampaignDialog({ onSaved }) {
  const [form, setForm] = useState({
    name: "", description: "", campaign_prompt: "",
    source_type: "leads",
    filters: { status: [], source: [], assigned_to: [], city: [] },
    csv_text: "",
    daily_call_limit: "", start_time: "", end_time: "", calls_per_minute: "",
  });
  const [preview, setPreview] = useState(null);
  const [users, setUsers] = useState([]);
  const [cities, setCities] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/users").then(r => setUsers(r.data)).catch(() => {});
    api.get("/leads", { params: { page: 1, page_size: 200 } })
      .then(r => {
        const c = new Set();
        r.data.items.forEach(l => l.city && c.add(l.city));
        setCities([...c].sort());
      }).catch(() => {});
  }, []);

  function toggleArr(key, val) {
    const arr = form.filters[key] || [];
    const next = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
    setForm({ ...form, filters: { ...form.filters, [key]: next } });
  }

  async function doPreview() {
    try {
      const r = await api.post("/campaigns/preview", form.filters);
      setPreview(r.data);
    } catch (e) { toast.error(errMsg(e)); }
  }

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const cells = line.split(",").map(c => c.trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = cells[i]; });
      return row;
    }).filter(r => r.phone);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const body = {
      name: form.name,
      description: form.description || null,
      campaign_prompt: form.campaign_prompt || null,
      source_type: form.source_type,
      filters: form.source_type !== "csv" ? form.filters : null,
      csv_targets: form.source_type !== "leads" && form.csv_text
        ? parseCsv(form.csv_text)
        : null,
    };
    ["daily_call_limit", "calls_per_minute"].forEach(k => {
      if (form[k]) body[k] = Number(form[k]);
    });
    ["start_time", "end_time"].forEach(k => {
      if (form[k]) body[k] = form[k];
    });
    setSaving(true);
    try {
      await api.post("/campaigns", body);
      toast.success("Campaign created");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-serif">New AI Calling Campaign</DialogTitle>
        <DialogDescription>
          Bulk-dial leads with an AI agent. Use filters from CRM, upload a CSV, or both.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Campaign Name *" testid="new-campaign-name"
            value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <SelectField label="Source"
            value={form.source_type} onChange={(v) => setForm({ ...form, source_type: v })}
            testid="new-campaign-source-type"
            options={[
              { v: "leads", label: "From CRM Leads (filtered)" },
              { v: "csv", label: "From CSV upload" },
              { v: "mixed", label: "Both (filter + CSV)" },
            ]} />
        </div>

        <div>
          <Label className="text-xs text-slate-600">Description</Label>
          <Input value={form.description}
                 data-testid="new-campaign-description"
                 onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" />
        </div>

        <div>
          <Label className="text-xs text-slate-600">Campaign Script (static prompt for AI agent)</Label>
          <Textarea data-testid="new-campaign-prompt" value={form.campaign_prompt}
            placeholder="e.g. You are calling on behalf of Facets Lifestyle for our Diwali bridal collection..."
            onChange={e => setForm({ ...form, campaign_prompt: e.target.value })}
            className="mt-1 min-h-[88px]" />
          <p className="text-xs text-slate-500 mt-1">
            Each lead&apos;s <code>lead_prompt_override</code> (set on CSV or per-target) takes precedence.
          </p>
        </div>

        {form.source_type !== "csv" && (
          <Card className="p-4 border-amber-100">
            <div className="font-semibold text-sm mb-2">Lead Filters</div>
            <FilterChips label="Status" options={STATUSES}
              selected={form.filters.status}
              onToggle={(v) => toggleArr("status", v)} />
            <FilterChips label="Source" options={SOURCES}
              selected={form.filters.source}
              onToggle={(v) => toggleArr("source", v)} />
            <FilterChips label="City" options={cities.slice(0, 30)}
              selected={form.filters.city}
              onToggle={(v) => toggleArr("city", v)} />
            <FilterChips label="Assigned To"
              options={users.map(u => ({ value: u.id, label: u.name }))}
              selected={form.filters.assigned_to}
              onToggle={(v) => toggleArr("assigned_to", v)} valueKey="value" labelKey="label" />
            <div className="flex items-center gap-2 mt-2">
              <Button data-testid="new-campaign-preview" type="button" size="sm" variant="outline"
                onClick={doPreview}>Preview matched leads</Button>
              {preview && (
                <div className="text-sm text-emerald-800" data-testid="new-campaign-preview-count">
                  <b>{preview.total}</b> leads matched
                </div>
              )}
            </div>
            {preview && preview.sample.length > 0 && (
              <div className="text-xs text-slate-600 mt-1">
                Sample: {preview.sample.slice(0, 5).map(s => s.name).join(", ")}…
              </div>
            )}
          </Card>
        )}

        {form.source_type !== "leads" && (
          <Card className="p-4 border-amber-100">
            <div className="font-semibold text-sm mb-2">CSV Targets</div>
            <Textarea data-testid="new-campaign-csv"
              placeholder="name,phone,city,notes,source&#10;Aanya Rao,+919812345678,Mumbai,Bridal inquiry,Walk-In"
              value={form.csv_text}
              onChange={e => setForm({ ...form, csv_text: e.target.value })}
              className="font-mono text-xs min-h-[120px]" />
            <p className="text-xs text-slate-500 mt-1">
              First row must be headers. Phone column is required. CSV upload after creation
              is also supported from the campaign detail page.
            </p>
          </Card>
        )}

        <Card className="p-4 border-amber-100">
          <div className="font-semibold text-sm mb-2">Pacing Overrides (optional)</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <TextField label="Daily limit" testid="new-campaign-daily-limit"
              value={form.daily_call_limit}
              onChange={(v) => setForm({ ...form, daily_call_limit: v })} />
            <TextField label="Calls / min" testid="new-campaign-cpm"
              value={form.calls_per_minute}
              onChange={(v) => setForm({ ...form, calls_per_minute: v })} />
            <TextField label="Start (HH:MM)" testid="new-campaign-start"
              value={form.start_time}
              onChange={(v) => setForm({ ...form, start_time: v })} />
            <TextField label="End (HH:MM)" testid="new-campaign-end"
              value={form.end_time}
              onChange={(v) => setForm({ ...form, end_time: v })} />
          </div>
        </Card>
      </div>

      <DialogFooter>
        <Button data-testid="new-campaign-save" onClick={save} disabled={saving}
          className="bg-amber-700 hover:bg-amber-800">
          {saving ? "Saving…" : "Create Campaign"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---------------------------------------------------------------------------

function FilterChips({ label, options, selected, onToggle, valueKey, labelKey }) {
  return (
    <div className="mt-2">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.length === 0 && <span className="text-xs text-slate-400">None available</span>}
        {options.map((o, i) => {
          const v = valueKey ? o[valueKey] : o;
          const l = labelKey ? o[labelKey] : o;
          const active = selected.includes(v);
          return (
            <button key={i}
              type="button"
              data-testid={`filter-${label.toLowerCase().replace(/\s/g, "-")}-${v}`}
              onClick={() => onToggle(v)}
              className={`px-2.5 py-1 rounded-full text-xs border transition ${
                active
                  ? "bg-amber-700 border-amber-700 text-white"
                  : "bg-white border-slate-200 text-slate-700 hover:border-amber-400"
              }`}>
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, testid, type = "text" }) {
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input data-testid={testid} type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
function NumberField({ label, value, onChange, testid }) {
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input data-testid={testid} type="number" value={value ?? ""}
             onChange={e => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
function TimeField({ label, value, onChange, testid }) {
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input data-testid={testid} type="time" value={value ?? ""}
             onChange={e => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
function SelectField({ label, value, onChange, options, testid }) {
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid={testid} className="mt-1"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
