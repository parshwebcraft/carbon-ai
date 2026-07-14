import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { inr } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import {
  Users, TrendingUp, Trophy, Phone, CheckCircle2, CalendarDays,
  Sparkles, RefreshCw, Loader2, Flame, AlertTriangle, Target,
  ChevronRight, Bot, Cpu,
} from "lucide-react";

const STATUS_COLORS = ["#4F46E5", "#0EA5E9", "#6366F1", "#8B5CF6", "#0D9488",
  "#F97316", "#D946EF", "#059669", "#E11D48"];

function ScorePill({ score }) {
  if (score == null) return null;
  const cls = score >= 75 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : score >= 50 ? "bg-indigo-100 text-indigo-700 border-indigo-200"
    : "bg-rose-100 text-rose-600 border-rose-200";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cls}`}>
      {score}%
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [autoStats, setAutoStats] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((r) => setStats(r.data))
      .catch((e) => setErr(e.message));
    api.get("/automation/dashboard")
      .then((r) => setAutoStats(r.data))
      .catch(() => {});
    api.get("/automation/logs")
      .then((r) => setRecentRuns(r.data.slice(0, 5)))
      .catch(() => {});
  }, []);

  async function loadBriefing() {
    setBriefingLoading(true);
    try {
      const r = await api.get("/dashboard/ai-summary");
      setBriefing(r.data.briefing);
    } catch (_) {
      setBriefing("AI briefing unavailable — check your DeepSeek API key.");
    } finally {
      setBriefingLoading(false);
    }
  }

  if (err) return <div data-testid="dashboard-error" className="text-rose-700">{err}</div>;
  if (!stats) return <div data-testid="dashboard-loading" className="text-slate-500">Loading…</div>;

  const statusData = Object.entries(stats.lead_status_distribution).map(([name, value]) => ({ name, value }));
  const sourceData = Object.entries(stats.lead_source_distribution).map(([name, value]) => ({ name, value }));

  const tiles = [
    { label: "Total Leads",    value: stats.total_leads,           icon: Users,        accent: "text-indigo-700 bg-indigo-50" },
    { label: "Pipeline Value", value: inr(stats.pipeline_value),   icon: TrendingUp,   accent: "text-emerald-700 bg-emerald-50" },
    { label: "Won Revenue",    value: inr(stats.won_value),        icon: Trophy,       accent: "text-yellow-700 bg-yellow-50" },
    { label: "Open Tasks",     value: stats.open_tasks,            icon: CheckCircle2, accent: "text-sky-700 bg-sky-50" },
    { label: "Calls Logged",   value: stats.total_calls,           icon: Phone,        accent: "text-violet-700 bg-violet-50" },
    { label: "Appointments",   value: stats.total_appointments,    icon: CalendarDays, accent: "text-rose-700 bg-rose-50" },
  ];

  const hotLeads = stats.hot_leads || [];
  const convForecast = stats.conversion_forecast || 0;
  const revenueAtRisk = stats.revenue_at_risk || 0;

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">Pipeline health for ParshWebCraft</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Bot className="h-4 w-4 text-indigo-700" />
          <span className="text-indigo-700 font-medium">AI Intelligence Active</span>
        </div>
      </div>

      {/* ── AI Morning Briefing ─────────────────────────────────────────── */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-indigo-50/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-1">
                AI Morning Briefing
              </div>
              {briefingLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                  Generating your briefing…
                </div>
              ) : briefing ? (
                <p className="text-sm text-slate-700 leading-relaxed">{briefing}</p>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  Click "Generate" to get your AI-powered morning briefing.
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 shrink-0"
            onClick={loadBriefing}
            disabled={briefingLoading}
            data-testid="ai-briefing-btn"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${briefingLoading ? "animate-spin" : ""}`} />
            {briefing ? "Refresh" : "Generate"}
          </Button>
        </div>
      </Card>

      {/* ── KPI Tiles ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {tiles.map((t) => (
          <Card key={t.label} data-testid={`stat-${t.label.toLowerCase().replace(/\s+/g, "-")}`}
            className="p-4 border-indigo-100 bg-white">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${t.accent}`}>
              <t.icon className="h-4 w-4" />
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight">{t.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{t.label}</div>
          </Card>
        ))}
      </div>

      {/* ── AI Intelligence Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Hot Leads */}
        <Card className="border-indigo-100 bg-white p-5 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-4 w-4 text-rose-500" />
            <h2 className="font-semibold text-slate-800 text-sm">Hot Leads</h2>
            <span className="text-xs text-slate-400 ml-auto">AI score ≥ 75</span>
          </div>
          {hotLeads.length === 0 ? (
            <div className="py-6 text-center text-slate-400">
              <Flame className="h-7 w-7 mx-auto mb-2 text-slate-200" />
              <p className="text-xs">Run "Batch Score All" in Copilot → Pipeline to see hot leads</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hotLeads.map((lead) => (
                <div key={lead.lead_id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-indigo-50 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                  <div className="h-7 w-7 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                    <Flame className="h-3.5 w-3.5 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{lead.name}</div>
                    <div className="text-xs text-slate-400 truncate">{lead.intent || lead.status}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <ScorePill score={lead.lead_score} />
                    {lead.budget > 0 && (
                      <span className="text-[10px] text-slate-400">{inr(lead.budget)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Conversion Forecast + Revenue at Risk */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Conversion Forecast */}
          <Card className="border-indigo-100 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-emerald-600" />
              <h2 className="font-semibold text-slate-800 text-sm">Conversion Forecast</h2>
            </div>
            <div className="text-4xl font-bold text-emerald-600 mb-1">{convForecast}%</div>
            <p className="text-xs text-slate-500 mb-4">
              of scored leads likely to close this month (AI score ≥ 60)
            </p>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                style={{ width: `${Math.min(convForecast, 100)}%` }}
              />
            </div>
          </Card>

          {/* Revenue at Risk */}
          <Card className="border-indigo-100 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-indigo-600" />
              <h2 className="font-semibold text-slate-800 text-sm">Revenue at Risk</h2>
            </div>
            <div className="text-3xl font-bold text-indigo-700 mb-1">{inr(revenueAtRisk)}</div>
            <p className="text-xs text-slate-500 mb-4">
              High-value pipeline (≥ ₹50k) with no activity in 14+ days
            </p>
            <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              revenueAtRisk > 500000
                ? "bg-rose-50 text-rose-600 border border-rose-200"
                : revenueAtRisk > 0
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}>
              {revenueAtRisk > 500000 ? "⚠️ High risk — act now" :
               revenueAtRisk > 0 ? "Moderate risk" : "✅ No risk detected"}
            </div>
          </Card>

          {/* Task Completion */}
          <Card className="border-indigo-100 bg-white p-5 sm:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-sky-600" />
                <h2 className="font-semibold text-slate-800 text-sm">Task Completion Rate</h2>
              </div>
              <span className="text-lg font-bold text-sky-700">{stats.task_completion_rate}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-sky-400 transition-all duration-700"
                style={{ width: `${Math.min(stats.task_completion_rate, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>{stats.completed_tasks} completed</span>
              <span>{stats.open_tasks} open</span>
            </div>
          </Card>

          {/* Automation Pulse Widget */}
          <Card className="border-indigo-100 bg-white p-5 sm:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-700" />
                <h2 className="font-semibold text-slate-800 text-sm">Automation Pulse</h2>
              </div>
              <Link to="/automation" className="text-xs text-indigo-700 font-semibold hover:underline">
                Manage
              </Link>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-50">
                <div className="text-[9px] text-slate-500 font-semibold uppercase">Runs Today</div>
                <div className="text-base font-bold text-indigo-700">{autoStats?.total_runs || 0}</div>
              </div>
              <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-50">
                <div className="text-[9px] text-slate-500 font-semibold uppercase">Success Rate</div>
                <div className="text-base font-bold text-emerald-600">{autoStats?.success_rate || 100}%</div>
              </div>
              <div className="bg-rose-50/50 p-2 rounded-lg border border-rose-50">
                <div className="text-[9px] text-slate-500 font-semibold uppercase">Failed Runs</div>
                <div className="text-base font-bold text-rose-600">{autoStats?.failed_runs || 0}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Recent Executions</div>
              {recentRuns.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-2 text-center">No recent runs.</div>
              ) : (
                recentRuns.map(run => (
                  <div key={run.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="font-medium truncate max-w-[180px]">{run.workflow_name}</span>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      run.status === "Success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-750"
                    }`}>
                      {run.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-5 border-indigo-100 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif text-lg">Lead Status Distribution</h2>
          </div>
          <div className="h-64" style={{ minHeight: 240 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={92} innerRadius={50}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-indigo-100 bg-white">
          <h2 className="font-serif text-lg mb-2">Leads by Source</h2>
          <div className="h-64" style={{ minHeight: 240 }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={240}>
              <BarChart data={sourceData}>
                <CartesianGrid stroke="#EEF2F6" vertical={false} />
                <XAxis dataKey="name" stroke="#78716C" fontSize={11} angle={-15} dy={10} height={50} />
                <YAxis stroke="#78716C" fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Status Summary ──────────────────────────────────────────────── */}
      <Card className="p-5 border-indigo-100 bg-white">
        <h2 className="font-serif text-lg mb-3">Quick status summary</h2>
        <div className="flex flex-wrap gap-2">
          {statusData.map((s) => (
            <div key={s.name} className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] border border-indigo-100 px-3 py-1.5">
              <StatusBadge value={s.name} />
              <span className="text-sm font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
