import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Sliders, Save, ShieldAlert, Sparkles } from "lucide-react";

export default function AutomationSettings() {
  const [dailyLimit, setDailyLimit] = useState(5000);
  const [retryAttempts, setRetryAttempts] = useState(3);
  const [asyncWorkers, setAsyncWorkers] = useState(5);
  const [leadAutoRules, setLeadAutoRules] = useState(true);
  const [overdueInterval, setOverdueInterval] = useState(5); // minutes
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Automation configurations saved successfully!");
    }, 800);
  }

  return (
    <div data-testid="automation-settings" className="space-y-6">
      <div className="flex items-center justify-between border-b border-indigo-50 pb-4">
        <div>
          <h1 className="font-serif text-3xl">Automation Settings</h1>
          <p className="text-sm text-slate-600">Configure global concurrency, retry limits, and automation engine options.</p>
        </div>
        <Button className="bg-indigo-700 hover:bg-indigo-800 text-white gap-1.5" disabled={saving} onClick={handleSave}>
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="space-y-5">
          {/* General execution limits */}
          <Card className="p-5 bg-white border-indigo-100 space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm border-b border-indigo-50 pb-2">Global Limits & Speed</h3>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-600">Max Daily Execution Runs</Label>
                <Input type="number" value={dailyLimit} onChange={e => setDailyLimit(Number(e.target.value))} />
                <span className="text-[10px] text-slate-400 mt-1 block">Maximum automated runs processed in a 24h window.</span>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Retry Failed Steps Attempts</Label>
                <Input type="number" value={retryAttempts} onChange={e => setRetryAttempts(Number(e.target.value))} />
                <span className="text-[10px] text-slate-400 mt-1 block">Number of auto-retry attempts for failed email/API integrations.</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-600">Overdue Tasks Scan Interval (Minutes)</Label>
                <Input type="number" value={overdueInterval} onChange={e => setOverdueInterval(Number(e.target.value))} />
                <span className="text-[10px] text-slate-400 mt-1 block">Frequency of database scans to verify overdue tasks triggers.</span>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Async Engine Worker Pool Size</Label>
                <Input type="number" value={asyncWorkers} onChange={e => setAsyncWorkers(Number(e.target.value))} />
                <span className="text-[10px] text-slate-400 mt-1 block">Maximum concurrent workflows executed concurrently in the pool.</span>
              </div>
            </div>
          </Card>

          {/* Trigger Toggles */}
          <Card className="p-5 bg-white border-indigo-100 space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm border-b border-indigo-50 pb-2">Automated Actions Triggers</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm text-slate-800">Auto Lead Assignment rules</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Let automation workflow rules auto-allocate leads to team members.</p>
                </div>
                <Switch checked={leadAutoRules} onCheckedChange={setLeadAutoRules} />
              </div>

              <div className="flex items-center justify-between border-t border-indigo-50 pt-4">
                <div>
                  <h4 className="font-medium text-sm text-slate-800">WhatsApp Inbound auto-tasks creation</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Let incoming messages create followup tasks automatically for sales reps.</p>
                </div>
                <Switch checked={true} disabled />
              </div>

              <div className="flex items-center justify-between border-t border-indigo-50 pt-4">
                <div>
                  <h4 className="font-medium text-sm text-slate-800">Enforce safe calling time windows (IST)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Prevent Vapi calls from triggering outside of 10:00 AM - 6:00 PM IST.</p>
                </div>
                <Switch checked={true} disabled />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Info Box */}
        <div className="space-y-4">
          <Card className="p-4 bg-amber-50/50 border-amber-200/50">
            <div className="flex items-center gap-1.5 text-amber-800 font-semibold mb-2">
              <ShieldAlert className="h-4 w-4" />
              <span className="text-sm">Safety Lock</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Modifying workers and retry sizes directly affects the Render server resource usage. Change these only if you experience workflow run latency under high lead volumes.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
