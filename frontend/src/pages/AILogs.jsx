import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { relative, errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { Bot } from "lucide-react";
import { toast } from "sonner";

export default function AILogs() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/ai-logs").then(r => setItems(r.data)).catch(e => toast.error(errMsg(e)));
  }, []);

  return (
    <div data-testid="ai-logs-page" className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl">AI Agent Activity</h1>
        <p className="text-sm text-slate-600">{items.length} conversations processed by the AI sales assistant</p>
      </div>
      <div className="space-y-3" data-testid="ai-logs-list">
        {items.map(l => (
          <Card key={l.id} className="p-4 border-amber-100 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-4 w-4 text-amber-700" />
              <Link to={`/leads/${l.lead_id}`} className="text-sm font-semibold text-amber-800 hover:underline" data-testid={`ai-lead-link-${l.id}`}>Lead #{l.lead_id}</Link>
              <StatusBadge value={l.sentiment} />
              <span className="text-xs text-slate-400 ml-auto">{relative(l.created_at)}</span>
            </div>
            <p className="text-sm text-slate-700">{l.conversation_summary}</p>
            <p className="text-xs mt-2 text-amber-800"><span className="font-semibold">Next action:</span> {l.next_action}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
