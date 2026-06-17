export function inr(n) {
  if (n == null || isNaN(n)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

export function parseDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d === "string") {
    let str = d.trim();
    if (!str.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(str)) {
      if (!str.includes("T")) {
        str = str.replace(" ", "T");
      }
      str = str + "Z";
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function dateShort(d) {
  const dt = parseDate(d);
  if (!dt) return "";
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function dateTime(d) {
  const dt = parseDate(d);
  if (!dt) return "";
  return dt.toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function timeOnly(d) {
  const dt = parseDate(d);
  if (!dt) return "";
  return dt.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function relative(d) {
  const dt = parseDate(d);
  if (!dt) return "";
  const t = dt.getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return dateShort(d);
}

export function errMsg(e, fallback = "Something went wrong") {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map(x => x?.msg || JSON.stringify(x)).join(", ");
  return JSON.stringify(d);
}

