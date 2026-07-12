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
import { Plus, Gem, Edit3, Trash2 } from "lucide-react";
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
  const [editingProduct, setEditingProduct] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  function load() {
    const params = {};
    if (search) params.search = search;
    if (metal) params.metal_type = metal;
    api.get("/products", { params }).then(r => {
      setItems(r.data);
      setSelectedIds([]);
    }).catch(e => toast.error(errMsg(e)));
  }
  useEffect(load, [metal]);

  async function handleDelete(pid) {
    if (!window.confirm("Are you sure you want to delete this service/product?")) return;
    try {
      await api.delete(`/products/${pid}`);
      toast.success("Service deleted");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function handleDeleteSelected() {
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected services?`)) return;
    try {
      await api.post("/products/delete-multiple", selectedIds);
      toast.success("Selected services deleted");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL services/products from the database?")) return;
    try {
      await api.post("/products/delete-all");
      toast.success("All services deleted");
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
      setSelectedIds(items.map(p => p.id));
    }
  }

  return (
    <div data-testid="products-page" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Products Catalogue</h1>
          <p className="text-sm text-slate-600">{items.length} pieces</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && user?.role === "Admin" && (
            <Button 
              variant="destructive"
              onClick={handleDeleteSelected}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete Selected ({selectedIds.length})
            </Button>
          )}
          {items.length > 0 && user?.role === "Admin" && (
            <Button 
              variant="outline" 
              onClick={handleDeleteAll}
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              Delete All
            </Button>
          )}
          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="new-product-btn" className="bg-indigo-700 hover:bg-indigo-800"><Plus className="h-4 w-4 mr-1.5" />Add Product</Button>
              </DialogTrigger>
              <NewProductDialog onSaved={() => { setOpen(false); load(); }} />
            </Dialog>
          )}
        </div>
      </div>

      <Card className="p-4 border-indigo-100 bg-white">
        <div className="grid sm:grid-cols-4 gap-3">
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
          {items.length > 0 && (
            <Button variant="ghost" onClick={toggleSelectAll} className="text-indigo-700 hover:bg-indigo-50">
              {selectedIds.length === items.length ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="products-grid">
        {items.map(p => (
          <Card key={p.id} className="border-indigo-100 bg-white p-4 hover:shadow-md transition-shadow relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  className="rounded border-indigo-300 text-indigo-700 focus:ring-indigo-500 h-4 w-4"
                />
                <div className="h-10 w-10 rounded-lg bg-indigo-50 grid place-items-center text-indigo-700">
                  <Gem className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-indigo-700 mr-1.5">{p.metal_type}</span>
                {canCreate && (
                  <button 
                    onClick={() => { setEditingProduct(p); setEditOpen(true); }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Edit Details"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                )}
                {user?.role === "Admin" && (
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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
                <div className="font-semibold text-indigo-800">{inr(p.price)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editingProduct && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <EditProductDialog product={editingProduct} onSaved={() => { setEditOpen(false); setEditingProduct(null); load(); }} />
        </Dialog>
      )}
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
        <Button data-testid="new-product-save" className="bg-indigo-700 hover:bg-indigo-800" disabled={saving || !form.product_name.trim()} onClick={save}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditProductDialog({ product, onSaved }) {
  const [form, setForm] = useState({ ...product });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...product });
  }, [product]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/products/${product.id}`, {
        ...form,
        weight: Number(form.weight) || 0,
        making_charges: Number(form.making_charges) || 0,
        price: Number(form.price) || 0,
      });
      toast.success("Product updated");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle className="font-serif">Edit Product</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs text-slate-600">Name *</Label>
          <Input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Category</Label>
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-600">Metal</Label>
          <Select value={form.metal_type} onValueChange={v => setForm({ ...form, metal_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{METALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-slate-600">Purity</Label><Input value={form.purity} onChange={e => setForm({ ...form, purity: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-600">Weight (g)</Label><Input type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-600">Making (₹)</Label><Input type="number" value={form.making_charges} onChange={e => setForm({ ...form, making_charges: e.target.value })} /></div>
        <div><Label className="text-xs text-slate-600">Price (₹)</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button className="bg-indigo-700 hover:bg-indigo-800" disabled={saving || !form.product_name.trim()} onClick={save}>Save</Button>
      </DialogFooter>
    </DialogContent>
  );
}
