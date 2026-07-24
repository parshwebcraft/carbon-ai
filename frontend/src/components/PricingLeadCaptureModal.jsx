import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

export default function PricingLeadCaptureModal({ open, onClose, planId = "custom" }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    expected_call_volume: "",
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setError("");
    try {
      await api.post("/payments/contact-sales", { ...form, plan_id: planId });
      setStatus("success");
      setForm({ name: "", email: "", company: "", expected_call_volume: "" });
    } catch (err) {
      setStatus("error");
      setError(err?.response?.data?.detail || "Could not submit the request. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0d16] p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
          aria-label="Close contact sales form"
        >
          <X className="h-5 w-5" />
        </button>

        {status === "success" ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <h3 className="font-serif text-2xl font-bold text-white">Request Received</h3>
            <p className="text-sm text-slate-400">Our team will contact you with a custom AI calling plan.</p>
            <Button onClick={onClose} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
              Done
            </Button>
          </div>
        ) : (
          <>
            <h3 className="font-serif text-2xl font-bold text-white mb-2">Contact Sales</h3>
            <p className="text-sm text-slate-400 mb-6">
              Tell us your expected call volume and infrastructure needs.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Company</label>
                <input
                  type="text"
                  required
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Company name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Expected Call Volume</label>
                <input
                  type="text"
                  required
                  value={form.expected_call_volume}
                  onChange={(e) => setForm({ ...form, expected_call_volume: e.target.value })}
                  placeholder="e.g. 20,000 calls/month"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              {error && <p className="text-sm text-red-300">{error}</p>}
              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl mt-2 disabled:opacity-60"
              >
                {status === "loading" ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

