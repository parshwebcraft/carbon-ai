import { useEffect, useState } from "react";
import api from "@/lib/api";
import { inr, dateShort, errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STATUSES = ["Draft", "Sent", "Accepted", "Rejected"];

export default function Quotations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const total = items.reduce((s, q) => s + (q.amount || 0), 0);
  const accepted = items.filter(q => q.status === "Accepted").reduce((s, q) => s + (q.amount || 0), 0);

  return (
    <div data-testid="quotations-page" className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl">Quotations</h1>
        <p className="text-sm text-slate-600">{items.length} total • Pipeline {inr(total)} • Accepted {inr(accepted)}</p>
      </div>
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
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading…</td></tr> :
                items.map(q => (
                  <tr key={q.id} className="border-t border-amber-50">
                    <td className="px-4 py-3 font-mono text-xs">{q.quotation_number}</td>
                    <td className="px-4 py-3 text-slate-700">Lead #{q.lead_id}</td>
                    <td className="px-4 py-3 text-right font-medium">{inr(q.amount)}</td>
                    <td className="px-4 py-3">
                      <Select value={q.status} onValueChange={v => setStatus(q, v)}>
                        <SelectTrigger data-testid={`quote-status-${q.id}`} className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{dateShort(q.created_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
