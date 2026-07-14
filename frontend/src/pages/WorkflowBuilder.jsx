import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Play, Plus, Trash2, ArrowDown, Sparkles, AlertCircle, Info, ChevronLeft, Save, HelpCircle,
} from "lucide-react";

const TRIGGERS = [
  { value: "lead_created", label: "Lead Created", desc: "Triggers when a new lead is added manually or via API" },
  { value: "task_overdue", label: "Task Overdue", desc: "Triggers when an open task passes its due date" },
  { value: "whatsapp_inbound", label: "WhatsApp Message Received", desc: "Triggers when an inbound WhatsApp text is received" },
  { value: "appointment_created", label: "Appointment Booked", desc: "Triggers when a new customer appointment is registered" },
  { value: "quotation_generated", label: "Quotation Generated", desc: "Triggers when a new price quotation is generated" },
];

const ACTION_TYPES = [
  { value: "send_whatsapp", label: "Send WhatsApp", desc: "Send an automated WhatsApp text to the contact" },
  { value: "send_email", label: "Send Email", desc: "Dispatch a custom SMTP email to the contact" },
  { value: "notify_manager", label: "Notify Manager", desc: "Send a system notification alert to CRM managers" },
  { value: "create_task", label: "Create Follow-up Task", desc: "Generate a new task inside the database" },
  { value: "webhook", label: "Trigger HTTP Webhook", desc: "Send a POST/GET API payload to an external URL" },
  { value: "delay", label: "Delay Wait Step", desc: "Wait for a specified duration before executing next step" },
];

const CONTEXT_VARS = {
  lead_created: ["lead_id", "name", "phone", "email", "company", "city", "customer_type", "budget", "source"],
  task_overdue: ["task_id", "title", "description", "priority", "due_date", "lead_name", "lead_phone"],
  whatsapp_inbound: ["message", "lead_id", "lead_name", "lead_phone"],
  appointment_created: ["appt_id", "customer_name", "appointment_date", "showroom_visit", "notes"],
  quotation_generated: ["quote_id", "quotation_number", "amount", "status", "lead_name", "lead_phone", "lead_email"],
};

export default function WorkflowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("lead_created");
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) {
      toast.error("Please enter an AI prompt description first.");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await api.post("/automation/generate-ai-workflow", { prompt: aiPrompt });
      if (res.data.name) setName(res.data.name);
      if (res.data.trigger_type) setTriggerType(res.data.trigger_type);
      if (res.data.actions) {
        const acts = typeof res.data.actions === "string" ? JSON.parse(res.data.actions) : res.data.actions;
        setActions(acts || []);
      }
      toast.success("AI Copilot has generated the workflow steps!");
      setAiPrompt("");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setAiGenerating(false);
    }
  }

  useEffect(() => {
    if (!id) {
      // Setup a default initial step for a new workflow
      setName("New Custom Workflow");
      setActions([{ type: "send_whatsapp", to_number: "{{phone}}", message_body: "Hi {{name}}, thank you for reaching out!" }]);
      return;
    }
    
    setLoading(true);
    api.get(`/automation/workflows`)
      .then(r => {
        const found = r.data.find(w => w.id === Number(id));
        if (found) {
          setName(found.name);
          setTriggerType(found.trigger_type);
          try {
            setActions(JSON.parse(found.actions) || []);
          } catch {
            setActions([]);
          }
        } else {
          toast.error("Workflow not found.");
          navigate("/automation");
        }
      })
      .catch(e => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  function addStep() {
    setActions(prev => [
      ...prev,
      { type: "send_whatsapp", to_number: "{{phone}}", message_body: "" }
    ]);
  }

  function removeStep(index) {
    setActions(prev => prev.filter((_, i) => i !== index));
  }

  function updateAction(index, fields) {
    setActions(prev => prev.map((act, i) => i === index ? { ...act, ...fields } : act));
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Workflow name is required.");
      return;
    }
    if (actions.length === 0) {
      toast.error("Please add at least one Action step.");
      return;
    }

    setSaving(true);
    const payload = {
      name,
      trigger_type: triggerType,
      actions: JSON.stringify(actions),
      enabled: true,
    };

    try {
      if (id) {
        await api.put(`/automation/workflows/${id}`, payload);
        toast.success("Workflow updated successfully!");
      } else {
        await api.post("/automation/workflows", payload);
        toast.success("Workflow created successfully!");
      }
      navigate("/automation");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  const vars = CONTEXT_VARS[triggerType] || [];

  return (
    <div data-testid="workflow-builder" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-50 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/automation" className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-serif text-3xl">{id ? "Edit Workflow" : "Create Workflow"}</h1>
            <p className="text-xs text-slate-500">Design your automated sequence of conditional triggers and tasks.</p>
          </div>
        </div>

        <Button className="bg-indigo-700 hover:bg-indigo-800 text-white gap-1.5" disabled={saving} onClick={handleSave}>
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save Workflow"}
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">Loading Builder Workspace…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Builder area */}
          <div className="space-y-5">
            {/* General Info & Trigger */}
            <Card className="p-5 bg-white border-indigo-100 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-600">Workflow Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lead Auto WhatsApp Followup" />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Trigger Event</Label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-lg bg-indigo-50/50 p-3 border border-indigo-50 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600">
                  {TRIGGERS.find(t => t.value === triggerType)?.desc}
                </p>
              </div>
            </Card>

            {/* Downward Line connector */}
            <div className="flex justify-center">
              <ArrowDown className="h-6 w-6 text-indigo-300" />
            </div>

            {/* Actions list */}
            <div className="space-y-4">
              {actions.map((action, index) => (
                <div key={index} className="space-y-4">
                  <Card className="p-5 bg-white border-indigo-100 relative group">
                    <button 
                      onClick={() => removeStep(index)}
                      className="absolute top-4 right-4 p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove Step"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs">
                          {index + 1}
                        </div>
                        <h4 className="font-semibold text-sm text-slate-800">Action Step</h4>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                          <Label className="text-xs text-slate-600">Action Type</Label>
                          <Select 
                            value={action.type} 
                            onValueChange={val => updateAction(index, { type: val })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Render fields dynamically depending on type */}
                      {action.type === "send_whatsapp" && (
                        <div className="grid gap-3 pt-2">
                          <div>
                            <Label className="text-xs text-slate-600">Recipient Phone Number (Use tags like `{"{{phone}}"}`)</Label>
                            <Input value={action.to_number || ""} onChange={e => updateAction(index, { to_number: e.target.value })} placeholder="{{phone}}" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">Message Template Body</Label>
                            <textarea 
                              rows={3} 
                              className="w-full text-sm p-3 border border-indigo-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={action.message_body || ""} 
                              onChange={e => updateAction(index, { message_body: e.target.value })} 
                              placeholder="Type WhatsApp template content..."
                            />
                          </div>
                        </div>
                      )}

                      {action.type === "send_email" && (
                        <div className="grid gap-3 pt-2">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-slate-600">Recipient Email Address</Label>
                              <Input value={action.recipient || ""} onChange={e => updateAction(index, { recipient: e.target.value })} placeholder="{{email}}" />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Subject Line</Label>
                              <Input value={action.subject || ""} onChange={e => updateAction(index, { subject: e.target.value })} placeholder="Subject" />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">Email Body Plain Text</Label>
                            <textarea 
                              rows={3} 
                              className="w-full text-sm p-3 border border-indigo-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={action.body || ""} 
                              onChange={e => updateAction(index, { body: e.target.value })} 
                              placeholder="Type email body content..."
                            />
                          </div>
                        </div>
                      )}

                      {action.type === "notify_manager" && (
                        <div className="grid gap-3 pt-2">
                          <div>
                            <Label className="text-xs text-slate-600">Notification Title</Label>
                            <Input value={action.title || ""} onChange={e => updateAction(index, { title: e.target.value })} placeholder="e.g. Lead Assigned Alert" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">Notification Text Message</Label>
                            <Input value={action.message || ""} onChange={e => updateAction(index, { message: e.target.value })} placeholder="e.g. A new high budget lead {{name}} has arrived!" />
                          </div>
                        </div>
                      )}

                      {action.type === "create_task" && (
                        <div className="grid gap-3 pt-2">
                          <div className="grid sm:grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <Label className="text-xs text-slate-600">Task Title</Label>
                              <Input value={action.title || ""} onChange={e => updateAction(index, { title: e.target.value })} placeholder="Task title" />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Due in (Days)</Label>
                              <Input type="number" value={action.due_in_days || 2} onChange={e => updateAction(index, { due_in_days: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">Task Description</Label>
                            <Input value={action.description || ""} onChange={e => updateAction(index, { description: e.target.value })} placeholder="Task description text..." />
                          </div>
                        </div>
                      )}

                      {action.type === "webhook" && (
                        <div className="grid sm:grid-cols-4 gap-3 pt-2 items-end">
                          <div className="sm:col-span-3">
                            <Label className="text-xs text-slate-600">HTTP Webhook URL</Label>
                            <Input value={action.url || ""} onChange={e => updateAction(index, { url: e.target.value })} placeholder="https://api.yourdomain.com/hooks" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">HTTP Method</Label>
                            <Select 
                              value={action.method || "POST"} 
                              onValueChange={val => updateAction(index, { method: val })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="GET">GET</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {action.type === "delay" && (
                        <div className="pt-2">
                          <Label className="text-xs text-slate-600">Delay Wait Duration (Seconds)</Label>
                          <Input type="number" value={action.seconds || 10} onChange={e => updateAction(index, { seconds: Number(e.target.value) })} />
                        </div>
                      )}

                    </div>
                  </Card>
                  
                  {/* Arrow separator between actions */}
                  {index < actions.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ArrowDown className="h-5 w-5 text-indigo-200" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Add button */}
            <div className="flex justify-center pt-2">
              <Button 
                variant="outline" 
                className="border-dashed border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                onClick={addStep}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Action Step
              </Button>
            </div>

          </div>

          {/* Right Reference Sidepanel */}
          <div className="space-y-4">
            <Card className="p-4 bg-white border-indigo-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-700/5 px-2.5 py-1 text-[9px] text-indigo-700 font-bold uppercase rounded-bl-lg">AI Beta</div>
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold mb-2">
                <Sparkles className="h-4 w-4 text-indigo-700 animate-pulse" />
                <span className="text-sm">AI Workflow Copilot</span>
              </div>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Describe trigger and action steps in plain English to automatically draft the sequence.
              </p>
              <div className="space-y-3">
                <textarea
                  rows={3}
                  className="w-full text-xs p-2.5 border border-indigo-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="e.g. When a lead is created, wait 5 seconds and send WhatsApp welcome text"
                />
                <Button 
                  className="w-full bg-indigo-700 hover:bg-indigo-800 text-white text-xs h-8 gap-1.5"
                  disabled={aiGenerating}
                  onClick={handleAiGenerate}
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate Workflow
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <Card className="p-4 bg-indigo-50/50 border-indigo-100">
              <div className="flex items-center gap-1.5 text-indigo-800 font-semibold mb-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm">Dynamic Context Tags</span>
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Copy and paste these database tags inside text templates. They will dynamically resolve during execution:
              </p>
              <div className="space-y-1.5">
                {vars.map(tag => (
                  <div key={tag} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-indigo-50 font-mono text-[10px] text-indigo-900 select-all cursor-pointer" title="Click to select">
                    <span>{`{{${tag}}}`}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 bg-white border-indigo-100">
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold mb-2">
                <HelpCircle className="h-4 w-4 text-slate-400" />
                <span className="text-sm">Workflow Info</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Workflows run asynchronously in the background. Ensure the corresponding App Integration (e.g. SMTP or Meta WhatsApp) is enabled in **Connected Integrations** before activating.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
