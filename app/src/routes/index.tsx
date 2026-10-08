import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Pencil, Percent, ReceiptText, RefreshCw, Table2, XCircle } from "lucide-react";
import { OutletPicker, useOutlets } from "@/components/pickers";
import { Dot, ErrorState, IconTile, Screen, Section, Skeleton, cn } from "@/components/ui";
import type { Attention, HomeOutlet, HomeResult, Outlet } from "@/lib/api";
import { ago, delta, greeting, hourLabel, initials, money, moneyShort, time, weekday } from "@/lib/format";
import { pcLine } from "@/lib/pc";
import { useOwner } from "@/lib/session";
import { useCall, useServerNow } from "@/lib/useCall";

export const Route = createFileRoute("/")({ component: Home });

// Home · all outlets (design v1). Sales so far today across every outlet,
// what is live right now, each outlet with its PC state, and the newest thing
// worth a look. Figures are as of the outlets' last upload (every 3 min).

const TONE_TEXT = { ok: "text-ok", warn: "text-warn", muted: "text-ink-2" } as const;
const TONE_DOT = { ok: "bg-ok", warn: "bg-warn", muted: "bg-ink-3" } as const;

function Home() {
  const { owner } = useOwner();
  const navigate = useNavigate();
  const q = useCall<HomeResult>("home");
  const { outlets, refresh: refreshOutlets } = useOutlets();
  const now = useServerNow(q.skew);
  const data = q.data;
  const rows = data?.outlets ?? [];
  const named = (id: number) => outlets.find((o) => o.id === id);

  const total = rows.reduce((a, r) => a + r.net, 0);
  const compare = rows.reduce((a, r) => a + r.compareNet, 0);
  const bills = rows.reduce((a, r) => a + r.bills, 0);
  const items = rows.reduce((a, r) => a + r.items, 0);
  const running = rows.reduce((a, r) => a + r.runningTables, 0);
  const tables = rows.reduce((a, r) => a + r.totalTables, 0);
  const open = rows.reduce((a, r) => a + r.openAmount, 0);
  const cancelled = rows.reduce((a, r) => a + r.cancelled, 0);
  const d = delta(total, compare);
  const busiest = [...rows].sort((a, b) => b.runningTables - a.runningTables || b.net - a.net)[0];
  const online = outlets.filter((o) => o.pc.status === "online").length;
  const offline = outlets.filter((o) => o.pc.status === "offline").length;

  return (
    <Screen>
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/profile" aria-label="Profile and settings" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-dark font-display text-[15px] font-bold text-on-dark">
            {initials(owner.name)}
          </Link>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink-2">{greeting()}</div>
            <div className="truncate font-display text-[19px] font-bold leading-tight">{owner.name || "Owner"}</div>
          </div>
        </div>
        {outlets.length > 0 && <OutletPicker value="all" outlets={outlets} onChange={(v) => v !== "all" && navigate({ to: "/outlet/$outletId", params: { outletId: String(v) } })} />}
      </header>
      <div className="flex items-center justify-between px-5 pt-4 text-[12.5px] font-semibold text-ink-2">
        <span>Today · {weekday(new Date(now))}</span>
        <button
          type="button"
          onClick={() => {
            void q.refresh();
            void refreshOutlets();
          }}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className={cn("size-[15px]", q.refreshing && "animate-spin")} />
          {data ? `Updated ${ago(data.serverTime, now)}` : "Updating…"}
        </button>
      </div>

      {q.loading ? (
        <div className="space-y-2.5 px-4 pt-2.5">
          <Skeleton className="h-[260px] rounded-3xl" />
          <div className="grid grid-cols-3 gap-2.5">
            <Skeleton className="h-[110px]" />
            <Skeleton className="h-[110px]" />
            <Skeleton className="h-[110px]" />
          </div>
          <Skeleton className="h-[90px]" />
        </div>
      ) : q.error && !data ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : (
        <>
          <div className="mx-4 mt-2.5 rounded-3xl bg-dark px-5 pb-4 pt-5 text-on-dark">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-on-dark-2">
                Net sales today · {rows.length === 1 ? named(rows[0]!.id)?.name || "1 outlet" : `${rows.length} outlets`}
              </span>
              {d && (
                <span className={cn("shrink-0 rounded-[10px] px-2.5 py-1 text-xs font-extrabold", d.up ? "bg-[#1E3527] text-[#9BE3B5]" : "bg-[#3B2020] text-[#FFB4B4]")}>
                  {d.text} {rows[0]?.compareLabel}
                </span>
              )}
            </div>
            <div className="num mt-1.5 text-[40px] font-extrabold leading-tight tracking-[-0.8px]">{money(total)}</div>
            <SalesCurve rows={rows} />
            <div className="mt-3.5 grid grid-cols-3 border-t border-dark-line pt-3.5">
              <HeroStat label="Bills" value={String(bills)} />
              <HeroStat label="Avg bill" value={bills ? money(total / bills) : "—"} border />
              <HeroStat label="Items" value={String(Math.round(items))} border />
            </div>
          </div>

          <Section title="Live now" right="View only" />
          <div className="grid grid-cols-3 gap-2.5 px-4">
            <LiveTile
              go={busiest ? () => void navigate({ to: "/tables/$outletId", params: { outletId: String(busiest.id) } }) : null}
              tone="brand"
              icon={Table2}
              value={
                <>
                  {running}
                  <span className="text-[13px] font-semibold text-ink-3"> /{tables}</span>
                </>
              }
              label="Running tables"
            />
            <LiveTile go={() => void navigate({ to: "/bills", search: { filter: "running" } })} tone="info" icon={ReceiptText} value={moneyShort(open)} label="On open bills" />
            <LiveTile go={() => void navigate({ to: "/bills", search: { filter: "cancelled" } })} tone="warn" icon={XCircle} value={String(cancelled)} label="Cancelled" />
          </div>

          <Section title="Your outlets" right={`${online} online${offline ? ` · ${offline} offline` : ""}`} />
          <div className="flex flex-col gap-2.5 px-4">
            {outlets.map((o) => (
              <OutletCard key={o.id} outlet={o} row={rows.find((r) => r.id === o.id)} total={total} now={now} />
            ))}
          </div>

          {data?.attention && (
            <>
              <Section title="Needs your attention" right={<Link to="/alerts" className="text-brand">See all</Link>} />
              <div className="px-4">
                <AttentionCard a={data.attention} outletName={named(data.attention.outletId)?.name || ""} />
              </div>
            </>
          )}
          {q.error && <p className="mx-5 mt-3 text-[12.5px] font-bold text-warn">Could not refresh: {q.error}</p>}
        </>
      )}
    </Screen>
  );
}

function HeroStat({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div className={cn("min-w-0", border && "border-l border-dark-line pl-3.5")}>
      <div className="text-[11.5px] font-semibold text-on-dark-2">{label}</div>
      <div className="num mt-0.5 truncate text-[19px] font-bold">{value}</div>
    </div>
  );
}

/** Cumulative sales through the business day so far, every outlet added up hour by hour. */
function SalesCurve({ rows }: { rows: HomeOutlet[] }) {
  const nowIndex = Math.max(0, ...rows.map((r) => r.nowIndex));
  const hours = Array.from({ length: 24 }, (_, i) => rows.reduce((a, r) => a + (r.hourly[i]?.amount || 0), 0));
  const firstSale = hours.findIndex((v) => v > 0);
  if (firstSale === -1 || !rows.length) {
    return <div className="mt-3 flex h-[60px] items-center justify-center rounded-2xl border border-dashed border-dark-line text-[12.5px] font-semibold text-on-dark-2">No sales yet today</div>;
  }
  const start = Math.max(0, Math.min(firstSale - 1, nowIndex - 3));
  const end = Math.max(nowIndex, start + 3);
  const cum: number[] = [];
  let run = 0;
  for (let i = start; i <= end; i++) {
    run += hours[i] || 0;
    cum.push(run);
  }
  const W = 318;
  const H = 56;
  const max = Math.max(...cum) || 1;
  const pts = cum.map((v, i) => [Math.round((i * W) / (cum.length - 1)), Math.round(H - (v / max) * (H - 4)) + 2] as const);
  const line = pts.map((p) => p.join(",")).join(" ");
  const last = pts[pts.length - 1]!;
  const startHour = rows[0]?.hourly[0]?.hour ?? 0;
  const label = (i: number) => hourLabel((startHour + i) % 24);
  const third = Math.round((end - start) / 3);
  return (
    <>
      <svg viewBox="0 0 318 60" className="mt-2 block h-[60px] w-full" preserveAspectRatio="none" aria-label="Sales through the day">
        <polygon points={`0,60 ${line} ${W},60`} fill="#FF5C6C" fillOpacity="0.14" />
        <polyline points={line} fill="none" stroke="#FF6B79" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={Math.min(last[0], W - 4)} cy={last[1]} r="4" fill="#FF6B79" stroke="#201815" strokeWidth="2" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-[#A8988F]">
        <span>{label(start)}</span>
        <span>{label(start + third)}</span>
        <span>{label(start + 2 * third)}</span>
        <span>Now</span>
      </div>
    </>
  );
}

function LiveTile({ go, tone, icon, value, label }: { go: (() => void) | null; tone: "brand" | "info" | "warn"; icon: typeof Table2; value: React.ReactNode; label: string }) {
  const body = (
    <>
      <IconTile tone={tone} icon={icon} className="size-8 rounded-[10px] [&>svg]:size-[18px]" />
      <div className="num mt-2.5 truncate text-[22px] font-extrabold">{value}</div>
      <div className="text-xs font-semibold text-ink-2">{label}</div>
    </>
  );
  const cls = "block min-w-0 rounded-[18px] bg-surface px-3 py-3.5 text-left text-ink";
  return go ? (
    <button type="button" onClick={go} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function OutletCard({ outlet, row, total, now }: { outlet: Outlet; row: HomeOutlet | undefined; total: number; now: number }) {
  const line = pcLine(outlet.pc, now);
  const share = row && row.net > 0 && total > 0 ? Math.max(2, Math.round((row.net / total) * 100)) : 0;
  const noPc = outlet.pc.status === "not-registered";
  return (
    <Link
      to="/outlet/$outletId"
      params={{ outletId: String(outlet.id) }}
      className={cn("block rounded-[18px] bg-surface p-4 text-ink", line.tone === "warn" && "shadow-[inset_0_0_0_1.5px_var(--color-warn-line)]")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold">{outlet.name}</div>
          {outlet.planExpired && <div className="mt-1 inline-block rounded-md bg-brand px-1.5 text-[10.5px] font-extrabold text-white">PLAN ENDED · TAP TO RENEW</div>}
          <div className={cn("mt-1 flex items-center gap-1.5 text-xs font-bold", TONE_TEXT[line.tone])}>
            <Dot className={TONE_DOT[line.tone]} />
            <span className="truncate">{line.label}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="num text-[17px] font-extrabold">{row && !(noPc && row.net === 0) ? money(row.net) : "—"}</div>
          <div className="text-xs font-semibold text-ink-2">
            {noPc ? "" : outlet.pc.status === "offline" && outlet.pc.lastSeenAt ? `as of ${time(outlet.pc.lastSeenAt)}` : row ? `${row.runningTables} table${row.runningTables === 1 ? "" : "s"} running` : ""}
          </div>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track">
        <div className={cn("h-1.5 rounded-full", line.tone === "warn" ? "bg-[#C9A27E]" : "bg-brand")} style={{ width: `${share}%` }} />
      </div>
    </Link>
  );
}

const ATTENTION = {
  "cancel-after-kot": { icon: XCircle, tone: "brand" as const, title: (a: Attention) => `Bill #${a.billNo} cancelled after KOT` },
  cancel: { icon: XCircle, tone: "brand" as const, title: (a: Attention) => `Bill #${a.billNo} cancelled` },
  edited: { icon: Pencil, tone: "warn" as const, title: (a: Attention) => `Settled bill #${a.billNo} edited` },
  discount: { icon: Percent, tone: "brand" as const, title: (a: Attention) => `${a.pct}% discount on bill #${a.billNo}` },
};

function AttentionCard({ a, outletName }: { a: Attention; outletName: string }) {
  const k = ATTENTION[a.kind] ?? { icon: AlertTriangle, tone: "warn" as const, title: () => `Bill #${a.billNo}` };
  return (
    <Link to="/bill/$outletId/$billId" params={{ outletId: String(a.outletId), billId: a.billId }} className="flex gap-3 rounded-[20px] bg-surface p-4 text-ink">
      <IconTile tone={k.tone} icon={k.icon} />
      <div className="min-w-0">
        <div className="text-sm font-bold">{k.title(a)}</div>
        <div className="mt-0.5 text-[12.5px] font-semibold text-ink-2">
          {[a.kind === "discount" ? `${money(a.amount)} off` : money(a.amount), outletName, a.by, time(a.at)].filter(Boolean).join(" · ")}
        </div>
      </div>
    </Link>
  );
}

