import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Cpu, Plus, Edit3, Trash2, CheckCircle2, XCircle, Play, Info, Activity, Clock, Layers,
} from "lucide-react";

export default function AutomationDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_workflows: 0,
    active_workflows: 0,
    total_runs: 0,
    failed_runs: 0,
    success_runs: 0,
    pending_runs: 0,
    success_rate: 0
  });
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      api.get("/automation/dashboard"),
      api.get("/automation/workflows")
    ]).then(([statsRes, workflowsRes]) => {
      setStats(statsRes.data);
      setWorkflows(workflowsRes.data);
    }).catch(e => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleToggle(id) {
    try {
      await api.post(`/automation/workflows/${id}/toggle`);
      toast.success("Workflow status updated");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this custom workflow?")) return;
    try {
      await api.delete(`/automation/workflows/${id}`);
      toast.success("Workflow deleted successfully");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div data-testid="automation-dashboard" className="space-y-6">
      {/* Title block */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-indigo-50 pb-4">
        <div>
          <h1 className="font-serif text-3xl">Automation Dashboard</h1>
          <p className="text-sm text-slate-600">Design trigger sequences to automate CRM tasks, emails, and WhatsApp campaigns.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/automation/templates">
            <Button variant="outline" className="border-indigo-100 text-indigo-700 hover:bg-indigo-50">
              <Layers className="h-4 w-4 mr-1.5" />
              Templates
            </Button>
          </Link>
          <Link to="/automation/builder">
            <Button className="bg-indigo-700 hover:bg-indigo-800 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Workflow
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-indigo-100">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Workflows</div>
          <div className="text-2xl font-semibold mt-1 text-indigo-900">{stats.active_workflows} / {stats.total_workflows}</div>
        </Card>
        <Card className="p-4 bg-white border-indigo-100">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Run Executions</div>
          <div className="text-2xl font-semibold mt-1 text-slate-800">{stats.total_runs} runs</div>
        </Card>
        <Card className="p-4 bg-white border-indigo-100">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Execution Success Rate</div>
          <div className="text-2xl font-semibold mt-1 text-emerald-600">{stats.success_rate}%</div>
        </Card>
        <Card className="p-4 bg-white border-rose-100 bg-rose-50/10">
          <div className="text-xs text-rose-600 font-semibold uppercase tracking-wider">Failed Executions</div>
          <div className="text-2xl font-semibold mt-1 text-rose-700">{stats.failed_runs} errors</div>
        </Card>
      </div>

      {/* Workflows table list */}
      <Card className="border-indigo-100 bg-white overflow-hidden">
        <div className="p-4 border-b border-indigo-50 font-semibold text-slate-800 text-sm">
          Active Automation Sequences
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50/60 text-slate-700">
              <tr>
                <th className="text-left px-5 py-3">Workflow Name</th>
                <th className="text-left px-5 py-3">Trigger Event</th>
                <th className="text-left px-5 py-3">Action Steps</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">Loading workflows…</td></tr>
              ) : workflows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-500">
                    <Cpu className="h-10 w-10 mx-auto text-indigo-200 mb-2" />
                    <div className="font-semibold text-slate-800 text-sm">No Automations Configured</div>
                    <div className="text-xs text-slate-400 mt-1">Create your first custom workflow or use a template to begin!</div>
                  </td>
                </tr>
              ) : (
                workflows.map(w => {
                  let stepsCount = 0;
                  try { stepsCount = JSON.parse(w.actions)?.length || 0; } catch {}

                  return (
                    <tr key={w.id} className="border-t border-indigo-50 hover:bg-indigo-50/20 transition-colors">
                      <td className="px-5 py-4 font-medium text-slate-900">{w.name}</td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded text-xs capitalize font-medium">
                          {w.trigger_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{stepsCount} step(s)</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={w.enabled} 
                            onCheckedChange={() => handleToggle(w.id)} 
                          />
                          <span className={`text-xs font-semibold ${w.enabled ? "text-emerald-700" : "text-slate-400"}`}>
                            {w.enabled ? "Active" : "Paused"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs border-indigo-100 text-indigo-700 hover:bg-indigo-50"
                            onClick={() => navigate(`/automation/builder/${w.id}`)}
                          >
                            <Edit3 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDelete(w.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
