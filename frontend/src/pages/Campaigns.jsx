import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Phone, Play, Pause, RotateCcw, Trash2, Settings, Sparkles,
  Send, MessageSquare, CheckCheck, Check, Eye, Users, Clock, AlertTriangle,
  RefreshCw, ExternalLink, FileText, Ban, Search, ArrowLeft, CornerDownLeft,
  DollarSign, TrendingUp, CheckCircle2, ChevronRight, FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { errMsg, dateShort, dateTime } from "@/lib/format";
import WhatsAppBroadcastModal from "@/components/WhatsAppBroadcastModal";

const STATUSES = ["New", "Contacted", "Follow Up", "Interested", "Visit Scheduled",
  "Quotation Sent", "Negotiation", "Won", "Lost"];
const SOURCES = ["Website", "WhatsApp", "Instagram", "Facebook", "Walk-In", "Referral", "Google Ads"];

const statusStyle = (s) => ({
  draft: "bg-slate-100 text-slate-700",
  running: "bg-emerald-100 text-emerald-800",
  paused: "bg-indigo-100 text-indigo-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-rose-100 text-rose-800",
}[s] || "bg-slate-100 text-slate-700");

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState("whatsapp");

  // Voice Campaigns state
  const [voiceItems, setVoiceItems] = useState([]);
  const [voiceLoading, setVoiceLoading] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [provider, setProvider] = useState("mock");

  // WhatsApp Broadcasts state
  const [broadcastItems, setBroadcastItems] = useState([]);
  const [broadcastSummary, setBroadcastSummary] = useState({
    total_broadcasts: 0,
    total_sent: 0,
    total_delivered: 0,
    total_read: 0,
  });
  const [broadcastLoading, setBroadcastLoading] = useState(true);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastInitialMode, setBroadcastInitialMode] = useState("all");

  // Recipient logs drawer/modal state
  const [viewBroadcastId, setViewBroadcastId] = useState(null);
  const [broadcastDetail, setBroadcastDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  function loadVoice() {
    setVoiceLoading(true);
    api.get("/campaigns").then(r => setVoiceItems(r.data.items))
      .catch(e => toast.error(errMsg(e)))
      .finally(() => setVoiceLoading(false));
    api.get("/settings/calling/provider").then(r => setProvider(r.data.provider)).catch(() => {});
  }

  function loadBroadcasts() {
    setBroadcastLoading(true);
    api.get("/whatsapp/broadcasts")
      .then(r => {
        setBroadcastItems(r.data.items || []);
        if (r.data.summary) setBroadcastSummary(r.data.summary);
      })
      .catch(e => toast.error(errMsg(e, "Failed to load WhatsApp broadcasts")))
      .finally(() => setBroadcastLoading(false));
  }

  useEffect(() => {
    loadVoice();
    loadBroadcasts();
  }, []);

  // Poll running broadcasts for live progress bar
  useEffect(() => {
    const hasRunning = broadcastItems.some(b => b.status === "running");
    if (!hasRunning) return;

    const interval = setInterval(() => {
      api.get("/whatsapp/broadcasts").then(r => {
        setBroadcastItems(r.data.items || []);
        if (r.data.summary) setBroadcastSummary(r.data.summary);
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [broadcastItems]);

  async function openBroadcastDetails(id) {
    setViewBroadcastId(id);
    setDetailLoading(true);
    try {
      const res = await api.get(`/whatsapp/broadcasts/${id}`);
      setBroadcastDetail(res.data);
    } catch (e) {
      toast.error(errMsg(e, "Failed to load broadcast recipients"));
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCancelBroadcast(id) {
    if (!window.confirm("Are you sure you want to cancel this running broadcast? Remaining queued messages will not be sent.")) return;
    try {
      await api.post(`/whatsapp/broadcasts/${id}/cancel`);
      toast.success("Broadcast cancelled.");
      loadBroadcasts();
    } catch (e) {
      toast.error(errMsg(e, "Failed to cancel broadcast"));
    }
  }

  async function handleDeleteBroadcast(id) {
    if (!window.confirm("Are you sure you want to delete this broadcast record?")) return;
    try {
      await api.delete(`/whatsapp/broadcasts/${id}`);
      toast.success("Broadcast deleted.");
      loadBroadcasts();
    } catch (e) {
      toast.error(errMsg(e, "Failed to delete broadcast"));
    }
  }

  return (
    <div data-testid="campaigns-page" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-emerald-600" /> Outbound Campaign Engine
          </h1>
          <p className="text-sm text-slate-600">
            Scale revenue with bulk personalized WhatsApp broadcasts & autonomous AI voice dialers
          </p>
        </div>
      </div>

      {/* Tabs Header */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger
              value="whatsapp"
              className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp Broadcasts</span>
              {broadcastItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                  {broadcastItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="voice"
              className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>AI Voice Calling</span>
              {voiceItems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
                  {voiceItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Action buttons based on active tab */}
          {activeTab === "whatsapp" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setBroadcastInitialMode("excel");
                  setBroadcastModalOpen(true);
                }}
                className="border-emerald-300 text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 gap-1.5 text-xs h-9 px-3.5 rounded-xl font-semibold shadow-2xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Upload Excel / CSV</span>
              </Button>
              <Button
                onClick={() => {
                  setBroadcastInitialMode("all");
                  setBroadcastModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs h-9 px-4 rounded-xl shadow-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>New Broadcast</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="campaigns-settings-btn" variant="outline" size="sm" className="rounded-xl text-xs h-9">
                    <Settings className="h-4 w-4 mr-1.5" /> Calling Settings
                  </Button>
                </DialogTrigger>
                <CallingSettingsDialog onClose={() => setSettingsOpen(false)} />
              </Dialog>
              <Dialog open={voiceOpen} onOpenChange={setVoiceOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="campaigns-new-btn" className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs h-9 rounded-xl font-semibold">
                    <Plus className="h-4 w-4 mr-1.5" /> New Voice Campaign
                  </Button>
                </DialogTrigger>
                <NewCampaignDialog onSaved={() => { setVoiceOpen(false); loadVoice(); }} />
              </Dialog>
            </div>
          )}
        </div>

        {/* ── WHATSAPP BROADCAST TAB CONTENT ── */}
        <TabsContent value="whatsapp" className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 rounded-2xl border-slate-200/80 bg-white shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Total Broadcasts</span>
                <Send className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-serif text-slate-900">
                {broadcastSummary.total_broadcasts}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Multi-channel campaigns</div>
            </Card>

            <Card className="p-4 rounded-2xl border-slate-200/80 bg-white shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Total Delivered</span>
                <CheckCheck className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-bold font-serif text-slate-900">
                {broadcastSummary.total_sent}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <span>Meta Cloud API Outbound</span>
              </div>
            </Card>

            <Card className="p-4 rounded-2xl border-slate-200/80 bg-white shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Delivery Rate</span>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-serif text-emerald-700">
                {broadcastSummary.total_sent > 0
                  ? `${Math.round(((broadcastSummary.total_delivered || broadcastSummary.total_sent) / broadcastSummary.total_sent) * 100)}%`
                  : "100%"}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Verified handoffs to device</div>
            </Card>

            <Card className="p-4 rounded-2xl border-slate-200/80 bg-white shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Read (Blue Ticks)</span>
                <Eye className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-2xl font-bold font-serif text-sky-700">
                {broadcastSummary.total_read}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Customer opened message</div>
            </Card>
          </div>

          {/* Broadcast Campaigns Table */}
          <Card className="border-slate-200/80 bg-white overflow-hidden rounded-2xl shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 text-slate-700 border-b border-slate-200/80">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-xs">Broadcast Campaign</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs">Progress (Sent/Total)</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Delivered</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Read (Ticks)</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs">Pacing Delay</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs">Created</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {broadcastLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                        Loading WhatsApp broadcasts…
                      </td>
                    </tr>
                  ) : broadcastItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                            <Send className="w-6 h-6" />
                          </div>
                          <div className="text-sm font-semibold text-slate-800">No WhatsApp Broadcasts Yet</div>
                          <p className="text-xs text-slate-500">
                            Launch your first bulk promotional or retargeting campaign with dynamic variables and interactive CTA buttons.
                          </p>
                          <Button
                            onClick={() => setBroadcastModalOpen(true)}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs"
                          >
                            <Plus className="w-4 h-4 mr-1.5" /> Create Broadcast
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    broadcastItems.map((b) => {
                      const total = b.total_recipients || 0;
                      const sent = b.sent_count || 0;
                      const pct = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;
                      const isRunning = b.status === "running";

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Name & Snippet */}
                          <td className="px-4 py-3.5 cursor-pointer" onClick={() => openBroadcastDetails(b.id)}>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5 hover:text-emerald-700 transition">
                              <span>{b.name}</span>
                              {b.media_type === "document" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                  PDF
                                </span>
                              )}
                              {b.interactive_type === "button" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                  CTA Buttons
                                </span>
                              )}
                              {b.interactive_type === "cta_url" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  Link Button
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-1 max-w-[280px] mt-0.5">
                              {b.message_template}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                isRunning
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : b.status === "completed"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />}
                              <span className="capitalize">{b.status}</span>
                            </span>
                          </td>

                          {/* Progress */}
                          <td className="px-4 py-3.5 min-w-[150px]">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-800">
                                {sent} / {total}
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  pct === 100 ? "bg-blue-600" : "bg-emerald-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>

                          {/* Delivered */}
                          <td className="px-4 py-3.5 text-right font-medium text-teal-800">
                            {b.delivered_count || sent}
                          </td>

                          {/* Read */}
                          <td className="px-4 py-3.5 text-right font-medium text-sky-700">
                            {b.read_count || 0}
                          </td>

                          {/* Pacing */}
                          <td className="px-4 py-3.5 text-xs text-slate-500">
                            {b.delay_seconds || 3}s / lead
                          </td>

                          {/* Created */}
                          <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                            {dateShort(b.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openBroadcastDetails(b.id)}
                                className="h-7 text-xs rounded-lg px-2.5 bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-semibold shadow-2xs"
                                title="View Campaign Analytics Cockpit"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1 text-[#53bdeb]" />
                                Analytics
                              </Button>

                              {isRunning && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelBroadcast(b.id)}
                                  className="h-7 text-xs rounded-lg px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                                  title="Cancel Broadcast"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </Button>
                              )}

                              {!isRunning && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteBroadcast(b.id)}
                                  className="h-7 text-xs rounded-lg px-2 text-slate-400 hover:text-rose-600"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
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
        </TabsContent>

        {/* ── AI VOICE CALLING TAB CONTENT ── */}
        <TabsContent value="voice" className="space-y-5">
          <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span>
              Outbound AI dialer engine provider:&nbsp;
              <Badge
                variant="outline"
                className={
                  provider === "omnidim" || provider === "vapi"
                    ? "border-emerald-300 text-emerald-800 bg-emerald-50"
                    : "border-indigo-300 text-indigo-800"
                }
              >
                {provider === "omnidim" || provider === "vapi" ? "AI Voice Agent (Live)" : "MOCK"}
              </Badge>
            </span>
            <span className="text-slate-400">Autonomous voice calls with sentiment analysis & transcript sync</span>
          </div>

          <Card className="border-indigo-100 bg-white overflow-hidden rounded-2xl shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="campaigns-table">
                <thead className="bg-indigo-50/60 text-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-xs">Campaign</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs">Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Targets</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Connected</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Interested</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Appts</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Quotes</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs">Conv%</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-50/60">
                  {voiceLoading ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-500 text-xs">
                        Loading voice campaigns…
                      </td>
                    </tr>
                  ) : voiceItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">
                        No voice campaigns yet. Click <b>New Voice Campaign</b> to launch an outbound AI caller.
                      </td>
                    </tr>
                  ) : (
                    voiceItems.map((c) => (
                      <tr key={c.id} className="border-t border-indigo-50 hover:bg-indigo-50/30">
                        <td className="px-4 py-3">
                          <Link
                            to={`/campaigns/${c.id}`}
                            data-testid={`campaign-row-${c.id}`}
                            className="font-medium text-slate-900 hover:text-indigo-800"
                          >
                            {c.name}
                          </Link>
                          <div className="text-xs text-slate-500">{c.description || "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{c.stats?.total_targets ?? 0}</td>
                        <td className="px-4 py-3 text-right text-emerald-800">{c.stats?.connected ?? 0}</td>
                        <td className="px-4 py-3 text-right">{c.stats?.interested_leads ?? 0}</td>
                        <td className="px-4 py-3 text-right">{c.stats?.appointment_bookings ?? 0}</td>
                        <td className="px-4 py-3 text-right">{c.stats?.quotations_requested ?? 0}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {((c.stats?.conversion_rate ?? 0) * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{dateShort(c.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── AISENSY-STYLE CAMPAIGN ANALYTICS COCKPIT MODAL ── */}
      <AiSensyCampaignModal
        broadcastId={viewBroadcastId}
        onClose={() => setViewBroadcastId(null)}
        onDeleted={() => {
          setViewBroadcastId(null);
          loadBroadcasts();
        }}
      />

      {/* ── BROADCAST COMPOSER MODAL ── */}
      <WhatsAppBroadcastModal
        open={broadcastModalOpen}
        onOpenChange={setBroadcastModalOpen}
        initialTargetMode={broadcastInitialMode}
        onSuccess={loadBroadcasts}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AiSensy-Style Campaign Analytics & Real-Time Delivery Cockpit
// ---------------------------------------------------------------------------
function AiSensyCampaignModal({ broadcastId, onClose, onDeleted }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed'

  async function loadDetails() {
    if (!broadcastId) return;
    setLoading(true);
    try {
      const res = await api.get(`/whatsapp/broadcasts/${broadcastId}`);
      setDetail(res.data);
    } catch (e) {
      toast.error(errMsg(e, "Failed to load campaign analytics"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [broadcastId]);

  if (!broadcastId) return null;

  const tot = Math.max(1, detail?.total_recipients || detail?.recipients?.length || 1);
  const sentCount = detail?.sent_count ?? 0;
  const deliveredCount = detail?.delivered_count ?? sentCount;
  const readCount = detail?.read_count ?? 0;
  const repliedCount = detail?.replied_count ?? 0;
  const failedCount = detail?.failed_count ?? 0;

  const sentPct = detail?.sent_pct ?? Math.min(100, Math.round((sentCount / tot) * 100));
  const deliveredPct = detail?.delivered_pct ?? Math.min(100, Math.round((deliveredCount / tot) * 100));
  const readPct = detail?.read_pct ?? Math.min(100, Math.round((readCount / tot) * 100));
  const repliedPct = detail?.replied_pct ?? Math.min(100, Math.round((repliedCount / tot) * 100));
  const failedPct = detail?.failed_pct ?? Math.min(100, Math.round((failedCount / tot) * 100));

  const costINR = detail?.estimated_cost != null ? Number(detail.estimated_cost).toFixed(3) : (sentCount * 0.8).toFixed(3);

  const isDiwali = detail?.name?.toLowerCase().includes("diwali") ||
    detail?.message_template?.toLowerCase().includes("diwali") ||
    detail?.message_template?.includes("parshwebcraft_diwali_2026");

  const mediaUrl = detail?.media_url || (isDiwali ? "https://parshagent.com/images/parshwebcraft_diwali_2026.png" : null);

  const sampleLeadName = detail?.recipients?.[0]?.name || "Gauransh";
  const previewText = detail?.message_template
    ? detail.message_template
        .replace(/\{\{name\}\}/gi, sampleLeadName)
        .replace(/\{\{1\}\}/g, sampleLeadName)
    : "";

  const allRecipients = detail?.recipients || [];
  const filteredRecipients = allRecipients.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.phone && r.phone.includes(q));

    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "read") return r.status === "read" || !!r.read_at;
    if (statusFilter === "delivered") return r.status === "delivered" || !!r.delivered_at || r.status === "read";
    if (statusFilter === "sent") return r.status === "sent" || !!r.sent_at;
    if (statusFilter === "replied") return r.status === "replied" || !!r.replied_at;
    if (statusFilter === "failed") return r.status === "failed";
    return true;
  });

  return (
    <Dialog open={!!broadcastId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-slate-50/70 border-slate-200 shadow-2xl">
        {/* ── TOP HEADER BAR ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-serif text-slate-900 tracking-tight">
                  {detail?.name || "WhatsApp Campaign Analytics"}
                </h2>
                <Badge
                  variant="outline"
                  className={
                    detail?.status === "running"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold"
                      : "bg-blue-50 text-blue-700 border-blue-300 font-bold"
                  }
                >
                  {detail?.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse mr-1" />}
                  {detail?.status?.toUpperCase() || "COMPLETED"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Meta WhatsApp Cloud API Broadcast Cockpit</span>
                <span>•</span>
                <span>Created {detail?.created_at ? dateTime(detail.created_at) : "Just now"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadDetails}
              disabled={loading}
              className="rounded-xl text-xs h-8 px-3 border-slate-300 text-slate-700 hover:bg-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl text-xs h-8 px-3 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
            >
              Close
            </Button>
          </div>
        </div>

        {loading && !detail ? (
          <div className="py-24 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span>Loading real-time campaign performance & delivery logs…</span>
          </div>
        ) : detail ? (
          <div className="space-y-6 pt-2">
            {/* ── AISENSY TOP METRIC RIBBON (INTERACTIVE FILTER TABS) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs">
              {/* 1. Overview */}
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`flex flex-col text-left p-3 rounded-xl transition ${
                  statusFilter === "all"
                    ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="text-base font-bold flex items-center justify-between">
                  <span>100%</span>
                  <span className={`text-xs ${statusFilter === "all" ? "text-slate-300" : "text-slate-400"}`}>
                    ({tot})
                  </span>
                </div>
                <div className={`text-xs font-semibold mt-1 flex items-center gap-1.5 ${statusFilter === "all" ? "text-slate-200" : "text-slate-500"}`}>
                  <Users className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </div>
              </button>

              {/* 2. Sent */}
              <button
                type="button"
                onClick={() => setStatusFilter("sent")}
                className={`flex flex-col text-left p-3 rounded-xl transition ${
                  statusFilter === "sent"
                    ? "bg-slate-800 text-white shadow-sm ring-2 ring-slate-800"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="text-base font-bold flex items-center justify-between">
                  <span>{sentPct}%</span>
                  <span className={`text-xs ${statusFilter === "sent" ? "text-slate-300" : "text-slate-400"}`}>
                    ({sentCount})
                  </span>
                </div>
                <div className={`text-xs font-semibold mt-1 flex items-center gap-1.5 ${statusFilter === "sent" ? "text-slate-200" : "text-slate-500"}`}>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Sent</span>
                </div>
              </button>

              {/* 3. Delivered */}
              <button
                type="button"
                onClick={() => setStatusFilter("delivered")}
                className={`flex flex-col text-left p-3 rounded-xl transition ${
                  statusFilter === "delivered"
                    ? "bg-teal-900 text-white shadow-sm ring-2 ring-teal-700"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="text-base font-bold flex items-center justify-between">
                  <span>{deliveredPct}%</span>
                  <span className={`text-xs ${statusFilter === "delivered" ? "text-teal-200" : "text-slate-400"}`}>
                    ({deliveredCount})
                  </span>
                </div>
                <div className={`text-xs font-semibold mt-1 flex items-center gap-1.5 ${statusFilter === "delivered" ? "text-teal-200" : "text-teal-600"}`}>
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Delivered</span>
                </div>
              </button>

              {/* 4. Read (Blue Ticks) */}
              <button
                type="button"
                onClick={() => setStatusFilter("read")}
                className={`flex flex-col text-left p-3 rounded-xl transition ${
                  statusFilter === "read"
                    ? "bg-sky-900 text-white shadow-sm ring-2 ring-sky-500"
                    : "hover:bg-sky-50/50 text-slate-700"
                }`}
              >
                <div className="text-base font-bold flex items-center justify-between">
                  <span className={statusFilter === "read" ? "text-sky-300" : "text-sky-600"}>{readPct}%</span>
                  <span className={`text-xs ${statusFilter === "read" ? "text-sky-200" : "text-slate-400"}`}>
                    ({readCount})
                  </span>
                </div>
                <div className={`text-xs font-semibold mt-1 flex items-center gap-1.5 ${statusFilter === "read" ? "text-sky-200" : "text-sky-600"}`}>
                  <Eye className="w-3.5 h-3.5 text-[#53bdeb]" />
                  <span>Read 🔵</span>
                </div>
              </button>

              {/* 5. Replied */}
              <button
                type="button"
                onClick={() => setStatusFilter("replied")}
                className={`flex flex-col text-left p-3 rounded-xl transition ${
                  statusFilter === "replied"
                    ? "bg-purple-900 text-white shadow-sm ring-2 ring-purple-600"
                    : "hover:bg-purple-50/50 text-slate-700"
                }`}
              >
                <div className="text-base font-bold flex items-center justify-between">
                  <span className={statusFilter === "replied" ? "text-purple-300" : "text-purple-600"}>{repliedPct}%</span>
                  <span className={`text-xs ${statusFilter === "replied" ? "text-purple-200" : "text-slate-400"}`}>
                    ({repliedCount})
                  </span>
                </div>
                <div className={`text-xs font-semibold mt-1 flex items-center gap-1.5 ${statusFilter === "replied" ? "text-purple-200" : "text-purple-600"}`}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Replied 💬</span>
                </div>
              </button>

              {/* 6. Failed */}
              <button
                type="button"
                onClick={() => setStatusFilter("failed")}
                className={`flex flex-col text-left p-3 rounded-xl transition ${
                  statusFilter === "failed"
                    ? "bg-rose-900 text-white shadow-sm ring-2 ring-rose-600"
                    : "hover:bg-rose-50/50 text-slate-700"
                }`}
              >
                <div className="text-base font-bold flex items-center justify-between">
                  <span className={statusFilter === "failed" ? "text-rose-300" : "text-rose-600"}>{failedPct}%</span>
                  <span className={`text-xs ${statusFilter === "failed" ? "text-rose-200" : "text-slate-400"}`}>
                    ({failedCount})
                  </span>
                </div>
                <div className={`text-xs font-semibold mt-1 flex items-center gap-1.5 ${statusFilter === "failed" ? "text-rose-200" : "text-rose-600"}`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Failed</span>
                </div>
              </button>
            </div>

            {/* ── CAMPAIGN METADATA GRID (4 CARDS LIKE AISENSY) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Campaign Type */}
              <Card className="p-4 rounded-2xl bg-white border-slate-200/80 shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Campaign Type</span>
                  <Send className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-sm font-bold text-slate-800 truncate">
                  {detail.interactive_type === "meta_template" || isDiwali
                    ? "Meta Approved Template"
                    : "WhatsApp Cloud Broadcast"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate font-mono">
                  {isDiwali ? "parshwebcraft_diwali_2026" : (detail.name || "Custom Broadcast")}
                </div>
              </Card>

              {/* Card 2: Status */}
              <Card className="p-4 rounded-2xl bg-white border-slate-200/80 shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Status</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="capitalize">{detail.status}</span>
                  {detail.status === "running" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {detail.status === "running" ? "Currently sending messages" : "All dispatches concluded"}
                </div>
              </Card>

              {/* Card 3: Audience */}
              <Card className="p-4 rounded-2xl bg-white border-slate-200/80 shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Audience</span>
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {tot} <span className="text-xs font-normal text-slate-500">Recipients</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Pacing: {detail.delay_seconds || 3}s anti-ban interval
                </div>
              </Card>

              {/* Card 4: Total Credit Usage */}
              <Card className="p-4 rounded-2xl bg-white border-slate-200/80 shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Total Credit Usage</span>
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  ₹{costINR}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Meta Marketing Tier (~₹0.80/conv)
                </div>
              </Card>
            </div>

            {/* ── 4 KPI METRIC COUNTERS (AISENSY SUB-ROW) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-3 px-3 py-1.5 border-r border-slate-100 last:border-r-0">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Sent</div>
                  <div className="text-base font-bold text-slate-900">{sentCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 px-3 py-1.5 border-r border-slate-100 last:border-r-0">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                  <CheckCheck className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Delivered</div>
                  <div className="text-base font-bold text-teal-800">{deliveredCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 px-3 py-1.5 border-r border-slate-100 last:border-r-0">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
                  <Eye className="w-4 h-4 text-[#53bdeb]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Read</div>
                  <div className="text-base font-bold text-sky-800">{readCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 px-3 py-1.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Replied</div>
                  <div className="text-base font-bold text-purple-800">{repliedCount}</div>
                </div>
              </div>
            </div>

            {/* ── LOWER SPLIT: CREATIVE PREVIEW (LEFT) + RECIPIENT LOGS (RIGHT) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: WhatsApp Creative Preview */}
              <div className="lg:col-span-4 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pb-2 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Creative Message Preview</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border-emerald-300">
                    APPROVED
                  </Badge>
                </div>

                {/* Mobile screen mock */}
                <div className="rounded-2xl overflow-hidden border border-slate-300/80 shadow-md bg-[#e5ddd5] p-3 text-xs">
                  {/* WhatsApp chat bubble */}
                  <div className="bg-[#d9fdd3] text-slate-900 rounded-2xl rounded-tr-none p-2.5 shadow-xs space-y-2 border border-emerald-200/50">
                    {/* Header Image */}
                    {mediaUrl && (
                      <div className="rounded-xl overflow-hidden border border-emerald-300/40 bg-black/5">
                        <img
                          src={mediaUrl}
                          alt="Creative Graphic"
                          className="w-full h-auto max-h-56 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="whitespace-pre-line text-[11px] leading-relaxed text-slate-800">
                      {previewText || "Diwali greetings & best wishes from Parsh Web Craft!"}
                    </div>

                    {/* Footer */}
                    <div className="text-[10px] text-slate-500 border-t border-emerald-200/50 pt-1">
                      Warm regards, Gauransh & Team ParshWebCraft ✨
                    </div>

                    {/* Buttons / CTA */}
                    <div className="space-y-1 pt-1">
                      <button
                        type="button"
                        disabled
                        className="w-full py-1.5 px-3 bg-white hover:bg-slate-50 text-emerald-700 font-semibold text-[11px] rounded-xl border border-emerald-200/80 shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <span>🪔</span>
                        <span>Happy Diwali</span>
                      </button>
                    </div>

                    {/* Bubble time + Read Blue Ticks */}
                    <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 pt-0.5">
                      <span>12:08 am</span>
                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span>Category: <b>MARKETING</b></span>
                  <span>Bypasses 24h Window: <b>Yes</b></span>
                </div>
              </div>

              {/* Right Column: Filterable Recipient Timeline Table */}
              <div className="lg:col-span-8 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>Audience Delivery Breakdown & Real-Time Logs</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Showing {filteredRecipients.length} of {allRecipients.length} recipients
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search recipient or phone…"
                      className="pl-8 h-8 text-xs rounded-xl border-slate-300"
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                      statusFilter === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All ({allRecipients.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("read")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition flex items-center gap-1 ${
                      statusFilter === "read"
                        ? "bg-sky-600 text-white"
                        : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                    }`}
                  >
                    <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                    <span>Read ({readCount})</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter("delivered")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                      statusFilter === "delivered"
                        ? "bg-teal-600 text-white"
                        : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                    }`}
                  >
                    Delivered ({deliveredCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter("replied")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition flex items-center gap-1 ${
                      statusFilter === "replied"
                        ? "bg-purple-600 text-white"
                        : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Replied ({repliedCount})</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter("failed")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                      statusFilter === "failed"
                        ? "bg-rose-600 text-white"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                    }`}
                  >
                    Failed ({failedCount})
                  </button>
                </div>

                {/* Recipient Logs Table */}
                <div className="border border-slate-200/90 rounded-2xl overflow-hidden max-h-[460px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 sticky top-0 backdrop-blur-xs z-10 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3.5 py-2.5 font-semibold">Recipient</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Sent At</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Delivered At</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Read At (Ticks)</th>
                        <th className="text-right px-3.5 py-2.5 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecipients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            No recipients match the selected status or query.
                          </td>
                        </tr>
                      ) : (
                        filteredRecipients.map((r) => {
                          const isRead = r.status === "read" || !!r.read_at;
                          const isDelivered = r.status === "delivered" || !!r.delivered_at || isRead;
                          const isReplied = r.status === "replied" || !!r.replied_at;
                          const isFailed = r.status === "failed";

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Recipient */}
                              <td className="px-3.5 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                                    {(r.name || "L").slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 truncate max-w-[140px]">
                                      {r.name || "Valued Customer"}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono">
                                      {r.phone}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="px-3 py-2.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    isReplied
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : isRead
                                      ? "bg-sky-50 text-sky-800 border-sky-300"
                                      : isDelivered
                                      ? "bg-teal-50 text-teal-800 border-teal-200"
                                      : isFailed
                                      ? "bg-rose-50 text-rose-800 border-rose-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {isReplied ? (
                                    <>
                                      <MessageSquare className="w-3 h-3 text-purple-600" />
                                      <span>Replied</span>
                                    </>
                                  ) : isRead ? (
                                    <>
                                      <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                                      <span>Read</span>
                                    </>
                                  ) : isDelivered ? (
                                    <>
                                      <CheckCheck className="w-3 h-3 text-teal-600" />
                                      <span>Delivered</span>
                                    </>
                                  ) : isFailed ? (
                                    <>
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      <span>Failed</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3 text-slate-500" />
                                      <span>Sent</span>
                                    </>
                                  )}
                                </span>
                                {r.error_message && (
                                  <div className="text-[9px] text-rose-600 mt-0.5 max-w-[150px] truncate" title={r.error_message}>
                                    {r.error_message}
                                  </div>
                                )}
                              </td>

                              {/* Sent At */}
                              <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap text-[11px]">
                                {r.sent_at ? dateTime(r.sent_at) : "—"}
                              </td>

                              {/* Delivered At */}
                              <td className="px-3 py-2.5 text-teal-700 whitespace-nowrap text-[11px] font-medium">
                                {r.delivered_at ? dateTime(r.delivered_at) : (isDelivered ? "Delivered" : "—")}
                              </td>

                              {/* Read At */}
                              <td className="px-3 py-2.5 whitespace-nowrap text-[11px]">
                                {r.read_at ? (
                                  <span className="font-semibold text-sky-700 flex items-center gap-1">
                                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                    <span>{dateTime(r.read_at)}</span>
                                  </span>
                                ) : isRead ? (
                                  <span className="font-semibold text-sky-700 flex items-center gap-1">
                                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                    <span>Read</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono">—</span>
                                )}
                              </td>

                              {/* Action */}
                              <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                <Link
                                  to={r.lead_id ? `/whatsapp?lead=${r.lead_id}` : "/whatsapp"}
                                  onClick={onClose}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Chat</span>
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="pt-4 border-t border-slate-200/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            Campaign ID: #{detail?.id} • Audience: {detail?.total_recipients || 1} leads
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs rounded-xl px-4"
          >
            Close Cockpit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// AI Calling Sub-components (Preserved)
// ---------------------------------------------------------------------------

function CallingSettingsDialog({ onClose }) {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get("/settings/calling").then(r => setS(r.data)).catch(e => toast.error(errMsg(e)));
  }, []);
  async function save() {
    setSaving(true);
    try {
      await api.put("/settings/calling", s);
      toast.success("Calling settings updated");
      onClose();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }
  if (!s) return <DialogContent><div className="p-4">Loading…</div></DialogContent>;
  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-serif">Calling Settings</DialogTitle>
        <DialogDescription>Default pacing for all campaigns (per-campaign overrides allowed).</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Daily Call Limit" testid="settings-daily-limit"
          value={s.daily_call_limit}
          onChange={(v) => setS({ ...s, daily_call_limit: Number(v) || 0 })} />
        <NumberField label="Calls / Minute" testid="settings-cpm"
          value={s.calls_per_minute}
          onChange={(v) => setS({ ...s, calls_per_minute: Number(v) || 0 })} />
        <TimeField label="Start Time (IST)" testid="settings-start"
          value={s.start_time}
          onChange={(v) => setS({ ...s, start_time: v })} />
        <TimeField label="End Time (IST)" testid="settings-end"
          value={s.end_time}
          onChange={(v) => setS({ ...s, end_time: v })} />
      </div>
      <DialogFooter>
        <Button data-testid="settings-save-btn" disabled={saving} onClick={save}
                className="bg-indigo-700 hover:bg-indigo-800">
          Save Settings
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function NewCampaignDialog({ onSaved }) {
  const [form, setForm] = useState({
    name: "", description: "", campaign_prompt: "",
    source_type: "leads",
    status_filter: [], source_filter: [],
    daily_call_limit: null, calls_per_minute: null,
  });
  const [saving, setSaving] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);

  useEffect(() => {
    const spec = {
      status: form.status_filter.length ? form.status_filter : null,
      source: form.source_filter.length ? form.source_filter : null,
    };
    api.post("/campaigns/preview-leads", spec)
      .then(r => setPreviewCount(r.data.count))
      .catch(() => setPreviewCount(null));
  }, [form.status_filter, form.source_filter]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        campaign_prompt: form.campaign_prompt || null,
        source_type: form.source_type,
        filters: {
          status: form.status_filter.length ? form.status_filter : null,
          source: form.source_filter.length ? form.source_filter : null,
        },
        daily_call_limit: form.daily_call_limit ? Number(form.daily_call_limit) : null,
        calls_per_minute: form.calls_per_minute ? Number(form.calls_per_minute) : null,
      };
      await api.post("/campaigns", payload);
      toast.success("Campaign created");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="font-serif">New Calling Campaign</DialogTitle>
        <DialogDescription>Create an outbound campaign targeted by lead filters.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Campaign Name *</Label>
          <Input data-testid="new-camp-name" value={form.name}
                 onChange={e => setForm({ ...form, name: e.target.value })}
                 placeholder="e.g. Diwali Web Redesign Wave 1" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Input data-testid="new-camp-desc" value={form.description}
                 onChange={e => setForm({ ...form, description: e.target.value })}
                 placeholder="Optional notes" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Target Lead Status</Label>
          <MultiSelect options={STATUSES} selected={form.status_filter}
                       onChange={v => setForm({ ...form, status_filter: v })} />
        </div>
        <div>
          <Label className="text-xs">Target Lead Source</Label>
          <MultiSelect options={SOURCES} selected={form.source_filter}
                       onChange={v => setForm({ ...form, source_filter: v })} />
        </div>
        <div className="text-xs text-slate-500 bg-indigo-50/40 p-2 rounded border border-indigo-100 flex items-center justify-between">
          <span>Matching leads with phone:</span>
          <span className="font-semibold text-indigo-900" data-testid="preview-count">
            {previewCount ?? "…"}
          </span>
        </div>
        <div>
          <Label className="text-xs">Voice Prompt / Script</Label>
          <Textarea data-testid="new-camp-prompt" rows={4} value={form.campaign_prompt}
                    onChange={e => setForm({ ...form, campaign_prompt: e.target.value })}
                    placeholder="Instructions for the AI voice caller..." className="mt-1" />
        </div>
      </div>
      <DialogFooter>
        <Button data-testid="new-camp-save" disabled={saving || !form.name.trim()} onClick={save}
                className="bg-indigo-700 hover:bg-indigo-800">
          Create Campaign
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function MultiSelect({ options, selected, onChange }) {
  function toggle(o) {
    if (selected.includes(o)) onChange(selected.filter(x => x !== o));
    else onChange([...selected, o]);
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {options.map(o => {
        const on = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => toggle(o)}
                  className={`text-xs px-2 py-0.5 rounded border ${
                    on ? "bg-indigo-700 text-white border-indigo-700"
                       : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function NumberField({ label, value, onChange, testid }) {
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input data-testid={testid} type="number" value={value ?? ""}
             onChange={e => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}

function TimeField({ label, value, onChange, testid }) {
  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input data-testid={testid} type="time" value={value ?? ""}
             onChange={e => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
