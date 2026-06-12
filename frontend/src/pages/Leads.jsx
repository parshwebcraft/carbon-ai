import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { inr, dateShort, errMsg } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["New", "Contacted", "Follow Up", "Interested", "Visit Scheduled",
  "Quotation Sent", "Negotiation", "Won", "Lost"];
const SOURCES = ["Website", "WhatsApp", "Instagram", "Facebook", "Walk-In", "Referral", "Google Ads"];
const CUSTOMER_TYPES = ["Gold Buyer", "Diamond Buyer", "Bridal Enquiry", "Existing Customer", "High Value"];

export default function Leads() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 20 });
  const [filters, setFilters] = useState({ search: "", status: "", source: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  function load() {
    setLoading(true);
    const params = { page, page_size: 20 };
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.source) params.source = filters.source;
    api.get("/leads", { params })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, [page, filters.status, filters.source]);

  const totalPages = Math.max(1, Math.ceil(data.total / 20));

  return (
    <div data-testid="leads-page" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Leads</h1>
          <p className="text-sm text-slate-600">{data.total} leads in pipeline</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-lead-btn" className="bg-amber-700 hover:bg-amber-800">
              <Plus className="h-4 w-4 mr-1.5" /> New Lead
            </Button>
          </DialogTrigger>
          <NewLeadDialog onSaved={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>

      <Card className="p-4 border-amber-100 bg-white">
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              data-testid="leads-search"
              placeholder="Search name, phone, email or company"
              className="pl-9"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
            />
          </div>
          <Select
            value={filters.status || "all"}
            onValueChange={(v) => { setPage(1); setFilters({ ...filters, status: v === "all" ? "" : v }); }}
          >
            <SelectTrigger data-testid="leads-filter-status"><SelectValue placeholder="All status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={filters.source || "all"}
            onValueChange={(v) => { setPage(1); setFilters({ ...filters, source: v === "all" ? "" : v }); }}
          >
            <SelectTrigger data-testid="leads-filter-source"><SelectValue placeholder="All sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="border-amber-100 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="leads-table">
            <thead className="bg-amber-50/60 text-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">City</th>
                <th className="text-left px-4 py-3 font-semibold">Source</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-right px-4 py-3 font-semibold">Budget</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-6 text-center text-slate-500">Loading…</td></tr>
              ) : data.items.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-slate-500">No leads</td></tr>
              ) : data.items.map((l) => (
                <tr key={l.id} className="border-t border-amber-50 hover:bg-amber-50/30">
                  <td className="px-4 py-3">
                    <Link to={`/leads/${l.id}`} data-testid={`lead-row-${l.id}`} className="font-medium text-slate-900 hover:text-amber-800">
                      {l.name}
                    </Link>
                    <div className="text-xs text-slate-500">{l.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{l.city || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{l.source || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{l.customer_type || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{inr(l.budget)}</td>
                  <td className="px-4 py-3"><StatusBadge value={l.status} /></td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{dateShort(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 border-t border-amber-100 bg-amber-50/30 text-sm">
          <div>Page {data.page} of {totalPages}</div>
          <div className="flex gap-2">
            <Button data-testid="leads-prev" size="sm" variant="outline" disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
            <Button data-testid="leads-next" size="sm" variant="outline" disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function NewLeadDialog({ onSaved }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", city: "", company: "",
    source: "Website", status: "New", customer_type: "Gold Buyer",
    budget: 0, notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post("/leads", { ...form, budget: Number(form.budget) || 0 });
      toast.success("Lead created");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="font-serif">Add New Lead</DialogTitle>
      </DialogHeader>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Name *" testid="new-lead-name" value={form.name}
          onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Phone" testid="new-lead-phone" value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Email" testid="new-lead-email" value={form.email}
          onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="City" testid="new-lead-city" value={form.city}
          onChange={(v) => setForm({ ...form, city: v })} />
        <Field label="Company" testid="new-lead-company" value={form.company}
          onChange={(v) => setForm({ ...form, company: v })} />
        <Field label="Budget (₹)" type="number" testid="new-lead-budget" value={form.budget}
          onChange={(v) => setForm({ ...form, budget: v })} />
        <SelectField label="Source" testid="new-lead-source" value={form.source}
          options={SOURCES} onChange={(v) => setForm({ ...form, source: v })} />
        <SelectField label="Status" testid="new-lead-status" value={form.status}
          options={STATUSES} onChange={(v) => setForm({ ...form, status: v })} />
        <SelectField label="Customer Type" testid="new-lead-type" value={form.customer_type}
          options={CUSTOMER_TYPES} onChange={(v) => setForm({ ...form, customer_type: v })} />
      </div>
      <DialogFooter>
        <Button data-testid="new-lead-save" className="bg-amber-700 hover:bg-amber-800"
          disabled={saving || !form.name.trim()} onClick={save}>Save Lead</Button>
      </DialogFooter>
    </DialogContent>
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
function SelectField({ label, value, onChange, options, testid }) {
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid={testid} className="mt-1"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
