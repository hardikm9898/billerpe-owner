import { useEffect, useRef, useState } from "react";
import type { AlertRules as Rules } from "@/lib/api";
import { useAction } from "@/lib/useAction";
import { useCall } from "@/lib/useCall";
import { ErrorNote, Switch } from "./forms";
import { Section, Skeleton } from "./ui";

// Alert rules (design v1 Profile): each alert on or off, with its limit.
// One set for all the owner's outlets; saved at once.

const ROWS: { key: keyof Rules; title: string; sub: (r: Rules) => string }[] = [
  { key: "pcOffline", title: "Outlet PC offline", sub: (r) => `Alert after ${r.pcOffline.minutes} min without contact` },
  { key: "discount", title: "Big discount", sub: (r) => `Above ${r.discount.pct}% of the bill` },
  { key: "cancelAfterKot", title: "Cancelled after KOT", sub: () => "Food was already sent to the kitchen" },
  { key: "edited", title: "Settled bill edited", sub: () => "Any change after payment" },
  { key: "cashDiff", title: "Cash difference at closing", sub: () => "Drawer does not match" },
  { key: "lowStock", title: "Low stock", sub: () => "Below the item's minimum level" },
  { key: "summary", title: "Day summary", sub: (r) => `Every night at ${time12(r.summary.time)}` },
];
const MINUTES = [5, 10, 15, 30, 60];
const PCTS = [10, 15, 20, 25, 30, 40, 50];

function time12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h! % 12 === 0 ? 12 : h! % 12}:${String(m).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`;
}

export function AlertRules() {
  const q = useCall<{ rules: Rules }>("alertRules", [], 600000);
  const [rules, setRules] = useState<Rules | null>(null);
  const act = useAction();
  useEffect(() => {
    if (q.data && !latest.current) setRules(q.data.rules);
  }, [q.data]);

  // Two quick taps must not undo each other: every save sends the whole
  // set as it now stands on screen, one save after the other.
  const latest = useRef<Rules | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const save = (patch: Partial<Rules>) => {
    const base = latest.current ?? rules;
    if (!base) return;
    const next = { ...base, ...patch } as Rules;
    latest.current = next;
    setRules(next);
    chain.current = chain.current.then(async () => {
      const r = await act.run<{ rules: Rules }>("saveAlertRules", [latest.current]);
      if (r && latest.current === next) setRules(r.rules);
    });
  };

  return (
    <div id="rules">
      <Section title="Alert rules" right="All outlets" />
      {!rules ? (
        <div className="px-4">
          <Skeleton className="h-[420px] rounded-[20px]" />
        </div>
      ) : (
        <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
          {ROWS.map((row) => {
            const rule = rules[row.key] as { on: boolean };
            return (
              <div key={row.key} className="border-t border-line px-3.5 py-3 first:border-t-0">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-bold">{row.title}</div>
                    <div className="text-[12.5px] font-semibold text-ink-2">{row.sub(rules)}</div>
                  </div>
                  <Switch on={rule.on} label={row.title} onChange={(v) => void save({ [row.key]: { ...rules[row.key], on: v } } as Partial<Rules>)} />
                </div>
                {rule.on && row.key === "pcOffline" && (
                  <Pills values={MINUTES} value={rules.pcOffline.minutes} fmt={(v) => `${v} min`} onPick={(v) => void save({ pcOffline: { ...rules.pcOffline, minutes: v } })} />
                )}
                {rule.on && row.key === "discount" && <Pills values={PCTS} value={rules.discount.pct} fmt={(v) => `${v}%`} onPick={(v) => void save({ discount: { ...rules.discount, pct: v } })} />}
                {rule.on && row.key === "summary" && (
                  <label className="mt-2 flex items-center gap-2 text-[12.5px] font-bold text-ink-2">
                    Time
                    <input type="time" value={rules.summary.time} onChange={(e) => e.target.value && void save({ summary: { ...rules.summary, time: e.target.value } })} className="h-10 rounded-xl border border-line-2 bg-ground px-3 text-sm font-semibold text-ink" />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="px-4 pt-2">
        <ErrorNote text={act.error} />
      </div>
    </div>
  );
}

function Pills({ values, value, fmt, onPick }: { values: number[]; value: number; fmt: (v: number) => string; onPick: (v: number) => void }) {
  return (
    <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
      {values.map((v) => (
        <button key={v} type="button" onClick={() => onPick(v)} className={`h-8 shrink-0 rounded-full border px-3 text-[12.5px] font-bold ${v === value ? "border-dark bg-dark text-on-dark" : "border-line-2 bg-ground"}`}>
          {fmt(v)}
        </button>
      ))}
    </div>
  );
}
