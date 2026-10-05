// Times and money as an owner in India reads them.

const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const fullFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** "8:52 PM" */
export const time = (d: Date | string) => timeFmt.format(new Date(d)).replace("am", "AM").replace("pm", "PM");
/** "5 Oct" */
export const day = (d: Date | string) => dayFmt.format(new Date(d));
/** "12 Sep 2026" */
export const fullDate = (d: Date | string) => fullFmt.format(new Date(d));
/** "Sun, 5 Oct" */
export const weekday = (d: Date | string) => weekdayFmt.format(new Date(d));

/**
 * "40 sec ago", "14 min ago", "3 h ago", "2 Oct, 3:10 PM". `now` is the
 * server's clock (corrected for this phone's clock drift) so a phone with a
 * wrong time still shows the right age.
 */
export function ago(iso: string | null, now: number) {
  if (!iso) return "never";
  const ms = Math.max(0, now - new Date(iso).getTime());
  const s = Math.round(ms / 1000);
  if (s < 60) return `${Math.max(s, 1)} sec ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${day(iso)}, ${time(iso)}`;
}

/** Duration since, for "Offline 14 min" / "Offline 3 h". */
export function since(iso: string | null, now: number) {
  if (!iso) return "";
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${Math.max(m, 1)} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} days`;
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
/** "₹1,84,260" */
export const money = (n: number) => `₹${inr.format(Math.round(n))}`;

export const greeting = (d = new Date()) => {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "O";

/** "₹46.3k", "₹1.2L" for tight tiles; small amounts in full. */
export function moneyShort(n: number) {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  if (a >= 1e4) return `₹${(n / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
  return money(n);
}

/** 0-23 -> "11 AM", "12 PM", "9 PM". */
export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

/** "▲ 12%" / "▼ 8%" against the earlier figure, or null when there is nothing to compare. */
export function delta(now: number, before: number): { up: boolean; text: string } | null {
  if (!(before > 0)) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return { up: pct >= 0, text: `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}%` };
}

/** 1800 -> "1,800", 2.5 -> "2.5" (Indian grouping, up to 2 decimals). */
export const qty = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
