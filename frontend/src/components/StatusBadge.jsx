import { cn } from "@/lib/utils";

const PALETTE = {
  // lead status
  "New": "bg-amber-50 text-amber-800 border-amber-200",
  "Contacted": "bg-sky-50 text-sky-800 border-sky-200",
  "Follow Up": "bg-indigo-50 text-indigo-800 border-indigo-200",
  "Interested": "bg-violet-50 text-violet-800 border-violet-200",
  "Visit Scheduled": "bg-teal-50 text-teal-800 border-teal-200",
  "Quotation Sent": "bg-orange-50 text-orange-800 border-orange-200",
  "Negotiation": "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200",
  "Won": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Lost": "bg-rose-50 text-rose-800 border-rose-200",
  // task / call
  "Open": "bg-slate-100 text-slate-800 border-slate-200",
  "In Progress": "bg-blue-50 text-blue-800 border-blue-200",
  "Completed": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Cancelled": "bg-zinc-100 text-zinc-700 border-zinc-200",
  "Missed": "bg-rose-50 text-rose-800 border-rose-200",
  "No Answer": "bg-amber-50 text-amber-800 border-amber-200",
  "Voicemail": "bg-cyan-50 text-cyan-800 border-cyan-200",
  // priority
  "High": "bg-rose-50 text-rose-800 border-rose-200",
  "Medium": "bg-amber-50 text-amber-800 border-amber-200",
  "Low": "bg-slate-100 text-slate-700 border-slate-200",
  // quotation
  "Draft": "bg-zinc-100 text-zinc-700 border-zinc-200",
  "Sent": "bg-sky-50 text-sky-800 border-sky-200",
  "Accepted": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Rejected": "bg-rose-50 text-rose-800 border-rose-200",
  // sentiment
  "Positive": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Neutral": "bg-zinc-100 text-zinc-700 border-zinc-200",
  "Negative": "bg-rose-50 text-rose-800 border-rose-200",
};

export default function StatusBadge({ value, className }) {
  const palette = PALETTE[value] || "bg-zinc-100 text-zinc-700 border-zinc-200";
  return (
    <span
      data-testid={`status-${(value || "unknown").toLowerCase().replace(/\s+/g, "-")}`}
      className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", palette, className)}
    >
      {value || "—"}
    </span>
  );
}
