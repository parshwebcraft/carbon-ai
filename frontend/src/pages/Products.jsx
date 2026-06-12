import { useEffect, useState } from "react";
import api from "@/lib/api";
import { inr, errMsg } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Gem } from "lucide-react";
import { useAuth } from "@/lib/auth";

const CATEGORIES = ["Necklace", "Ring", "Earring", "Bangle", "Bridal Set", "Pendant", "Chain", "Bracelet"];
const METALS = ["Gold", "Diamond", "Platinum", "Silver"];

export default function Products() {
  const { user } = useAuth();
  const canCreate = user?.role === "Admin" || user?.role === "Manager";
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [metal, setMetal] = useState("");
  const [open, setOpen] = useState(false);

  function load() {
    const params = {};
    if (search) params.search = search;
    if (metal) params.metal_type = metal;
    api.get("/products", { params }).then(r => setItems(r.data)).catch(e => toast.error(errMsg(e)));
  }
  useEffect(load, [metal]);

  return (
    <div data-testid="products-page" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Products Catalogue</h1>
          <p className="text-sm text-slate-600">{items.length} pieces</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-product-btn" className="bg-amber-700 hover:bg-amber-800"><Plus className="h-4 w-4 mr-1.5" />Add Product</Button>
            </DialogTrigger>
            <NewProductDialog onSaved={() => { setOpen(false); load(); }} />
          </Dialog>
        )}
      </div>

      <Card className="p-4 border-amber-100 bg-white">
        <div className="grid sm:grid-cols-3 gap-3">
          <Input data-testid="products-search" placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()} />
          <Select value={metal || "all"} onValueChange={v => setMetal(v === "all" ? "" : v)}>
            <SelectTrigger data-testid="products-metal-filter"><SelectValue placeholder="All metals" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All metals</SelectItem>
              {METALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button data-testid="products-apply" variant="outline" onClick={load}>Apply</Button>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="products-grid">
        {items.map(p => (
          <Card key={p.id} className="border-amber-100 bg-white p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-amber-50 grid place-items-center text-amber-700">
                <Gem className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-amber-700">{p.metal_type}</span>
            </div>
            <div className="mt-3 font-serif text-lg">{p.product_name}</div>
            <div className="text-xs text-slate-500">{p.category} • {p.purity}</div>
            <div className="mt-2 text-sm text-slate-700">{p.weight}g</div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase text-slate-500">Making</div>
                <div className="text-sm">{inr(p.making_charges)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-slate-500">Price</div>
                <div className="font-semibold text-amber-800">{inr(p.price)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NewProductDialog({ onSaved }) {
  const [form, setForm] = useState({
    product_name: "", category: "Ring", metal_type: "Gold", purity: "22K",
    weight: 5, making_charges: 5000, price: 50000,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post("/products", {
        ...form,
        weight: Number(form.weight) || 0,
        making_charges: Number(form.making_charges) || 0,
        price: Number(form.price) || 0,
      });
      toast.success("Product added");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle className="font-serif">Add Product</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs text-slate-600">Name *</Label>
          <Input data-testid="new-product-name" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Category</Label>
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
            <SelectTrigger data-testid="new-product-category"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-600">Metal</Label>
          <Select value={form.metal_type} onValueChange={v => setForm({ ...form, metal_type: v })}>
            <SelectTrigger data-testid="new-product-metal"><SelectValue /></SelectTrigger>
            <SelectContent>{METALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-slate-600">Purity</Label><Input data-testid="new-product-purity" value={form.purity} onChange={e => setForm({ ...form, purity: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-600">Weight (g)</Label><Input data-testid="new-product-weight" type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-600">Making (₹)</Label><Input data-testid="new-product-making" type="number" value={form.making_charges} onChange={e => setForm({ ...form, making_charges: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-600">Price (₹)</Label><Input data-testid="new-product-price" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button data-testid="new-product-save" className="bg-amber-700 hover:bg-amber-800" disabled={saving || !form.product_name.trim()} onClick={save}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
