import { useEffect, useState } from "react";
import api from "@/lib/api";
import { dateTime, errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CalendarCheck2 } from "lucide-react";

export default function Appointments() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  function load() {
    api.get("/appointments").then(r => setItems(r.data)).catch(e => toast.error(errMsg(e)));
  }
  useEffect(load, []);

  const upcoming = items.filter(a => new Date(a.appointment_date) >= new Date());
  const past = items.filter(a => new Date(a.appointment_date) < new Date());

  return (
    <div data-testid="appointments-page" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Appointments</h1>
          <p className="text-sm text-slate-600">{upcoming.length} upcoming • {past.length} past</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-appt-btn" className="bg-amber-700 hover:bg-amber-800"><Plus className="h-4 w-4 mr-1.5" />New Appointment</Button>
          </DialogTrigger>
          <NewApptDialog onSaved={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="appointments-grid">
        {items.map(a => (
          <Card key={a.id} className="p-4 border-amber-100 bg-white">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 grid place-items-center">
                <CalendarCheck2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{a.customer_name}</div>
                <div className="text-xs text-slate-500">{dateTime(a.appointment_date)}</div>
                <div className="text-xs text-amber-700 mt-0.5">{a.showroom_visit ? "Showroom visit" : "Virtual consultation"}</div>
                {a.notes && <div className="text-sm text-slate-600 mt-2 line-clamp-3">{a.notes}</div>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NewApptDialog({ onSaved }) {
  const [form, setForm] = useState({
    customer_name: "", appointment_date: "", showroom_visit: true, notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.customer_name.trim() || !form.appointment_date) return;
    setSaving(true);
    try {
      await api.post("/appointments", {
        ...form,
        appointment_date: new Date(form.appointment_date).toISOString(),
      });
      toast.success("Appointment created");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-serif">New Appointment</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label className="text-xs text-slate-600">Customer name *</Label>
          <Input data-testid="new-appt-name" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-600">Date & time *</Label>
          <Input data-testid="new-appt-date" type="datetime-local" value={form.appointment_date} onChange={e => setForm({ ...form, appointment_date: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-600">Notes</Label>
          <Input data-testid="new-appt-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button data-testid="new-appt-save" className="bg-amber-700 hover:bg-amber-800" disabled={saving} onClick={save}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
