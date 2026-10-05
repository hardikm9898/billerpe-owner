import type { Range } from "./api";
import { day, fullDate } from "./format";

// The Reports tab's date choices (design v1): Today, Yesterday, Last 7 days,
// This month, Last month, Custom. Months are worked out on the phone and
// sent as a custom range; the server applies each outlet's business day.

export type ReportPreset = "today" | "yesterday" | "7d" | "thismonth" | "lastmonth" | "custom";
export const PRESETS: { key: ReportPreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "thismonth", label: "This month" },
  { key: "lastmonth", label: "Last month" },
  { key: "custom", label: "Custom" },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function presetRange(p: ReportPreset, from?: string, to?: string): Range {
  const now = new Date();
  switch (p) {
    case "thismonth":
      return { key: "custom", from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
    case "lastmonth":
      return { key: "custom", from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case "custom":
      return from && to ? { key: "custom", from, to } : { key: "today" };
    case "yesterday":
    case "7d":
      return { key: p };
    default:
      return { key: "today" };
  }
}

export function presetLabel(p: ReportPreset, from?: string, to?: string) {
  if (p === "custom" && from && to) return from === to ? fullDate(from) : `${day(from)} – ${fullDate(to)}`;
  if (p === "thismonth" || p === "lastmonth") {
    const r = presetRange(p);
    return `${day(r.from!)} – ${fullDate(r.to!)}`;
  }
  return PRESETS.find((x) => x.key === p)?.label ?? "Today";
}

export interface ReportSearch {
  outlet?: number | undefined;
  range?: ReportPreset | undefined;
  from?: string | undefined;
  to?: string | undefined;
  view?: string | undefined;
}

const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const validateReportSearch = (s: Record<string, unknown>): ReportSearch => ({
  outlet: Number(s["outlet"]) > 0 ? Number(s["outlet"]) : undefined,
  range: PRESETS.some((p) => p.key === s["range"]) ? (s["range"] as ReportPreset) : undefined,
  from: isDate(s["from"]) ? (s["from"] as string) : undefined,
  to: isDate(s["to"]) ? (s["to"] as string) : undefined,
  view: typeof s["view"] === "string" ? (s["view"] as string) : undefined,
});
