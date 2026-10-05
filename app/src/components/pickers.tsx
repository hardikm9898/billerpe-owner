import { Calendar, Check, ChevronDown, Store, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { Outlet, OutletsResult, Range, RangeKey } from "@/lib/api";
import { day, fullDate } from "@/lib/format";
import { useCall } from "@/lib/useCall";
import { cn } from "./ui";

// Sheets and pickers of design v1: the "All outlets" and date chips on Home,
// Bills and Reports, and the chip rows.

/** A bottom sheet over the screen; tap outside or X to close. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#17110f]/45" onClick={onClose} />
      <div className="safe-bottom relative max-h-[85dvh] overflow-y-auto rounded-t-[28px] bg-ground px-4 pb-6 pt-3">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line-2" />
        <div className="flex items-center justify-between px-1 pb-3">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex size-10 items-center justify-center rounded-full bg-surface">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A rounded chip-button ("All outlets ▾", "Today ▾"). */
export function ChipButton({ icon, children, onClick }: { icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-10 max-w-full shrink-0 items-center gap-1.5 rounded-full border border-line-2 bg-surface pl-2.5 pr-3 text-[13px] font-bold">
      {icon}
      <span className="truncate">{children}</span>
      <ChevronDown className="size-4 shrink-0" />
    </button>
  );
}

/** A horizontal row of filter chips; the selected one is dark. */
export function Chips<K extends string>({ items, value, onChange, className }: { items: { key: K; label: string; count?: number | undefined }[]; value: K; onChange: (k: K) => void; className?: string }) {
  return (
    <div className={cn("no-scrollbar flex gap-2 overflow-x-auto px-4 py-1", className)}>
      {items.map((c) => {
        const on = c.key === value;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-bold", on ? "border-dark bg-dark text-on-dark" : "border-line-2 bg-surface text-ink")}
          >
            {c.label}
            {c.count !== undefined && <span className={on ? "text-on-dark-2" : "text-ink-2"}>{c.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control (Today / Yesterday / 7 days / Custom). */
export function Segmented<K extends string>({ items, value, onChange }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-muted-soft p-1">
      {items.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onChange(s.key)}
          className={cn("h-9 flex-1 rounded-[10px] text-[13px] font-bold", s.key === value ? "bg-surface text-ink shadow-[0_1px_2px_rgba(30,23,20,0.12)]" : "text-ink-2")}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ outlets ------------------------------ */

/** The owner's outlets (shared by every picker; refreshed every minute). */
export function useOutlets() {
  const q = useCall<OutletsResult>("outlets");
  return { outlets: q.data?.outlets ?? [], loading: q.loading, error: q.error, refresh: q.refresh, skew: q.skew };
}

export type OutletChoice = "all" | number;

export function OutletPicker({ value, onChange, outlets, allowAll = true }: { value: OutletChoice; onChange: (v: OutletChoice) => void; outlets: Outlet[]; allowAll?: boolean }) {
  const [open, setOpen] = useState(false);
  const current = value === "all" ? null : outlets.find((o) => o.id === value);
  const label = current ? current.name : outlets.length === 1 ? outlets[0]!.name : "All outlets";
  const pick = (v: OutletChoice) => {
    onChange(v);
    setOpen(false);
  };
  return (
    <>
      <ChipButton icon={<Store className="size-[18px] shrink-0" strokeWidth={1.9} />} onClick={() => setOpen(true)}>
        {label}
      </ChipButton>
      <Sheet open={open} onClose={() => setOpen(false)} title="Choose outlet">
        <div className="overflow-hidden rounded-[20px] bg-surface">
          {allowAll && outlets.length > 1 && <PickRow label="All outlets" sub={`${outlets.length} outlets together`} on={value === "all"} onClick={() => pick("all")} />}
          {outlets.map((o) => (
            <PickRow key={o.id} label={o.name} sub={o.pc.status === "online" ? "PC online" : o.pc.status === "offline" ? "PC offline" : "No PC yet"} on={value === o.id} onClick={() => pick(o.id)} />
          ))}
        </div>
      </Sheet>
    </>
  );
}

function PickRow({ label, sub, on, onClick }: { label: string; sub: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[60px] w-full items-center gap-3 border-t border-line px-4 py-3 text-left first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-bold">{label}</div>
        <div className="text-[12.5px] font-semibold text-ink-2">{sub}</div>
      </div>
      {on && <Check className="size-5 text-brand" />}
    </button>
  );
}

/* ------------------------------ date range ------------------------------ */

export const RANGE_LABEL: Record<RangeKey, string> = { today: "Today", yesterday: "Yesterday", "7d": "Last 7 days", "30d": "Last 30 days", custom: "Custom" };

export function rangeLabel(r: Range) {
  if (r.key !== "custom" || !r.from || !r.to) return RANGE_LABEL[r.key];
  return r.from === r.to ? fullDate(r.from) : `${day(r.from)} – ${fullDate(r.to)}`;
}

const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** "Today ▾" chip; the sheet has the presets and a from/to for any range (up to 3 months). */
export function RangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ChipButton icon={<Calendar className="size-[18px] shrink-0" strokeWidth={1.9} />} onClick={() => setOpen(true)}>
        {rangeLabel(value)}
      </ChipButton>
      <RangeSheet
        open={open}
        value={value}
        onClose={() => setOpen(false)}
        onChange={(r) => {
          onChange(r);
          setOpen(false);
        }}
      />
    </>
  );
}

export function RangeSheet({ open, value, onClose, onChange }: { open: boolean; value: Range; onClose: () => void; onChange: (r: Range) => void }) {
  const [from, setFrom] = useState(value.from || isoToday());
  const [to, setTo] = useState(value.to || isoToday());
  useEffect(() => {
    if (open) {
      setFrom(value.from || isoToday());
      setTo(value.to || isoToday());
    }
  }, [open, value.from, value.to]);
  const tooLong = (new Date(to).getTime() - new Date(from).getTime()) / 86400000 > 92;
  const bad = !from || !to || from > to || tooLong;
  return (
    <Sheet open={open} onClose={onClose} title="Date range">
      <div className="overflow-hidden rounded-[20px] bg-surface">
        {(["today", "yesterday", "7d", "30d"] as const).map((k) => (
          <PickRow key={k} label={RANGE_LABEL[k]} sub={k === "today" || k === "yesterday" ? "By business day" : "Up to today"} on={value.key === k} onClick={() => onChange({ key: k })} />
        ))}
      </div>
      <div className="mt-3 rounded-[20px] bg-surface p-4">
        <div className="text-[14.5px] font-bold">Custom range</div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-2">From</span>
            <input type="date" value={from} max={isoToday()} onChange={(e) => setFrom(e.target.value)} className="h-12 w-full rounded-xl border border-line-2 bg-ground px-3 text-[14px] font-semibold" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-2">To</span>
            <input type="date" value={to} max={isoToday()} onChange={(e) => setTo(e.target.value)} className="h-12 w-full rounded-xl border border-line-2 bg-ground px-3 text-[14px] font-semibold" />
          </label>
        </div>
        {tooLong && <p className="mt-2 text-[12.5px] font-bold text-warn">Pick at most 3 months at a time.</p>}
        <button type="button" disabled={bad} onClick={() => onChange({ key: "custom", from, to })} className="mt-3 h-12 w-full rounded-2xl bg-dark text-[14px] font-extrabold text-on-dark disabled:opacity-40">
          Show this range
        </button>
      </div>
    </Sheet>
  );
}
