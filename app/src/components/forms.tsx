import { Check, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Sheet } from "./pickers";
import { cn } from "./ui";

// Form pieces of the Manage screens (design v1).

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn("relative h-7 w-[46px] shrink-0 rounded-full transition-colors disabled:opacity-50", on ? "bg-ok" : "bg-switch-off")}
    >
      <span className={cn("absolute top-[3px] size-[22px] rounded-full bg-white shadow transition-all", on ? "left-[21px]" : "left-[3px]")} />
    </button>
  );
}

export function Field({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-bold text-ink-2">{label}</span>
      <input {...input} className={cn("h-[50px] w-full rounded-[14px] border border-line-2 bg-surface px-3.5 text-[15px] font-semibold outline-none focus:border-ink disabled:bg-muted-soft disabled:text-ink-2", input.className)} />
      {hint && <span className="mt-1 block text-xs font-semibold text-ink-2">{hint}</span>}
    </label>
  );
}

export function SelectField({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-bold text-ink-2">{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="h-[50px] w-full rounded-[14px] border border-line-2 bg-surface px-3 text-[15px] font-semibold outline-none focus:border-ink disabled:bg-muted-soft">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Two or more choices side by side (Veg / Non-veg, % / ₹). */
export function Choice<K extends string>({ label, value, onChange, options }: { label: string; value: K; onChange: (k: K) => void; options: { key: K; label: string }[] }) {
  return (
    <div>
      <span className="mb-1.5 block text-[12.5px] font-bold text-ink-2">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn("h-10 rounded-full border px-4 text-[13px] font-bold", o.key === value ? "border-dark bg-dark text-on-dark" : "border-line-2 bg-surface")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SaveButton({ busy, children, onClick, tone = "brand", disabled }: { busy: boolean; children: ReactNode; onClick: () => void; tone?: "brand" | "dark" | "ghost" | "danger"; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={onClick}
      className={cn(
        "flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold disabled:opacity-50",
        tone === "brand" && "bg-brand text-white",
        tone === "dark" && "bg-dark text-on-dark",
        tone === "ghost" && "border border-line-2 bg-surface text-ink",
        tone === "danger" && "border border-brand/30 bg-brand-soft text-brand-dark",
      )}
    >
      {busy && <Loader2 className="size-5 animate-spin" />}
      {children}
    </button>
  );
}

export function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-brand-soft px-3.5 py-3 text-[13px] font-bold text-brand-dark">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  );
}

/** The confirmation after a change, above the bottom tabs (design: "Price saved. CG Road PC gets it in about a minute."). */
export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-4 bottom-[92px] z-40 flex items-center gap-2.5 rounded-2xl bg-dark px-3.5 py-3 text-[13px] font-semibold text-on-dark shadow-[0_12px_24px_-10px_rgba(0,0,0,0.5)]">
      <Check className="size-5 shrink-0 text-[#9BE3B5]" />
      {text}
    </div>
  );
}

/** "Syncing…" next to something the outlet PC has not downloaded yet. */
export function Syncing() {
  return (
    <span className="inline-flex items-center gap-1 text-info">
      <RefreshCw className="size-3" />
      Syncing…
    </span>
  );
}

export function ConfirmSheet({ open, onClose, title, text, confirm, busy, onConfirm }: { open: boolean; onClose: () => void; title: string; text: string; confirm: string; busy: boolean; onConfirm: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="px-1 text-[14px] font-semibold leading-relaxed text-ink-2">{text}</p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <SaveButton busy={false} tone="ghost" onClick={onClose}>
          Cancel
        </SaveButton>
        <SaveButton busy={busy} tone="brand" onClick={onConfirm}>
          {confirm}
        </SaveButton>
      </div>
    </Sheet>
  );
}

/** Where a change goes: "CG Road PC gets it in about a minute" / "applies when the PC is back online". */
export function reachText(outletName: string, pcOnline: boolean | null) {
  const short = outletName.includes(" · ") ? outletName.split(" · ").pop()! : outletName;
  if (pcOnline === false) return `Saved. ${short} PC is offline - it gets this when it reconnects.`;
  return `Saved. ${short} PC gets it in about a minute.`;
}
