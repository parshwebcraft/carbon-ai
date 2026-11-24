import { useState, useEffect } from "react";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  Sparkles,
  Users,
  CheckCheck,
  MousePointerClick,
  ExternalLink,
  FileText,
  Clock,
  Filter,
  Check,
  Plus,
  Trash2,
  FileSpreadsheet,
  Upload,
  Download,
} from "lucide-react";

const BROADCAST_PRESETS = [
  {
    name: "Website Redesign Offer",
    campaignName: "Website Redesign 25% Off Wave",
    body: "Hi {{name}}! 👋 Parsh Web Craft is offering an exclusive 25% discount on custom high-speed website development & redesign this month.\n\nWould you like a complimentary 5-minute UI mockup for your business?",
    ctaType: "button",
    buttons: [
      { id: "btn_mockup", title: "🎨 Yes, Send Mockup" },
      { id: "btn_pricing", title: "📑 View Packages" },
      { id: "btn_call", title: "📅 Book Quick Call" },
    ],
  },
  {
    name: "AI WhatsApp Bot Launch",
    campaignName: "WhatsApp AI Sales Bot Announcement",
    body: "Hello {{name}}! 🚀 We just launched our 24/7 AI Sales Bot for WhatsApp that qualifies customer inquiries, shares PDF quotes, and books appointments autonomously.\n\nWould you like a live 2-minute WhatsApp demo?",
    ctaType: "button",
    buttons: [
      { id: "btn_demo", title: "🤖 Try Live Demo" },
      { id: "btn_call", title: "📅 Schedule Demo" },
      { id: "btn_human", title: "👤 Talk to Team" },
    ],
  },
  {
    name: "Cold Lead Re-engagement",
    campaignName: "Pipeline Re-engagement Check-in",
    body: "Hi {{name}}, checking in from Parsh Web Craft regarding your website and digital engineering project.\n\nAre you still looking to launch in the coming weeks? Let us know if we can share an updated timeline or proposal!",
    ctaType: "button",
    buttons: [
      { id: "btn_active", title: "✅ Yes, Interested" },
      { id: "btn_later", title: "⏳ Later this month" },
      { id: "btn_call", title: "📞 Call Me" },
    ],
  },
  {
    name: "Agency Portfolio & Work",
    campaignName: "Live Portfolio Showcase",
    body: "Hi {{name}}! Check out our recent client deliverables, live production web apps, and modern UI case studies.",
    ctaType: "cta_url",
    ctaDisplayText: "🌐 View Live Portfolio",
    ctaUrl: "https://parshwebcraft.com",
    buttons: [],
  },
  {
    name: "Cold Leads Outside 24h (Meta Template)",
    campaignName: "Meta Official Hello World Template",
    body: "template:hello_world",
    ctaType: "template",
    buttons: [],
  },
];

const STATUS_OPTIONS = [
  "Prospect",
  "Qualified",
  "New",
  "Contacted",
  "Follow Up",
  "Interested",
  "Proposal Requested",
  "Won",
  "Lost",
];

const SOURCE_OPTIONS = [
  "WhatsApp",
  "Website",
  "Instagram",
  "Facebook",
  "Referral",
  "Google Ads",
];

export default function WhatsAppBroadcastModal({
  open,
  onOpenChange,
  preselectedLeadIds = [],
  initialTargetMode = null,
  onSuccess,
}) {
  const [campaignName, setCampaignName] = useState("Parsh Web Craft Broadcast");
  const [targetMode, setTargetMode] = useState(() => {
    if (initialTargetMode) return initialTargetMode;
    if (preselectedLeadIds && preselectedLeadIds.length > 0) return "selected";
    return "excel"; // Default to Excel upload for easy discoverability!
  });

  useEffect(() => {
    if (initialTargetMode) {
      setTargetMode(initialTargetMode);
    } else if (preselectedLeadIds && preselectedLeadIds.length > 0) {
      setTargetMode("selected");
    }
  }, [initialTargetMode, preselectedLeadIds, open]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);

  const [messageBody, setMessageBody] = useState(
    "Hi {{name}}! 👋 Thanks for connecting with Parsh Web Craft. We are excited to share our latest high-performance website and AI automation solutions with you."
  );

  const [ctaType, setCtaType] = useState("button"); // none | button | cta_url | template
  const [quickButtons, setQuickButtons] = useState([
    { id: "btn_call", title: "📅 Book a Call" },
    { id: "btn_proposal", title: "📑 Get Proposal" },
    { id: "btn_human", title: "👤 Talk to Human" },
  ]);

  const [ctaDisplayText, setCtaDisplayText] = useState("🌐 View Portfolio");
  const [ctaUrl, setCtaUrl] = useState("https://parshwebcraft.com");

  // Meta Approved Templates state
  const [approvedTemplates, setApprovedTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVariables, setTemplateVariables] = useState({});

  const [attachBrochure, setAttachBrochure] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(3);

  const [audienceCount, setAudienceCount] = useState(0);
  const [previewSample, setPreviewSample] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Excel / CSV Bulk Upload state
  const [excelFile, setExcelFile] = useState(null);
  const [excelParsing, setExcelParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [saveToLeads, setSaveToLeads] = useState(true);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setExcelParsing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/whatsapp/broadcasts/parse-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setParsedData(res.data);
      toast.success(`✅ Parsed ${res.data.valid_count} valid contacts from ${file.name}`);
    } catch (err) {
      toast.error(errMsg(err, "Failed to parse Excel/CSV file"));
      setParsedData(null);
    } finally {
      setExcelParsing(false);
    }
  }

  async function downloadSample(fmt = "xlsx") {
    try {
      const res = await api.get(`/whatsapp/broadcasts/sample-template?format=${fmt}`, { responseType: "blob" });
      const mime =
        fmt === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv";
      const filename =
        fmt === "xlsx" ? "ParshAgent_Broadcast_Sample.xlsx" : "ParshAgent_Broadcast_Sample.csv";
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mime }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success(`Downloaded ${filename}`);
    } catch (e) {
      toast.error("Failed to download sample template");
    }
  }

  // Load approved templates
  useEffect(() => {
    if (!open) return;
    api
      .get("/growth/meta-templates")
      .then((res) => {
        const list = res.data || [];
        setApprovedTemplates(list);
        if (list.length > 0 && !selectedTemplate) {
          const firstApproved = list.find((t) => t.status === "APPROVED") || list[0];
          setSelectedTemplate(firstApproved);
          initTemplateVars(firstApproved);
        }
      })
      .catch(() => {});
  }, [open]);

  function initTemplateVars(tmpl) {
    if (!tmpl || !tmpl.body_text) return;
    const matches = tmpl.body_text.match(/\{\{(\d+)\}\}/g) || [];
    const vars = {};
    matches.forEach((m) => {
      const idx = m.replace(/[{}]/g, "");
      if (idx === "1") vars[idx] = "{{name}}";
      else vars[idx] = tmpl.sample_values?.[parseInt(idx, 10) - 1] || `Param ${idx}`;
    });
    setTemplateVariables(vars);
  }


  useEffect(() => {
    if (preselectedLeadIds && preselectedLeadIds.length > 0) {
      setTargetMode("selected");
    } else {
      setTargetMode("all");
    }
  }, [preselectedLeadIds]);

  // Fetch live audience preview
  useEffect(() => {
    if (!open) return;

    let leadIdsParam = null;
    let statusParam = null;
    let sourceParam = null;

    if (targetMode === "selected") {
      leadIdsParam = preselectedLeadIds;
    } else if (targetMode === "filter") {
      statusParam = selectedStatuses.length > 0 ? selectedStatuses.join(",") : null;
      sourceParam = selectedSources.length > 0 ? selectedSources.join(",") : null;
    }

    setPreviewLoading(true);
    api
      .post("/whatsapp/broadcasts/preview-audience", {
        lead_ids: leadIdsParam,
        filter_status: statusParam,
        filter_source: sourceParam,
      })
      .then((res) => {
        setAudienceCount(res.data.count || 0);
        setPreviewSample(res.data.sample || []);
      })
      .catch(() => {
        setAudienceCount(0);
      })
      .finally(() => {
        setPreviewLoading(false);
      });
  }, [open, targetMode, selectedStatuses, selectedSources, preselectedLeadIds]);

  function applyPreset(p) {
    setCampaignName(p.campaignName);
    setMessageBody(p.body);
    setCtaType(p.ctaType);
    if (p.ctaType === "button" && p.buttons) {
      setQuickButtons(p.buttons.map((b) => ({ ...b })));
    }
    if (p.ctaType === "cta_url") {
      setCtaDisplayText(p.ctaDisplayText || "Open Link");
      setCtaUrl(p.ctaUrl || "https://parshwebcraft.com");
    }
    if (p.ctaType === "template") {
      const tmplName = p.body.replace("template:", "").trim();
      const matched = approvedTemplates.find((t) => t.name === tmplName) || approvedTemplates[0];
      if (matched) {
        setSelectedTemplate(matched);
        initTemplateVars(matched);
      }
    }
  }


  function insertVariable(v) {
    setMessageBody((prev) => prev + ` ${v} `);
  }

  function toggleStatusFilter(s) {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  }

  function toggleSourceFilter(s) {
    setSelectedSources((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  }

  async function handleSendBroadcast() {
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }
    if (!messageBody.trim()) {
      toast.error("Message body cannot be empty");
      return;
    }
    if (audienceCount === 0) {
      toast.error("No active leads found for this target audience");
      return;
    }

    setSubmitting(true);
    try {
      let buttonsPayload = null;
      let interactiveType = null;
      let outMessageTemplate = messageBody.trim();

      if (ctaType === "button" && quickButtons.length > 0) {
        buttonsPayload = quickButtons.map((b, i) => ({
          id: b.id || `btn_${i + 1}`,
          title: b.title.slice(0, 20),
        }));
        interactiveType = "button";
      } else if (ctaType === "cta_url") {
        buttonsPayload = [
          {
            display_text: ctaDisplayText.trim().slice(0, 20),
            url: ctaUrl.trim(),
            header: "Parsh Web Craft",
            footer: "Instant Connect",
          },
        ];
        interactiveType = "cta_url";
      } else if (ctaType === "template" && selectedTemplate) {
        interactiveType = "template";
        outMessageTemplate = `template:${selectedTemplate.name}`;
        buttonsPayload = {
          template_name: selectedTemplate.name,
          language: selectedTemplate.language || "en_US",
          variables: templateVariables,
        };
      }

      let mediaUrl = null;
      let mediaType = null;
      let mediaFilename = null;
      if (attachBrochure) {
        mediaUrl = "https://parshagent.com/uploads/brochures/ParshWebCraft_Services_Overview.pdf";
        mediaType = "document";
        mediaFilename = "ParshWebCraft_Services_Overview.pdf";
      }

      let leadIdsParam = null;
      let statusParam = null;
      let sourceParam = null;

      if (targetMode === "excel") {
        if (!parsedData || !parsedData.recipients || parsedData.recipients.length === 0) {
          toast.error("Please upload an Excel or CSV file with valid contacts first.");
          setSubmitting(false);
          return;
        }

        const res = await api.post("/whatsapp/broadcasts/import-and-launch", {
          name: campaignName.trim(),
          message_template: outMessageTemplate,
          recipients: parsedData.recipients,
          media_url: mediaUrl,
          media_type: mediaType,
          media_filename: mediaFilename,
          buttons: buttonsPayload,
          interactive_type: interactiveType,
          delay_seconds: parseInt(delaySeconds, 10) || 3,
          save_to_leads: saveToLeads,
        });

        if (res.data?.ok) {
          toast.success(
            `🚀 Broadcast '${campaignName}' launched for ${res.data.total_recipients} Excel recipients!`
          );
          onOpenChange(false);
          if (onSuccess) onSuccess();
        }
        return;
      }

      if (targetMode === "selected") {
        leadIdsParam = preselectedLeadIds;
      } else if (targetMode === "filter") {
        statusParam = selectedStatuses.length > 0 ? selectedStatuses.join(",") : null;
        sourceParam = selectedSources.length > 0 ? selectedSources.join(",") : null;
      }

      const res = await api.post("/whatsapp/broadcasts", {
        name: campaignName.trim(),
        message_template: outMessageTemplate,
        lead_ids: leadIdsParam,
        filter_status: statusParam,
        filter_source: sourceParam,
        media_url: mediaUrl,
        media_type: mediaType,
        media_filename: mediaFilename,
        buttons: buttonsPayload,
        interactive_type: interactiveType,
        delay_seconds: parseInt(delaySeconds, 10) || 3,
      });

      if (res.data?.ok) {
        toast.success(
          `🚀 Broadcast '${campaignName}' launched for ${res.data.total_recipients} recipients!`
        );
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to launch WhatsApp Broadcast"));
    } finally {
      setSubmitting(false);
    }
  }

  // Preview formatted text with dynamic sample lead
  const sampleLeadName =
    targetMode === "excel" && parsedData?.sample?.[0]?.name
      ? parsedData.sample[0].name
      : "Gauransh";

  let previewRenderedText = messageBody;
  if (ctaType === "template" && selectedTemplate) {
    let tText = selectedTemplate.body_text || "";
    Object.keys(templateVariables).forEach((k) => {
      let val = templateVariables[k];
      if (val === "{{name}}") val = sampleLeadName;
      else if (val === "{{phone}}") val = "+91 84420 97839";
      else if (val === "{{company}}") val = "Parsh Web Craft";
      else if (val === "{{city}}") val = "Jaipur";
      tText = tText.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), val || `[Param ${k}]`);
    });
    previewRenderedText = tText;
  } else {
    previewRenderedText = messageBody
      .replace(/{{name}}/g, sampleLeadName)
      .replace(/{{phone}}/g, "+91 84420 97839")
      .replace(/{{company}}/g, "Parsh Web Craft")
      .replace(/{{city}}/g, "Jaipur");
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-serif">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Send className="w-5 h-5" />
            </span>
            <span>Bulk WhatsApp Broadcast & Retargeting Engine</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1 text-slate-800">
          {/* Quick 1-Click Ready Templates */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Select Ready 1-Click Broadcast Template</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Meta Anti-Ban Safe Pacing Enabled
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {BROADCAST_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-xs font-medium transition-all shadow-2xs hover:scale-[1.01]"
                >
                  ⚡ {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 border-t border-slate-100 pt-3">
            {/* Left Column: Form Controls (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              {/* Campaign Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Campaign Title *
                </label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Website Redesign 25% Off Wave 1"
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              {/* Target Audience Selector */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Target Audience Source *</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Step 1: Choose Contacts Source
                  </span>
                </div>

                {/* 2 Big Visible Source Segment Tabs */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTargetMode(preselectedLeadIds.length > 0 ? "selected" : "all")}
                    className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      targetMode !== "excel"
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>👥 From CRM Leads</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetMode("excel")}
                    className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      targetMode === "excel"
                        ? "bg-emerald-600 text-white shadow-sm font-bold ring-2 ring-emerald-500/30"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>📁 Upload Excel / CSV Sheet</span>
                  </button>
                </div>

                {/* Sub-selector when CRM Leads is active */}
                {targetMode !== "excel" && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-slate-500 font-medium mr-1">Filter:</span>
                    {preselectedLeadIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setTargetMode("selected")}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
                          targetMode === "selected"
                            ? "bg-emerald-600 text-white"
                            : "bg-white border text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Selected Leads ({preselectedLeadIds.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setTargetMode("all")}
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
                        targetMode === "all"
                          ? "bg-emerald-600 text-white"
                          : "bg-white border text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      All Leads in CRM
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetMode("filter")}
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
                        targetMode === "filter"
                          ? "bg-emerald-600 text-white"
                          : "bg-white border text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Filter by Tag / Pipeline Status
                    </button>
                  </div>
                )}

                {/* Excel / CSV Upload Section */}
                {targetMode === "excel" && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/80">
                    {/* Columns explanation alert box */}
                    <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                          <span>Spreadsheet Columns Required</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => downloadSample("xlsx")}
                            className="text-[11px] bg-white hover:bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs flex items-center gap-1 transition"
                            title="Download Sample Excel (.xlsx) file"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Demo Excel (.xlsx)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadSample("csv")}
                            className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline underline-offset-2 flex items-center gap-1"
                            title="Download Sample CSV file"
                          >
                            <span>CSV</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] text-emerald-800 leading-relaxed">
                        <b>Required Columns:</b> <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-emerald-950">Name</code>, <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-emerald-950">Phone</code> (or Mobile/WhatsApp)
                        <br />
                        <b>Optional Columns:</b> <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-emerald-900">City</code>, <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-emerald-900">Company</code>
                      </div>
                    </div>

                    {/* File Dropzone */}
                    <div className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-white rounded-2xl p-4 text-center transition-colors shadow-2xs">
                      <input
                        type="file"
                        id="excel-broadcast-upload"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <label
                        htmlFor="excel-broadcast-upload"
                        className="cursor-pointer flex flex-col items-center justify-center gap-2"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                          {excelParsing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Upload className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {excelFile ? excelFile.name : "Click here to choose your Excel (.xlsx) or CSV file"}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Supports Microsoft Excel (.xlsx, .xls) and standard CSV sheets
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Parsed Summary & Preview */}
                    {parsedData && (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>{parsedData.valid_count} Valid WhatsApp Contacts</span>
                            </span>
                            {parsedData.invalid_count > 0 && (
                              <span className="text-slate-500 text-[11px]">
                                ({parsedData.invalid_count} duplicates/empty skipped)
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {parsedData.filename}
                          </span>
                        </div>

                        {/* Sample Rows Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto text-[11px]">
                          <table className="w-full">
                            <thead className="bg-slate-100 text-slate-600 sticky top-0">
                              <tr>
                                <th className="text-left px-2.5 py-1.5 font-semibold">Name</th>
                                <th className="text-left px-2.5 py-1.5 font-semibold">WhatsApp Phone</th>
                                <th className="text-left px-2.5 py-1.5 font-semibold">City</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {parsedData.sample.map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-2.5 py-1.5 font-medium text-slate-800 truncate max-w-[120px]">
                                    {s.name}
                                  </td>
                                  <td className="px-2.5 py-1.5 font-mono text-emerald-700 font-semibold">
                                    {s.phone}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-500">{s.city || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Save to CRM Leads Checkbox */}
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-0.5">
                          <input
                            type="checkbox"
                            checked={saveToLeads}
                            onChange={(e) => setSaveToLeads(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                          />
                          <span>Save new contacts into CRM Leads (Source: Excel Import)</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Filter Options */}
                {targetMode === "filter" && (
                  <div className="space-y-2 pt-1 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                        Filter by Pipeline Status:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {STATUS_OPTIONS.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => toggleStatusFilter(st)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                              selectedStatuses.includes(st)
                                ? "bg-emerald-700 text-white"
                                : "bg-white border text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {selectedStatuses.includes(st) && "✓ "}
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                        Filter by Lead Source:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {SOURCE_OPTIONS.map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => toggleSourceFilter(sc)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                              selectedSources.includes(sc)
                                ? "bg-indigo-700 text-white"
                                : "bg-white border text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {selectedSources.includes(sc) && "✓ "}
                            {sc}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audience Count Banner */}
                <div className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    {previewLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                    )}
                    <span>
                      {previewLoading ? "Calculating audience..." : "Eligible Recipients:"}
                    </span>
                  </span>
                  <span className="font-bold text-emerald-700 text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {targetMode === "excel"
                      ? `${parsedData?.valid_count || 0} Contacts from File`
                      : `${audienceCount} Leads with Phone`}
                  </span>
                </div>
              </div>

              {/* Message Composer & Variable Chips */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Personalized Message *
                  </label>
                  <span
                    className={`text-[10px] ${
                      messageBody.length > 950 ? "text-rose-600 font-bold" : "text-slate-400"
                    }`}
                  >
                    {messageBody.length}/1024 chars
                  </span>
                </div>

                {/* Dynamic Variable Chips */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] text-slate-500 font-semibold">Insert:</span>
                  {["{{name}}", "{{phone}}", "{{company}}", "{{city}}"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono border border-slate-300 transition-colors"
                      title={`Click to insert ${v}`}
                    >
                      + {v}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value.slice(0, 1024))}
                  placeholder="Enter message text with {{name}} for dynamic personalization..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-sans"
                />
              </div>

              {/* Interactive CTA Option */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Campaign Mode / CTA Option
                  </label>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {[
                      { id: "none", label: "None" },
                      { id: "button", label: "Quick-Reply" },
                      { id: "cta_url", label: "CTA Link" },
                      { id: "template", label: "⚡ Meta Approved Template" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setCtaType(opt.id);
                          if (opt.id === "template" && approvedTemplates.length > 0 && !selectedTemplate) {
                            const firstApproved = approvedTemplates.find((t) => t.status === "APPROVED") || approvedTemplates[0];
                            setSelectedTemplate(firstApproved);
                            initTemplateVars(firstApproved);
                            setMessageBody(`template:${firstApproved.name}`);
                          }
                        }}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                          ctaType === opt.id
                            ? opt.id === "template"
                              ? "bg-emerald-700 text-white shadow-xs font-semibold"
                              : "bg-slate-800 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {ctaType === "template" && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-emerald-950 font-semibold block">
                        Select Meta Approved Template:
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-medium">
                        Bypasses 24-hr customer window
                      </span>
                    </div>

                    <select
                      value={selectedTemplate?.id || ""}
                      onChange={(e) => {
                        const found = approvedTemplates.find((t) => String(t.id) === e.target.value);
                        if (found) {
                          setSelectedTemplate(found);
                          initTemplateVars(found);
                          setMessageBody(`template:${found.name}`);
                        }
                      }}
                      className="w-full text-xs h-8 rounded-lg border border-emerald-300 bg-white text-slate-800 px-2 font-mono"
                    >
                      {approvedTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.category || "UTILITY"} • {t.status})
                        </option>
                      ))}
                    </select>

                    {selectedTemplate && (
                      <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                        <div className="text-[10px] text-slate-600 bg-white/80 p-2 rounded-lg border border-emerald-100 font-sans">
                          <strong className="text-emerald-900">Template Text:</strong> {selectedTemplate.body_text}
                        </div>

                        {/* Dynamic Parameter Mappings */}
                        {Object.keys(templateVariables).length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-semibold text-emerald-950 block">
                              Map Dynamic Template Variables:
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {Object.keys(templateVariables).map((vIdx) => (
                                <div key={vIdx} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-mono text-emerald-800 font-semibold">{`{{${vIdx}}}`}</span>
                                    <span className="text-[9px] text-slate-400">Value for recipient</span>
                                  </div>
                                  <Input
                                    value={templateVariables[vIdx] || ""}
                                    onChange={(e) =>
                                      setTemplateVariables((prev) => ({ ...prev, [vIdx]: e.target.value }))
                                    }
                                    placeholder={`e.g. {{name}} or custom`}
                                    className="h-7 text-xs bg-white rounded-lg"
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-slate-500 pt-0.5">
                              <span>Quick tag:</span>
                              <button
                                type="button"
                                onClick={() => setTemplateVariables((prev) => ({ ...prev, "1": "{{name}}" }))}
                                className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-700 hover:bg-slate-50"
                              >
                                Set Param 1 as {`{{name}}`}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-emerald-800 pt-1">
                          <span>
                            Category: <strong>{selectedTemplate.category || "UTILITY"}</strong> ({selectedTemplate.category === "MARKETING" ? "~₹0.80" : "~₹0.15"} / msg)
                          </span>
                          <span>Status: <strong className="text-emerald-700">{selectedTemplate.status}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {ctaType === "button" && (
                  <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1.5">
                    <span className="text-[10px] text-purple-900 font-semibold block mb-1">
                      Quick-Reply Buttons (max 3, max 20 chars each):
                    </span>
                    {quickButtons.map((btn, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400 w-3">
                          {idx + 1}.
                        </span>
                        <Input
                          value={btn.title}
                          onChange={(e) =>
                            setQuickButtons((prev) =>
                              prev.map((b, i) =>
                                i === idx ? { ...b, title: e.target.value.slice(0, 20) } : b
                              )
                            )
                          }
                          className="h-7 text-xs rounded-lg flex-1"
                          placeholder="Button label"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {ctaType === "cta_url" && (
                  <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-amber-900 font-semibold block mb-1">
                        Button Display Text (max 20)
                      </span>
                      <Input
                        value={ctaDisplayText}
                        onChange={(e) => setCtaDisplayText(e.target.value.slice(0, 20))}
                        className="h-7 text-xs rounded-lg"
                        placeholder="🌐 View Portfolio"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-900 font-semibold block mb-1">
                        Target URL
                      </span>
                      <Input
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        className="h-7 text-xs rounded-lg font-mono"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Attachments & Anti-Ban Pacing Settings */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={attachBrochure}
                    onChange={(e) => setAttachBrochure(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-[11px] leading-tight">
                    <span className="font-semibold block text-slate-800">Attach Agency PDF</span>
                    <span className="text-[10px] text-slate-500">ParshWebCraft Overview</span>
                  </div>
                </label>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    <span>Anti-Ban Pacing Delay</span>
                  </label>
                  <select
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="w-full h-8 text-xs px-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={2}>2s / message (Fast)</option>
                    <option value={3}>3s / message (Recommended Safe)</option>
                    <option value={5}>5s / message (Ultra Safe Pacing)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Live Mobile Preview Screen (5 cols) */}
            <div className="md:col-span-5 bg-slate-100/70 p-3 rounded-2xl border border-slate-200 flex flex-col items-center justify-start">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 self-start">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Customer WhatsApp Screen Preview</span>
              </div>

              <div className="w-full max-w-[280px] bg-[#e5ddd5] rounded-2xl shadow-md border border-slate-300 overflow-hidden text-left">
                {/* WhatsApp header */}
                <div className="bg-[#075e54] text-white px-3 py-2 flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-300" />
                    <span className="truncate">Parsh Web Craft</span>
                  </div>
                  <span className="text-[10px] opacity-75">18:40</span>
                </div>

                {/* Message Bubble Preview */}
                <div className="p-3">
                  <div className="bg-[#d9fdd3] rounded-2xl rounded-tr-xs p-3 text-slate-900 shadow-xs border border-emerald-100 space-y-2">
                    {/* Attached Brochure Card */}
                    {attachBrochure && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-emerald-200 text-slate-800 text-[11px]">
                        <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="font-semibold truncate">ParshWebCraft_Services.pdf</span>
                      </div>
                    )}

                    {/* Rendered Text */}
                    <div className="text-xs whitespace-pre-wrap leading-relaxed text-slate-800">
                      {previewRenderedText}
                    </div>

                    {/* Quick Reply Buttons */}
                    {ctaType === "button" && quickButtons.length > 0 && (
                      <div className="pt-2 border-t border-emerald-300/40 space-y-1">
                        {quickButtons.map((b, i) => (
                          <div
                            key={i}
                            className="w-full py-1.5 px-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <MousePointerClick className="w-3 h-3 text-emerald-600" />
                            <span className="truncate">{b.title}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CTA Link Button */}
                    {ctaType === "cta_url" && (
                      <div className="pt-2 border-t border-emerald-300/40">
                        <div className="w-full py-1.5 px-2 rounded-lg bg-white border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs">
                          <ExternalLink className="w-3 h-3 text-amber-600" />
                          <span className="truncate">{ctaDisplayText || "Open Link"}</span>
                        </div>
                      </div>
                    )}

                    {/* Template Buttons Preview */}
                    {ctaType === "template" && selectedTemplate?.buttons && selectedTemplate.buttons.length > 0 && (
                      <div className="pt-2 border-t border-emerald-300/40 space-y-1">
                        {selectedTemplate.buttons.map((b, i) => (
                          <div
                            key={i}
                            className="w-full py-1.5 px-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <MousePointerClick className="w-3 h-3 text-emerald-600" />
                            <span className="truncate">{b.text}</span>
                          </div>
                        ))}
                      </div>
                    )}


                    <div className="text-[9px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                      <span>18:40</span>
                      <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 mt-2 text-center">
                Preview renders with dynamic sample lead: <b>{sampleLeadName}</b>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs rounded-xl"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSendBroadcast}
            disabled={
              submitting ||
              (targetMode === "excel" ? !(parsedData?.valid_count > 0) : audienceCount === 0) ||
              !messageBody.trim()
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 rounded-xl gap-2 shadow-2xs font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Launching Broadcast…</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  Launch WhatsApp Broadcast (
                  {targetMode === "excel" ? parsedData?.valid_count || 0 : audienceCount}{" "}
                  Leads)
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
