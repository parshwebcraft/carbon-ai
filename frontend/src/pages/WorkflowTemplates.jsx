import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MessageSquare, UserCheck, AlertTriangle, Calendar, FileText, Sparkles, Zap,
} from "lucide-react";

const TEMPLATES = [
  {
    name: "Auto-Welcome WhatsApp",
    trigger_type: "lead_created",
    icon: MessageSquare,
    color: "text-emerald-700 bg-emerald-50 border-emerald-100",
    desc: "Send an instant WhatsApp greeting template to new incoming leads automatically.",
    actions: [
      { type: "send_whatsapp", to_number: "{{phone}}", message_body: "Hi {{name}}, thank you for contacting ParshWebCraft! We received your request for {{customer_type}} and will get in touch shortly." }
    ]
  },
  {
    name: "Lead Auto-Assign Manager",
    trigger_type: "lead_created",
    icon: UserCheck,
    color: "text-blue-700 bg-blue-50 border-blue-100",
    desc: "Alert and notify all CRM managers immediately when a high budget lead is created.",
    actions: [
      { type: "notify_manager", title: "New Lead Registered", message: "High priority lead {{name}} has arrived from {{city}} with budget ₹{{budget}}." }
    ]
  },
  {
    name: "Task Overdue Warning",
    trigger_type: "task_overdue",
    icon: AlertTriangle,
    color: "text-rose-700 bg-rose-50 border-rose-100",
    desc: "Alert managers and email employee whenever a critical task passes its due date.",
    actions: [
      { type: "notify_manager", title: "Task Overdue Alert", message: "Task '{{title}}' assigned to sales has crossed its due date!" },
      { type: "send_email", recipient: "{{lead_email}}", subject: "Urgent: Overdue CRM Action Needed", body: "Please review the task '{{title}}' which is currently marked overdue in the ParshCall dashboard." }
    ]
  },
  {
    name: "Appointment Reminders",
    trigger_type: "appointment_created",
    icon: Calendar,
    color: "text-indigo-700 bg-indigo-50 border-indigo-100",
    desc: "Confirm and trigger a welcome WhatsApp confirmation once an appointment is booked.",
    actions: [
      { type: "send_whatsapp", to_number: "{{phone}}", message_body: "Hi {{customer_name}}, your appointment is confirmed for {{appointment_date}}." }
    ]
  },
  {
    name: "Quotation Delivery Alert",
    trigger_type: "quotation_generated",
    icon: FileText,
    color: "text-purple-700 bg-purple-50 border-purple-100",
    desc: "Send Quotation details via email to the client automatically when generated.",
    actions: [
      { type: "send_email", recipient: "{{lead_email}}", subject: "Your Quotation {{quotation_number}} is Ready", body: "Dear {{lead_name}},\n\nYour quotation {{quotation_number}} for amount ₹{{amount}} has been generated. Please log in to review.\n\nWarm regards,\nParshWebCraft Finance" }
    ]
  },
  {
    name: "Inbound WhatsApp Task Logger",
    trigger_type: "whatsapp_inbound",
    icon: Zap,
    color: "text-cyan-700 bg-cyan-50 border-cyan-100",
    desc: "Automatically log a follow-up task whenever a client messages us on WhatsApp.",
    actions: [
      { type: "create_task", title: "Reply to WhatsApp from {{lead_name}}", description: "Inbound text: '{{message}}'. Please check the chat thread and reply.", priority: "High", due_in_days: 1 }
    ]
  }
];

export default function WorkflowTemplates() {
  const navigate = useNavigate();

  async function handleUseTemplate(tpl) {
    try {
      await api.post("/automation/workflows", {
        name: `${tpl.name} (Active)`,
        trigger_type: tpl.trigger_type,
        actions: JSON.stringify(tpl.actions),
        enabled: true
      });
      toast.success(`Template '${tpl.name}' activated successfully!`);
      navigate("/automation");
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div data-testid="workflow-templates" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Workflow Templates</h1>
          <p className="text-sm text-slate-600">
            Kickstart your digital agency automations using pre-built templates.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TEMPLATES.map((tpl, i) => {
          const Icon = tpl.icon;
          return (
            <Card key={i} className="p-5 bg-white border-indigo-100 hover:shadow-md transition-shadow flex flex-col justify-between h-[220px]">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${tpl.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">{tpl.name}</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{tpl.desc}</p>
                <div className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50 w-fit uppercase tracking-wider">
                  Trigger: {tpl.trigger_type.replace("_", " ")}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 mt-2">
                <Button 
                  className="w-full bg-indigo-700 hover:bg-indigo-800 text-white text-xs h-9 gap-1"
                  onClick={() => handleUseTemplate(tpl)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Use Template
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
