import { useEffect, useState } from "react";
import api from "@/lib/api";
import { errMsg, dateShort } from "@/lib/format";
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
import { toast } from "sonner";
import { Plus, UserCog } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";

const ROLES = ["Admin", "Manager", "Sales"];

export default function Users() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  function load() { api.get("/users").then(r => setItems(r.data)).catch(e => toast.error(errMsg(e))); }
  useEffect(load, []);

  if (user && user.role !== "Admin") return <Navigate to="/" replace />;

  return (
    <div data-testid="users-page" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Team</h1>
          <p className="text-sm text-slate-600">{items.length} users</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-user-btn" className="bg-amber-700 hover:bg-amber-800"><Plus className="h-4 w-4 mr-1.5" />Invite user</Button>
          </DialogTrigger>
          <NewUserDialog onSaved={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>
      <Card className="border-amber-100 bg-white overflow-hidden">
        <table className="w-full text-sm" data-testid="users-table">
          <thead className="bg-amber-50/60 text-slate-700">
            <tr><th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Active</th><th className="text-left px-4 py-3">Created</th></tr>
          </thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id} className="border-t border-amber-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-700 grid place-items-center"><UserCog className="h-4 w-4" /></div>
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><span className="text-xs uppercase tracking-wider text-amber-800">{u.role}</span></td>
                <td className="px-4 py-3">{u.is_active ? "Yes" : "No"}</td>
                <td className="px-4 py-3 text-slate-500">{dateShort(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function NewUserDialog({ onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "Sales", is_active: true });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post("/users", form);
      toast.success("User created");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-serif">Invite User</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label className="text-xs text-slate-600">Name</Label><Input data-testid="new-user-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-600">Email</Label><Input data-testid="new-user-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-600">Password</Label><Input data-testid="new-user-password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-600">Role</Label>
          <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
            <SelectTrigger data-testid="new-user-role"><SelectValue /></SelectTrigger>
            <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button data-testid="new-user-save" className="bg-amber-700 hover:bg-amber-800"
          disabled={saving || !form.name || !form.email || !form.password}
          onClick={save}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
