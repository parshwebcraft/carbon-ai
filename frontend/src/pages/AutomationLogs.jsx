import { useEffect, useState } from "react";
import api from "@/lib/api";
import { errMsg, relative } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  History, ScrollText, CheckCircle2, XCircle, Clock, ArrowRight, CornerDownRight,
} from "lucide-react";

export default function AutomationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [open, setOpen] = useState(false);

  function load() {
    setLoading(true);
    api.get("/automation/logs")
      .then(r => setLogs(r.data))
      .catch(e => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div data-testid="automation-logs-page" className="space-y-6">
      <div className="flex items-center justify-between border-b border-indigo-50 pb-4">
        <div>
          <h1 className="font-serif text-3xl">Automation Logs</h1>
          <p className="text-sm text-slate-600">Audit trace execution runs and outcomes of your automation sequences.</p>
        </div>
        <Button variant="outline" className="border-indigo-100 text-indigo-700 hover:bg-indigo-50" onClick={load}>
          Refresh logs
        </Button>
      </div>

      <Card className="border-indigo-100 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50/60 text-slate-700">
              <tr>
                <th className="text-left px-5 py-3">Workflow Name</th>
                <th className="text-left px-5 py-3">Trigger Event</th>
                <th className="text-left px-5 py-3">Executed</th>
                <th className="text-left px-5 py-3">Outcome Status</th>
                <th className="text-left px-5 py-3">Trace Log</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading audit logs…</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-500">
                    <History className="h-10 w-10 mx-auto text-indigo-200 mb-2" />
                    <div className="font-semibold text-slate-800 text-sm">No Executions Yet</div>
                    <div className="text-xs text-slate-400 mt-1">Logs will appear here once your workflows are triggered by leads or tasks.</div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-t border-indigo-50 hover:bg-indigo-50/20 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-850">{log.workflow_name}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-500 capitalize">
                      {log.trigger_type.replace("_", " ")}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-500">{relative(log.executed_at)}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {log.status === "Success" && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Success
                        </span>
                      )}
                      {log.status === "Failed" && (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                          <XCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                      {log.status === "Pending" && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                          <Clock className="h-3 w-3" /> Executing
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs border-indigo-50 hover:bg-indigo-50 text-indigo-700 gap-1"
                        onClick={() => { setSelectedLog(log); setOpen(true); }}
                      >
                        <ScrollText className="h-3.5 w-3.5" />
                        Audits
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedLog && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle className="font-serif">Execution Trace Audit Log</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-indigo-50 pb-3">
                <div>
                  <span className="text-slate-400 font-semibold block uppercase">Workflow Name</span>
                  <span className="text-slate-800 font-semibold text-sm">{selectedLog.workflow_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase">Trigger Type</span>
                  <span className="text-slate-800 font-semibold text-sm capitalize">{selectedLog.trigger_type.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase">Timestamp</span>
                  <span className="text-slate-800 text-sm">{new Date(selectedLog.executed_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase">Status</span>
                  <span className={`text-sm font-bold ${selectedLog.status === "Success" ? "text-emerald-600" : "text-rose-600"}`}>{selectedLog.status}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-semibold block uppercase mb-2">Step Execution Trace</span>
                <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-y-auto max-h-[220px] space-y-2 whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner">
                  {selectedLog.logs ? (
                    selectedLog.logs.split("\n").map((line, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <CornerDownRight className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{line}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic">No logs captured during execution.</div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
