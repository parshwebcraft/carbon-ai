import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Play, Pause, Square, Upload, FileSpreadsheet, ChevronLeft, BarChart3,
  Trash2, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { errMsg, dateShort } from "@/lib/format";
import {
  PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend,
} from "recharts";

const SENTIMENT_COLORS = { Positive: "#10b981", Neutral: "#94a3b8", Negative: "#f43f5e" };
const OUTCOME_COLORS = [
  "#b45309", "#f59e0b", "#d97706", "#7c3aed",
  "#0ea5e9", "#10b981", "#ec4899", "#64748b",
];

const STATUS_COLORS = {
  pending: "bg-slate-100 text-slate-700",
  queued: "bg-blue-100 text-blue-800",
  dialing: "bg-indigo-100 text-indigo-800",
  ringing: "bg-violet-100 text-violet-800",
  connected: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
  busy: "bg-amber-100 text-amber-800",
  no_answer: "bg-amber-100 text-amber-800",
};

export default function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [targets, setTargets] = useState({ items: [], total: 0, page: 1, page_size: 20 });
  const [analytics, setAnalytics] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [openCsv, setOpenCsv] = useState(false);
  const [openTarget, setOpenTarget] = useState(null);

  function load() {
    api.get(`/campaigns/${id}`).then(r => setCampaign(r.data)).catch(e => toast.error(errMsg(e)));
    api.get(`/campaigns/${id}/analytics`).then(r => setAnalytics(r.data)).catch(() => {});
  }
  function loadTargets() {
    const params = { page, page_size: 20 };
    if (statusFilter !== "all") params.status = statusFilter;
    if (outcomeFilter !== "all") params.outcome = outcomeFilter;
    if (search) params.q = search;
    api.get(`/campaigns/${id}/targets`, { params })
       .then(r => setTargets(r.data))
       .catch(e => toast.error(errMsg(e)));
  }
  useEffect(() => { load(); }, [id]);
  useEffect(loadTargets, [id, page, statusFilter, outcomeFilter]);
  useEffect(() => {
    const t = setInterval(() => { load(); loadTargets(); }, 5000);
    return () => clearInterval(t);
  }, [id, page, statusFilter, outcomeFilter, search]);

  async function action(kind) {
    setBusy(true);
    try {
      const r = await api.post(`/campaigns/${id}/${kind}`);
      setCampaign(r.data);
      toast.success(`Campaign ${kind === "tick" ? "ticked" : r.data.status}`);
      loadTargets();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("Delete this campaign and all its call records?")) return;
    await api.delete(`/campaigns/${id}`);
    toast.success("Campaign deleted");
    window.location.href = "/campaigns";
  }

  if (!campaign) {
    return <div data-testid="campaign-detail-loading" className="p-6 text-slate-500">Loading campaign…</div>;
  }

  const s = campaign.stats || {};
  const headline = analytics?.headline || {};
  const sentiment = analytics?.sentiment_distribution || {};
  const outcomes = analytics?.outcome_distribution || {};

  const sentimentData = Object.entries(sentiment).map(([k, v]) => ({ name: k, value: v }));
  const outcomeData = Object.entries(outcomes).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div data-testid="campaign-detail" className="space-y-5">
      <div>
        <Link to="/campaigns" className="text-sm text-slate-600 hover:text-amber-800 inline-flex items-center gap-1"
              data-testid="back-to-campaigns">
          <ChevronLeft className="h-4 w-4" /> All campaigns
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl" data-testid="campaign-name">{campaign.name}</h1>
          <p className="text-sm text-slate-600">
            {campaign.description || "—"} · Provider:{" "}
            <Badge variant="outline" className={campaign.provider === "vapi" ? "border-emerald-300 text-emerald-800" : "border-amber-300 text-amber-800"}>
              {campaign.provider === "vapi" ? "Vapi.ai" : "MOCK"}
            </Badge>
            <span className="ml-2">Status:{" "}
              <span data-testid="campaign-status"
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[campaign.status] || "bg-slate-100"}`}>
                {campaign.status}
              </span>
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.status === "draft" && (
            <Button data-testid="campaign-launch-btn" onClick={() => action("launch")} disabled={busy}
                    className="bg-emerald-700 hover:bg-emerald-800">
              <Play className="h-4 w-4 mr-1.5" /> Launch
            </Button>
          )}
          {campaign.status === "running" && (
            <Button data-testid="campaign-pause-btn" variant="outline" onClick={() => action("pause")}
                    disabled={busy}>
              <Pause className="h-4 w-4 mr-1.5" /> Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button data-testid="campaign-resume-btn" onClick={() => action("resume")} disabled={busy}
                    className="bg-amber-700 hover:bg-amber-800">
              <Play className="h-4 w-4 mr-1.5" /> Resume
            </Button>
          )}
          {(campaign.status === "running" || campaign.status === "paused") && (
            <Button data-testid="campaign-tick-btn" variant="outline" onClick={() => action("tick")}
                    disabled={busy} title="Force one engine pass (useful for demos)">
              <PlayCircle className="h-4 w-4 mr-1.5" /> Run a tick now
            </Button>
          )}
          {campaign.status !== "cancelled" && campaign.status !== "completed" && (
            <Button data-testid="campaign-cancel-btn" variant="outline" onClick={() => action("cancel")}
                    disabled={busy} className="text-rose-700 border-rose-300">
              <Square className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
          )}
          <Dialog open={openCsv} onOpenChange={setOpenCsv}>
            <DialogTrigger asChild>
              <Button data-testid="campaign-csv-btn" variant="outline">
                <Upload className="h-4 w-4 mr-1.5" /> Add CSV
              </Button>
            </DialogTrigger>
            <CsvUploadDialog id={id} onSaved={() => { setOpenCsv(false); load(); loadTargets(); }} />
          </Dialog>
          <Button data-testid="campaign-delete-btn" variant="outline" onClick={remove}
                  className="text-rose-700 border-rose-300">
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Headline tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Tile label="Total Calls" value={headline.total_calls ?? s.total_targets ?? 0} testid="tile-total" />
        <Tile label="Connected" value={headline.connected_calls ?? s.connected ?? 0} testid="tile-connected" />
        <Tile label="Interested" value={headline.interested_leads ?? s.interested_leads ?? 0} testid="tile-interested" />
        <Tile label="Appointments" value={headline.appointment_bookings ?? s.appointment_bookings ?? 0} testid="tile-appts" />
        <Tile label="Quotes Asked" value={headline.quotations_requested ?? s.quotations_requested ?? 0} testid="tile-quotes" />
        <Tile label="Conv. Rate" value={`${(headline.conversion_rate_pct ?? (s.conversion_rate ?? 0) * 100).toFixed(1)}%`} testid="tile-conv" />
        <Tile label="Avg Score" value={(headline.avg_lead_score ?? s.avg_lead_score ?? 0).toFixed?.(1) || "0.0"} testid="tile-score" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4 border-amber-100">
          <div className="font-serif text-lg mb-1">Outcome Distribution</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
              <BarChart data={outcomeData}>
                <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={80} fontSize={11} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value">
                  {outcomeData.map((_, i) => <Cell key={i} fill={OUTCOME_COLORS[i % OUTCOME_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4 border-amber-100">
          <div className="font-serif text-lg mb-1">Sentiment</div>
          <div className="h-72 flex items-center justify-center">
            {sentimentData.length === 0 ? (
              <div className="text-slate-500 text-sm">No sentiment data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                <PieChart>
                  <Pie dataKey="value" data={sentimentData} innerRadius={45} outerRadius={90}>
                    {sentimentData.map((d, i) => (
                      <Cell key={i} fill={SENTIMENT_COLORS[d.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Funnel/status row */}
      <Card className="p-4 border-amber-100">
        <div className="font-serif text-lg mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-700" /> Funnel
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          <FunnelChip label="Pending" value={s.pending || 0} cls="bg-slate-100 text-slate-700" />
          <FunnelChip label="In-Progress" value={s.in_progress || 0} cls="bg-blue-100 text-blue-800" />
          <FunnelChip label="Connected" value={s.connected || 0} cls="bg-emerald-100 text-emerald-800" />
          <FunnelChip label="No Answer" value={s.no_answer || 0} cls="bg-amber-100 text-amber-800" />
          <FunnelChip label="Busy" value={s.busy || 0} cls="bg-amber-100 text-amber-800" />
          <FunnelChip label="Failed" value={s.failed || 0} cls="bg-rose-100 text-rose-800" />
          <FunnelChip label="Total" value={s.total_targets || 0} cls="bg-slate-900 text-white" />
        </div>
      </Card>

      {/* Targets */}
      <Card className="border-amber-100 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-amber-100 bg-amber-50/40">
          <div className="font-serif text-lg flex-1">Call Queue & History</div>
          <Input data-testid="targets-search" value={search}
            placeholder="Search name / phone"
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && loadTargets()}
            className="w-56" />
          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v); }}>
            <SelectTrigger data-testid="targets-status-filter" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={outcomeFilter} onValueChange={(v) => { setPage(1); setOutcomeFilter(v); }}>
            <SelectTrigger data-testid="targets-outcome-filter" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              {Object.keys(outcomes).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="targets-table">
            <thead className="bg-amber-50/30 text-slate-700">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Name / Phone</th>
                <th className="text-left px-4 py-2 font-semibold">City</th>
                <th className="text-left px-4 py-2 font-semibold">Status</th>
                <th className="text-left px-4 py-2 font-semibold">Outcome</th>
                <th className="text-left px-4 py-2 font-semibold">Sentiment</th>
                <th className="text-right px-4 py-2 font-semibold">Score</th>
                <th className="text-right px-4 py-2 font-semibold">Dur</th>
                <th className="text-left px-4 py-2 font-semibold">Last call</th>
              </tr>
            </thead>
            <tbody>
              {targets.items.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-slate-500">No targets match.</td></tr>
              ) : targets.items.map(t => (
                <tr key={t.id} className="border-t border-amber-50 hover:bg-amber-50/30 cursor-pointer"
                    onClick={() => setOpenTarget(t)}
                    data-testid={`target-row-${t.id}`}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.phone}</div>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{t.city || "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[t.call_status] || "bg-slate-100"}`}>
                      {t.call_status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{t.outcome || "—"}</td>
                  <td className="px-4 py-2 text-slate-700">{t.sentiment || "—"}</td>
                  <td className="px-4 py-2 text-right">{t.lead_score ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{t.duration ? `${t.duration}s` : "—"}</td>
                  <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                    {t.last_attempt_at ? dateShort(t.last_attempt_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 border-t border-amber-100 bg-amber-50/30 text-sm">
          <div>Page {targets.page} · {targets.total} targets</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    data-testid="targets-prev">Prev</Button>
            <Button size="sm" variant="outline"
                    disabled={(targets.page * targets.page_size) >= targets.total}
                    onClick={() => setPage(p => p + 1)}
                    data-testid="targets-next">Next</Button>
          </div>
        </div>
      </Card>

      {openTarget && <TargetDialog target={openTarget} onClose={() => setOpenTarget(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Tile({ label, value, testid }) {
  return (
    <Card className="p-4 border-amber-100 bg-white" data-testid={testid}>
      <div className="text-xs text-slate-600 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-serif mt-1">{value}</div>
    </Card>
  );
}
function FunnelChip({ label, value, cls }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${cls}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function CsvUploadDialog({ id, onSaved }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  async function upload() {
    const f = ref.current?.files?.[0];
    if (!f) { toast.error("Pick a CSV file first"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      await api.post(`/campaigns/${id}/upload-csv`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("CSV imported");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(false); }
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-serif flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" /> Upload CSV Targets
        </DialogTitle>
        <DialogDescription>
          Headers: <code>name, phone, city, notes, source, lead_prompt_override</code>.
          Phone is required. Existing leads matching the phone are auto-linked.
        </DialogDescription>
      </DialogHeader>
      <input ref={ref} data-testid="csv-file-input"
             type="file" accept=".csv,text/csv"
             className="block w-full text-sm" />
      <DialogFooter>
        <Button data-testid="csv-upload-btn" disabled={busy} onClick={upload}
                className="bg-amber-700 hover:bg-amber-800">Upload</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TargetDialog({ target, onClose }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">{target.name}</DialogTitle>
          <DialogDescription>{target.phone} · {target.city || "—"}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Status" value={target.call_status} />
          <Info label="Outcome" value={target.outcome || "—"} />
          <Info label="Sentiment" value={target.sentiment || "—"} />
          <Info label="Lead Score" value={target.lead_score ?? "—"} />
          <Info label="Duration" value={target.duration ? `${target.duration}s` : "—"} />
          <Info label="Attempts" value={target.attempts} />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 mt-2">AI Summary</div>
          <div className="text-sm text-slate-800 whitespace-pre-wrap">{target.summary || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 mt-2">Next Action</div>
          <div className="text-sm text-slate-800">{target.next_action || "—"}</div>
        </div>
        {target.transcript && (
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mt-2">Transcript</div>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-3 max-h-72 overflow-auto whitespace-pre-wrap font-sans">
{target.transcript}
            </pre>
          </div>
        )}
        {target.recording_url && (
          <div className="text-xs text-slate-600">
            Recording (mock): <code className="break-all">{target.recording_url}</code>
          </div>
        )}
        {target.lead_id && (
          <div className="text-sm">
            <Link to={`/leads/${target.lead_id}`} className="text-amber-800 underline" data-testid="target-open-lead">
              Open linked lead →
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
