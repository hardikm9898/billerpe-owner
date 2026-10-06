import { createFileRoute, Link } from "@tanstack/react-router";
import { Monitor } from "lucide-react";
import { useState } from "react";
import { RangeSheet, Segmented, useOutlets } from "@/components/pickers";
import { Card, ErrorState, Screen, Section, Skeleton, TopBar, cn } from "@/components/ui";
import type { OutletResult, Range, RangeKey } from "@/lib/api";
import { ago, day, delta, hourLabel, money, qty, time } from "@/lib/format";
import { pcLine } from "@/lib/pc";
import { useCall, useServerNow } from "@/lib/useCall";

export const Route = createFileRoute("/outlet/$outletId")({ component: OutletScreen });

// Outlet live (design v1): one outlet for today, yesterday, 7 days or any
// range - sales by hour (or by day), bills, items, discount, tax, expenses,
// what is running right now, the cash drawer, payment mix and top items.

const SEG: { key: RangeKey | "custom"; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "custom", label: "Custom" },
];
const MIX = ["#AE0A1E", "#E0868F", "#3E302B", "#C9A27E", "#8A7A72", "#F0B7BD"];

function OutletScreen() {
  const { outletId } = Route.useParams();
  const [range, setRange] = useState<Range>({ key: "today" });
  const [customOpen, setCustomOpen] = useState(false);
  const q = useCall<OutletResult>("outlet", [Number(outletId), range]);
  const { outlets } = useOutlets();
  const outlet = outlets.find((o) => String(o.id) === outletId);
  const now = useServerNow(q.skew);
  const x = q.data;
  const line = outlet ? pcLine(outlet.pc, now) : null;

  return (
    <Screen>
      <TopBar
        title={outlet?.name || x?.name || "Outlet"}
        sub={line ? `● ${line.label}` : ""}
        subClass={line?.tone === "ok" ? "text-ok" : line?.tone === "warn" ? "text-warn" : ""}
        right={
          <Link to="/pc/$outletId" params={{ outletId }} aria-label="Outlet PC" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line-2 bg-surface">
            <Monitor className="size-5" />
          </Link>
        }
      />
      <div className="px-4 pt-2">
        <Segmented
          items={SEG}
          value={range.key === "30d" ? "custom" : range.key}
          onChange={(k) => (k === "custom" ? setCustomOpen(true) : setRange({ key: k as RangeKey }))}
        />
        {range.key === "custom" && x && <p className="mt-2 text-center text-[12.5px] font-bold text-ink-2">{x.range.from === x.range.to ? day(x.range.from) : `${day(x.range.from)} – ${day(x.range.to)}`}</p>}
      </div>
      <RangeSheet
        open={customOpen}
        value={range}
        onClose={() => setCustomOpen(false)}
        onChange={(r) => {
          setRange(r);
          setCustomOpen(false);
        }}
      />

      {q.loading ? (
        <div className="space-y-2.5 px-4 pt-3">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[110px]" />
          <Skeleton className="h-[140px]" />
        </div>
      ) : q.error && !x ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : x ? (
        <>
          <div className="px-4 pt-3">
            <Card>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink-2">Net sales</span>
                <DeltaTag now={x.net} before={x.compareNet} label={x.compareLabel} />
              </div>
              <div className="num mt-1 text-[34px] font-extrabold tracking-[-0.6px]">{money(x.net)}</div>
              {x.hourly ? <HourBars hours={x.hourly} nowIndex={x.nowIndex} /> : x.daily ? <DayBars days={x.daily} /> : null}
              <div className="mt-3.5 grid grid-cols-3 gap-y-3 border-t border-line pt-3.5">
                <Stat label="Bills" value={String(x.bills)} />
                <Stat label="Avg bill" value={x.bills ? money(x.avgBill) : "—"} />
                <Stat label="Items" value={qty(Math.round(x.items))} />
                <Stat label="Discount" value={money(x.discount)} />
                <Stat label="Tax" value={money(x.tax)} />
                <Stat label="Expenses" value={money(x.expenses)} />
              </div>
              {x.cancelled > 0 && (
                <Link to="/bills" search={{ filter: "cancelled", outlet: x.id, range: x.range.key === "custom" ? undefined : x.range.key }} className="mt-3 block text-[12.5px] font-bold text-brand">
                  {`${x.cancelled} cancelled bill${x.cancelled === 1 ? "" : "s"} →`}
                </Link>
              )}
            </Card>
          </div>

          <Section title="Right now" right={`as of ${time(x.serverTime)}`} />
          <div className="grid grid-cols-2 gap-2.5 px-4">
            <Link to="/tables/$outletId" params={{ outletId }} className="block rounded-[20px] bg-surface p-4 text-ink">
              <div className="text-xs font-bold text-ink-2">Running tables</div>
              <div className="num mt-1 text-2xl font-extrabold">
                {x.runningTables} <span className="text-[13px] text-ink-3">of {x.totalTables}</span>
              </div>
              <div className="text-[12.5px] font-semibold text-ink-2">{money(x.openAmount)} on open bills</div>
            </Link>
            <Card>
              <div className="text-xs font-bold text-ink-2">Cash drawer</div>
              {x.cash ? (
                <>
                  <div className="num mt-1 text-2xl font-extrabold">{money(x.cash.expected)}</div>
                  <div className="text-[12.5px] font-semibold text-ink-2">
                    {x.cash.openedAt ? `Open since ${time(x.cash.openedAt)}` : "Open"}
                    {x.cash.by ? ` · ${x.cash.by}` : ""}
                  </div>
                </>
              ) : (
                <>
                  <div className="num mt-1 text-2xl font-extrabold text-ink-3">Closed</div>
                  <div className="text-[12.5px] font-semibold text-ink-2">No cash session open</div>
                </>
              )}
            </Card>
          </div>

          <Section title="Payment mix" />
          <div className="px-4">
            <Card>
              {x.payments.length ? (
                <>
                  <div className="flex h-3 gap-0.5 overflow-hidden rounded-md">
                    {x.payments.map((p, i) => (
                      <i key={p.name} style={{ width: `${(p.amount / x.net) * 100}%`, background: MIX[i % MIX.length] }} />
                    ))}
                  </div>
                  <div className="mt-3.5 grid grid-cols-2 gap-x-2.5 gap-y-3">
                    {x.payments.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: MIX[i % MIX.length] }} />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-bold">
                            {p.name} · {x.net ? Math.round((p.amount / x.net) * 100) : 0}%
                          </div>
                          <div className="num text-[12.5px] font-semibold text-ink-2">{money(p.amount)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-[13px] font-semibold text-ink-2">No settled bills in this period</p>
              )}
            </Card>
          </div>

          <Section title="Top items" />
          <div className="px-4">
            {x.topItems.length ? (
              <div className="overflow-hidden rounded-[20px] bg-surface">
                {x.topItems.map((it, i) => (
                  <div key={it.name} className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-3 first:border-t-0">
                    <span className="num flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted-soft font-extrabold text-ink-2">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-bold">{it.name}</div>
                      <div className="text-[12.5px] font-semibold text-ink-2">{qty(it.qty)} sold</div>
                    </div>
                    <span className="num text-[15px] font-extrabold">{money(it.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center text-[13px] font-semibold text-ink-2">No items sold in this period</Card>
            )}
          </div>
          <p className="mx-5 mt-4 text-center text-[12px] font-semibold text-ink-3">Updated {ago(x.serverTime, now)} · bills arrive from the outlet PC every 3 min</p>
        </>
      ) : null}
    </Screen>
  );
}

function DeltaTag({ now, before, label }: { now: number; before: number; label: string }) {
  const d = delta(now, before);
  if (!d) return null;
  return <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11.5px] font-extrabold", d.up ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand")}>{`${d.text} ${label}`}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-bold text-ink-2">{label}</div>
      <div className="num truncate text-lg font-extrabold">{value}</div>
    </div>
  );
}

/** Sales per hour of the business day; the peak hour in crimson, hours still to come faded. */
function HourBars({ hours, nowIndex }: { hours: { hour: number; amount: number }[]; nowIndex: number | null }) {
  const firstSale = hours.findIndex((h) => h.amount > 0);
  let lastSale = -1;
  hours.forEach((h, i) => h.amount > 0 && (lastSale = i));
  if (firstSale === -1) return <div className="mt-3.5 flex h-[84px] items-center justify-center rounded-2xl border border-dashed border-line-2 text-[12.5px] font-semibold text-ink-2">No sales yet</div>;
  const start = Math.max(0, firstSale - 1);
  const end = Math.min(23, Math.max(lastSale + 1, nowIndex ?? lastSale, start + 5));
  const shown = hours.slice(start, end + 1);
  const max = Math.max(...shown.map((h) => h.amount)) || 1;
  const peak = shown.reduce((a, b) => (b.amount > a.amount ? b : a));
  return (
    <>
      <div className="mt-3.5 flex h-[84px] items-end gap-1.5" aria-label="Sales by hour">
        {shown.map((h, i) => (
          <i
            key={h.hour}
            className={cn("flex-1 rounded", h === peak ? "bg-brand" : "bg-bar", nowIndex !== null && start + i > nowIndex && "opacity-50")}
            style={{ height: `${Math.max(4, Math.round((h.amount / max) * 84))}px` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-ink-3">
        <span>{hourLabel(shown[0]!.hour)}</span>
        <span>
          Peak {hourLabel(peak.hour)} · {money(peak.amount)}
        </span>
        <span>{hourLabel(shown[shown.length - 1]!.hour)}</span>
      </div>
    </>
  );
}

function DayBars({ days }: { days: { day: string; amount: number }[] }) {
  const max = Math.max(...days.map((d) => d.amount)) || 1;
  const best = days.reduce((a, b) => (b.amount > a.amount ? b : a));
  return (
    <>
      <div className="mt-3.5 flex h-[84px] items-end gap-1" aria-label="Sales by day">
        {days.map((d) => (
          <i key={d.day} className={cn("flex-1 rounded", d === best && d.amount > 0 ? "bg-brand" : "bg-bar")} style={{ height: `${Math.max(4, Math.round((d.amount / max) * 84))}px` }} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-ink-3">
        <span>{day(days[0]!.day)}</span>
        {best.amount > 0 && (
          <span>
            Best {day(best.day)} · {money(best.amount)}
          </span>
        )}
        <span>{day(days[days.length - 1]!.day)}</span>
      </div>
    </>
  );
}

