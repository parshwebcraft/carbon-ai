import { useEffect, useState } from "react";
import api from "@/lib/api";
import { inr } from "@/lib/format";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Users, TrendingUp, Trophy, Phone, CheckCircle2, CalendarDays } from "lucide-react";

const STATUS_COLORS = ["#B45309", "#0EA5E9", "#6366F1", "#8B5CF6", "#0D9488",
  "#F97316", "#D946EF", "#059669", "#E11D48"];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((r) => setStats(r.data))
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div data-testid="dashboard-error" className="text-rose-700">{err}</div>;
  if (!stats) return <div data-testid="dashboard-loading" className="text-slate-500">Loading…</div>;

  const statusData = Object.entries(stats.lead_status_distribution).map(([name, value]) => ({ name, value }));
  const sourceData = Object.entries(stats.lead_source_distribution).map(([name, value]) => ({ name, value }));

  const tiles = [
    { label: "Total Leads", value: stats.total_leads, icon: Users, accent: "text-amber-700 bg-amber-50" },
    { label: "Pipeline Value", value: inr(stats.pipeline_value), icon: TrendingUp, accent: "text-emerald-700 bg-emerald-50" },
    { label: "Won Revenue", value: inr(stats.won_value), icon: Trophy, accent: "text-yellow-700 bg-yellow-50" },
    { label: "Open Tasks", value: stats.open_tasks, icon: CheckCircle2, accent: "text-sky-700 bg-sky-50" },
    { label: "Calls Logged", value: stats.total_calls, icon: Phone, accent: "text-violet-700 bg-violet-50" },
    { label: "Appointments", value: stats.total_appointments, icon: CalendarDays, accent: "text-rose-700 bg-rose-50" },
  ];

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">Pipeline health for Facets Lifestyle</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {tiles.map((t) => (
          <Card
            key={t.label}
            data-testid={`stat-${t.label.toLowerCase().replace(/\s+/g, "-")}`}
            className="p-4 border-amber-100 bg-white"
          >
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${t.accent}`}>
              <t.icon className="h-4 w-4" />
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight">{t.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{t.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-5 border-amber-100 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif text-lg">Lead Status Distribution</h2>
            <span className="text-xs text-slate-500">Task completion: {stats.task_completion_rate}%</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
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

        <Card className="p-5 border-amber-100 bg-white">
          <h2 className="font-serif text-lg mb-2">Leads by Source</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData}>
                <CartesianGrid stroke="#F3E9D7" vertical={false} />
                <XAxis dataKey="name" stroke="#78716C" fontSize={11} angle={-15} dy={10} height={50} />
                <YAxis stroke="#78716C" fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" fill="#B45309" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 border-amber-100 bg-white">
        <h2 className="font-serif text-lg mb-3">Quick status summary</h2>
        <div className="flex flex-wrap gap-2">
          {statusData.map((s) => (
            <div key={s.name} className="flex items-center gap-2 rounded-lg bg-[#FBF8F3] border border-amber-100 px-3 py-1.5">
              <StatusBadge value={s.name} />
              <span className="text-sm font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
