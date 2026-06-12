import { useEffect, useState } from "react";
import api from "@/lib/api";
import { dateTime, errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "sonner";

export default function Calls() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/calls")
      .then(r => setItems(r.data))
      .catch(e => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  const totalDur = items.reduce((s, c) => s + (c.call_duration || 0), 0);

  return (
    <div data-testid="calls-page" className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl">Call Logs</h1>
        <p className="text-sm text-slate-600">{items.length} calls • {(totalDur / 60).toFixed(0)} minutes total</p>
      </div>
      <Card className="border-amber-100 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="calls-table">
            <thead className="bg-amber-50/60 text-slate-700">
              <tr>
                <th className="text-left px-4 py-3">Lead ID</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Summary</th>
                <th className="text-left px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading…</td></tr> :
                items.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">No calls.</td></tr> :
                  items.map(c => (
                    <tr key={c.id} className="border-t border-amber-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">#{c.lead_id}</td>
                      <td className="px-4 py-3"><StatusBadge value={c.call_status} /></td>
                      <td className="px-4 py-3">{Math.round(c.call_duration / 60)}m {c.call_duration % 60}s</td>
                      <td className="px-4 py-3 text-slate-700 max-w-md truncate">{c.call_summary}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{dateTime(c.created_at)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
