import { useEffect, useState } from "react";
import api from "@/lib/api";
import { dateShort, errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const STATUSES = ["Open", "In Progress", "Completed", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High"];

export default function Tasks() {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);

  function load() {
    const params = statusFilter ? { status: statusFilter } : {};
    api.get("/tasks", { params }).then(r => setItems(r.data)).catch(e => toast.error(errMsg(e)));
  }
  useEffect(() => { api.get("/users").then(r => setUsers(r.data)); }, []);
  useEffect(load, [statusFilter]);

  async function updateStatus(t, s) {
    try {
      await api.put(`/tasks/${t.id}`, { status: s });
      load();
    } catch (e) { toast.error(errMsg(e)); }
  }

  return (
    <div data-testid="tasks-page" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Tasks</h1>
          <p className="text-sm text-slate-600">{items.length} tasks</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter || "all"} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger data-testid="tasks-filter" className="w-40"><SelectValue placeholder="All status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-task-btn" className="bg-amber-700 hover:bg-amber-800">
                <Plus className="h-4 w-4 mr-1.5" /> New Task
              </Button>
            </DialogTrigger>
            <NewTaskDialog users={users} onSaved={() => { setOpen(false); load(); }} />
          </Dialog>
        </div>
      </div>

      <Card className="border-amber-100 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tasks-table">
            <thead className="bg-amber-50/60 text-slate-700">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Due</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-500">No tasks.</td></tr> :
                items.map(t => (
                  <tr key={t.id} className="border-t border-amber-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.title}</div>
                      {t.description && <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={t.priority} /></td>
                    <td className="px-4 py-3">
                      <Select value={t.status} onValueChange={(v) => updateStatus(t, v)}>
                        <SelectTrigger data-testid={`task-status-${t.id}`} className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{dateShort(t.due_date)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function NewTaskDialog({ users, onSaved }) {
  const [form, setForm] = useState({
    title: "", description: "", priority: "Medium", status: "Open",
    assigned_to: null, due_date: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.due_date) delete payload.due_date;
      if (!payload.assigned_to) delete payload.assigned_to;
      await api.post("/tasks", payload);
      toast.success("Task created");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-serif">New Task</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-slate-600">Title *</Label>
          <Input data-testid="new-task-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Description</Label>
          <Input data-testid="new-task-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-600">Priority</Label>
            <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
              <SelectTrigger data-testid="new-task-priority"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-600">Assignee</Label>
            <Select value={form.assigned_to ? String(form.assigned_to) : "none"}
              onValueChange={v => setForm({ ...form, assigned_to: v === "none" ? null : Number(v) })}>
              <SelectTrigger data-testid="new-task-assignee"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs text-slate-600">Due Date</Label>
          <Input data-testid="new-task-due" type="date" value={form.due_date}
            onChange={e => setForm({ ...form, due_date: e.target.value ? `${e.target.value}T00:00:00` : "" })} />
        </div>
      </div>
      <DialogFooter>
        <Button data-testid="new-task-save" className="bg-amber-700 hover:bg-amber-800"
          disabled={saving || !form.title.trim()} onClick={save}>Save Task</Button>
      </DialogFooter>
    </DialogContent>
  );
}
