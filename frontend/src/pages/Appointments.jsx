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
import { Plus, CalendarCheck2, Edit3, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Appointments() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  function load() {
    api.get("/appointments").then(r => {
      setItems(r.data);
      setSelectedIds([]);
    }).catch(e => toast.error(errMsg(e)));
  }
  useEffect(load, []);

  async function handleDelete(aid) {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    try {
      await api.delete(`/appointments/${aid}`);
      toast.success("Appointment deleted");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function handleDeleteSelected() {
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected appointments?`)) return;
    try {
      await api.post("/appointments/delete-multiple", selectedIds);
      toast.success("Selected appointments deleted");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL appointments?")) return;
    try {
      await api.post("/appointments/delete-all");
      toast.success("All appointments deleted");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(a => a.id));
    }
  }

  const upcoming = items.filter(a => new Date(a.appointment_date) >= new Date());
  const past = items.filter(a => new Date(a.appointment_date) < new Date());

  return (
    <div data-testid="appointments-page" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Appointments</h1>
          <p className="text-sm text-slate-600">{upcoming.length} upcoming • {past.length} past</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && isAdmin && (
            <Button 
              variant="destructive"
              onClick={handleDeleteSelected}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete Selected ({selectedIds.length})
            </Button>
          )}
          {items.length > 0 && isAdmin && (
            <Button 
              variant="outline" 
              onClick={handleDeleteAll}
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              Delete All
            </Button>
          )}
          {items.length > 0 && (
            <Button variant="outline" onClick={toggleSelectAll}>
              {selectedIds.length === items.length ? "Deselect All" : "Select All"}
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-appt-btn" className="bg-indigo-700 hover:bg-indigo-800"><Plus className="h-4 w-4 mr-1.5" />New Appointment</Button>
            </DialogTrigger>
            <NewApptDialog onSaved={() => { setOpen(false); load(); }} />
          </Dialog>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="appointments-grid">
        {items.map(a => (
          <Card key={a.id} className="p-4 border-indigo-100 bg-white hover:shadow-md transition-shadow relative">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(a.id)}
                  onChange={() => toggleSelect(a.id)}
                  className="rounded border-indigo-300 text-indigo-700 focus:ring-indigo-500 h-4 w-4"
                />
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 grid place-items-center">
                  <CalendarCheck2 className="h-5 w-5" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="font-medium truncate">{a.customer_name}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => { setEditingAppt(a); setEditOpen(true); }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDelete(a.id)}
                        className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500">{dateTime(a.appointment_date)}</div>
                <div className="text-xs text-indigo-700 mt-0.5">{a.showroom_visit ? "Showroom visit" : "Virtual consultation"}</div>
                {a.notes && <div className="text-sm text-slate-600 mt-2 line-clamp-3">{a.notes}</div>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editingAppt && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <EditApptDialog appointment={editingAppt} onSaved={() => { setEditOpen(false); setEditingAppt(null); load(); }} />
        </Dialog>
      )}
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
        <div>
          <Label className="text-xs text-slate-600">Customer name *</Label>
          <Input data-testid="new-appt-name" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Date & time *</Label>
          <Input data-testid="new-appt-date" type="datetime-local" value={form.appointment_date} onChange={e => setForm({ ...form, appointment_date: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Notes</Label>
          <Input data-testid="new-appt-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="pt-1">
          <Label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={form.showroom_visit}
              onChange={e => setForm({ ...form, showroom_visit: e.target.checked })}
              className="rounded border-indigo-300 text-indigo-700 focus:ring-indigo-500 h-4 w-4"
            />
            Showroom Visit (uncheck for virtual consultation)
          </Label>
        </div>
      </div>
      <DialogFooter>
        <Button data-testid="new-appt-save" className="bg-indigo-700 hover:bg-indigo-800" disabled={saving} onClick={save}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditApptDialog({ appointment, onSaved }) {
  // Format ISO date string to datetime-local friendly format (YYYY-MM-DDTHH:MM)
  const formatDatetimeLocal = (isoStr) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    customer_name: appointment.customer_name || "",
    appointment_date: formatDatetimeLocal(appointment.appointment_date),
    showroom_visit: appointment.showroom_visit ?? true,
    notes: appointment.notes || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      customer_name: appointment.customer_name || "",
      appointment_date: formatDatetimeLocal(appointment.appointment_date),
      showroom_visit: appointment.showroom_visit ?? true,
      notes: appointment.notes || "",
    });
  }, [appointment]);

  async function save() {
    if (!form.customer_name.trim() || !form.appointment_date) return;
    setSaving(true);
    try {
      await api.put(`/appointments/${appointment.id}`, {
        ...form,
        appointment_date: new Date(form.appointment_date).toISOString(),
      });
      toast.success("Appointment updated");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-serif">Edit Appointment</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-slate-600">Customer name *</Label>
          <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Date & time *</Label>
          <Input type="datetime-local" value={form.appointment_date} onChange={e => setForm({ ...form, appointment_date: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Notes</Label>
          <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="pt-1">
          <Label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={form.showroom_visit}
              onChange={e => setForm({ ...form, showroom_visit: e.target.checked })}
              className="rounded border-indigo-300 text-indigo-700 focus:ring-indigo-500 h-4 w-4"
            />
            Showroom Visit (uncheck for virtual consultation)
          </Label>
        </div>
      </div>
      <DialogFooter>
        <Button className="bg-indigo-700 hover:bg-indigo-800" disabled={saving} onClick={save}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
