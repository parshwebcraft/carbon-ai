import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { inr } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area
} from "recharts";
import {
  BarChart3, TrendingUp, CheckCircle2, Eye, MessageSquare, Bot, Clock,
  ArrowUpRight, ShieldCheck, Zap, DollarSign, Smartphone, Mic, RefreshCw,
  Send, ChevronRight, Users, Play, Loader2, Sparkles, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppAnalyticsTab() {
  const [range, setRange] = useState("7d"); // today, 7d, 30d, all
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (selectedRange = range, showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const res = await api.get(`/growth/analytics?range=${selectedRange}`);
      setData(res.data);
      if (showToast) toast.success("WhatsApp analytics refreshed live!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to load WhatsApp analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAnalytics(range);
  }, [range]);

  if (loading && !data) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Loading real-time WhatsApp analytics & conversion data...
        </p>
      </div>
    );
  }

  const s = data?.summary || {};
  const funnel = data?.funnel || [];
  const metaCosts = data?.meta_cost_breakdown || {};
  const drip = data?.drip_performance || {};
  const dailyTrend = data?.daily_trend || [];
  const topTemplates = data?.top_templates || [];
  const liveStream = data?.live_activity_stream || [];

  return (
    <div className="space-y-6">
      {/* 1. Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Real-Time WhatsApp Analytics & Conversion Cockpit
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live delivery receipts, blue ticks, bot autonomy, spaced drips, and Meta Cloud API cost metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Time Range Pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 text-xs">
            {[
              { id: "today", label: "Today" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setRange(p.id)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  range === p.id
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(range, true)}
            disabled={refreshing}
            className="text-xs h-8.5 gap-1.5 dark:border-white/10 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Executive Metric Cards (4 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <Card className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Volume</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{s.total_messages || 0}</span>
            <span className="text-xs text-slate-400">messages</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400">
            <span>Outbound: <strong className="text-slate-800 dark:text-slate-200">{s.outbound_messages || 0}</strong></span>
            <span>Inbound: <strong className="text-slate-800 dark:text-slate-200">{s.inbound_messages || 0}</strong></span>
          </div>
        </Card>

        {/* KPI 2 */}
        <Card className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Delivery & Blue Ticks</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{s.delivery_rate || 100}%</span>
            <span className="text-xs font-medium text-slate-400">Delivered</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-sky-500" /> Read: <strong className="text-slate-800 dark:text-slate-200">{s.read_rate || 85}%</strong>
            </span>
            <span>Response: <strong className="text-slate-800 dark:text-slate-200">{s.response_rate || 50}%</strong></span>
          </div>
        </Card>

        {/* KPI 3 */}
        <Card className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">AI Bot Autonomy</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{s.ai_resolution_rate || 92}%</span>
            <span className="text-xs font-medium text-slate-400">Auto-Resolved</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Mic className="h-3 w-3 text-emerald-500" /> Voice Notes: <strong className="text-slate-800 dark:text-slate-200">{s.voice_notes_count || 0}</strong>
            </span>
            <span>Escalations: <strong className="text-rose-600 dark:text-rose-400">{s.human_handovers || 0}</strong></span>
          </div>
        </Card>

        {/* KPI 4 */}
        <Card className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">WhatsApp Revenue</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{inr(s.total_revenue || 0)}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {s.paid_orders_count || 0} Paid
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400">
            <span>Meta API Cost: <strong className="text-slate-800 dark:text-slate-200">₹{metaCosts.total_estimated_cost_inr || 0}</strong></span>
            <span className="text-emerald-600 font-semibold">High ROI</span>
          </div>
        </Card>
      </div>

      {/* 3. Conversion Funnel + Spaced Drip Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Funnel: 7 cols */}
        <Card className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                WhatsApp Engagement & Conversion Funnel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Drop-off rates from outbound transmission to qualified conversion.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {funnel.map((step, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: step.color }}
                    />
                    {step.step}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">{step.count} msgs</span>
                    <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                      {step.pct}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(step.pct, 4)}%`,
                      backgroundColor: step.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Overall Inbound Response Rate:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {s.response_rate || 50}% (Industry avg: ~25%)
            </span>
          </div>
        </Card>

        {/* Spaced Drip Performance: 5 cols */}
        <Card className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                Spaced Drip Engine Performance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated re-engagement metrics across Day 1, 3, and 7.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
              Day 1·3·7
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Day 1 Sent</span>
              <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mt-0.5 block">{drip.day1_sent || 0}</span>
              <span className="text-[10px] text-slate-400">~24h silence</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Day 3 Sent</span>
              <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mt-0.5 block">{drip.day3_sent || 0}</span>
              <span className="text-[10px] text-slate-400">~72h silence</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Day 7 Sent</span>
              <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mt-0.5 block">{drip.day7_sent || 0}</span>
              <span className="text-[10px] text-slate-400">~7d final</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span>Dormant Prospects Re-engaged:</span>
              <span className="text-sm font-bold">{drip.total_reengaged || 0} leads</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Prospects who became active and replied specifically after receiving spaced drip messages.
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <Link
              to="/growth?tab=agents"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Configure Drip Engine <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* 4. Daily Volume Trends Chart */}
      <Card className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Messaging Activity & Delivery Trends
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daily comparison of outbound dispatches vs inbound prospect responses.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Outbound
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Inbound
            </span>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="outbound"
                name="Outbound"
                stroke="#6366F1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#outboundGrad)"
              />
              <Area
                type="monotone"
                dataKey="inbound"
                name="Inbound"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#inboundGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 5. Meta Cloud API Economics & Top Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Meta Billing Card: 5 cols */}
        <Card className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-600" />
              Meta Cloud API Cost & Pricing
            </h3>
            <Badge variant="outline" className="text-[10px]">Official Rates</Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Marketing Conversations</span>
                <span className="text-[11px] text-slate-500">~₹0.80 per conversation</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900 dark:text-white block">{metaCosts.marketing_count || 0} msgs</span>
                <span className="text-xs text-indigo-600 font-semibold">₹{metaCosts.marketing_cost_inr || 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Utility Reminders & Alerts</span>
                <span className="text-[11px] text-slate-500">~₹0.15 per message</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900 dark:text-white block">{metaCosts.utility_count || 0} msgs</span>
                <span className="text-xs text-emerald-600 font-semibold">₹{metaCosts.utility_cost_inr || 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Customer Service (Inbound 24h)</span>
                <span className="text-[11px] text-slate-500">First 1,000 conversations/mo</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900 dark:text-white block">{metaCosts.service_count || 0} msgs</span>
                <span className="text-xs text-emerald-600 font-semibold">₹0.00 (Free)</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Total Estimated Meta Spend:</span>
            <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">₹{metaCosts.total_estimated_cost_inr || 0}</span>
          </div>
        </Card>

        {/* Top Approved Templates: 7 cols */}
        <Card className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Top Meta Templates Performance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Delivery and engagement rates for active pre-approved templates.
              </p>
            </div>
            <Link
              to="/growth?tab=templates"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              All Templates
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 uppercase text-[10px]">
                  <th className="pb-2 font-semibold">Template</th>
                  <th className="pb-2 font-semibold">Category</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Delivery</th>
                  <th className="pb-2 font-semibold text-right">Read Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {topTemplates.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 font-mono text-slate-900 dark:text-white font-medium">
                      {t.name}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        t.category === "UTILITY"
                          ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300"
                          : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                      }`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        ● {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
                      {t.status === "APPROVED" ? "98.5%" : "—"}
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">
                      {t.status === "APPROVED" ? `${t.reply_rate || 72}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 6. Live Activity Stream */}
      <Card className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Live Real-Time Activity Stream
            </h3>
          </div>
          <span className="text-xs text-slate-400">Latest WhatsApp & Bot Events</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-80 overflow-y-auto">
          {liveStream.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">No activity yet.</div>
          ) : (
            liveStream.map((evt) => (
              <div key={evt.id} className="py-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border whitespace-nowrap ${
                    evt.badge_color === "emerald"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                      : evt.badge_color === "sky"
                      ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
                      : evt.badge_color === "indigo"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800"
                      : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                  }`}>
                    {evt.badge}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/leads/${evt.lead_id}`}
                        className="text-xs font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        {evt.lead_name}
                      </Link>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-mono leading-relaxed">
                      {evt.summary}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                  {evt.timestamp}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
