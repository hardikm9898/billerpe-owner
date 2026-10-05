import { createFileRoute } from "@tanstack/react-router";
import { Info, Monitor, WifiOff } from "lucide-react";
import { Card, ErrorState, IconTile, Screen, Section, Skeleton, Tag, TopBar, cn } from "@/components/ui";
import type { OutletsResult, PcHistory } from "@/lib/api";
import { ago, fullDate, time, weekday } from "@/lib/format";
import { pcLine, updateLine } from "@/lib/pc";
import { useCall, useServerNow } from "@/lib/useCall";

export const Route = createFileRoute("/pc/$outletId")({ component: OutletPcScreen });

// The outlet PC's health (design v1 "Outlet PC health"), view only: online,
// last data sync, bills still on the PC, BillerPe version and update.

function OutletPcScreen() {
  const { outletId } = Route.useParams();
  const q = useCall<OutletsResult>("outlets");
  const h = useCall<PcHistory>("pcHistory", [Number(outletId)]);
  const history = h.data;
  const now = useServerNow(q.skew);
  const outlet = q.data?.outlets.find((o) => String(o.id) === outletId);

  if (q.loading)
    return (
      <Screen>
        <TopBar title="Outlet" />
        <div className="space-y-2.5 px-4 pt-2">
          <Skeleton className="h-[84px]" />
          <Skeleton className="h-[260px]" />
        </div>
      </Screen>
    );
  if (q.error && !q.data)
    return (
      <Screen>
        <TopBar title="Outlet" />
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      </Screen>
    );
  if (!outlet)
    return (
      <Screen>
        <TopBar title="Outlet" />
        <Card className="mx-4 mt-4 text-center text-sm font-semibold text-ink-2">This outlet is no longer on your account.</Card>
      </Screen>
    );

  const pc = outlet.pc;
  const line = pcLine(pc, now);
  const update = updateLine(pc.updateStatus);
  const big = {
    ok: { box: "bg-ok-soft", circle: "bg-ok", text: "text-ok", sub: "text-[#1F5A36]", icon: Monitor },
    warn: { box: "bg-warn-soft", circle: "bg-warn", text: "text-warn", sub: "text-[#6E3A0A]", icon: WifiOff },
    muted: { box: "bg-muted-soft", circle: "bg-ink-3", text: "text-ink-2", sub: "text-ink-2", icon: Monitor },
  }[line.tone];
  const BigIcon = big.icon;

  return (
    <Screen>
      <TopBar title="Outlet PC" sub={outlet.name} />
      <div className="px-4 pt-1.5">
        <div className={cn("flex items-center gap-3.5 rounded-[20px] p-4", big.box)}>
          <span className={cn("flex size-[52px] shrink-0 items-center justify-center rounded-full text-white", big.circle)}>
            <BigIcon className="size-6" />
          </span>
          <div className="min-w-0">
            <div className={cn("font-display text-[22px] font-extrabold", big.text)}>{line.short}</div>
            <div className={cn("text-[12.5px] font-semibold", big.sub)}>
              {pc.status === "not-registered" ? "Install BillerPe on the outlet PC and log in once from the Web POS." : `Last heard ${ago(pc.lastSeenAt, now)}${pc.lastSeenAt ? ` · ${time(pc.lastSeenAt)}` : ""}`}
            </div>
          </div>
        </div>
      </div>

      {pc.status !== "not-registered" && (
        <>
          <Section title="Details" />
          <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
            <Row
              title="Data synced"
              sub={pc.lastPushAt ? "Bills reach the cloud every 3 min" : "Update BillerPe on this PC to see this"}
              end={pc.lastPushAt ? time(pc.lastPushAt) : "—"}
              endTag={pc.lastPushAt ? <span className="text-[11.5px] font-bold text-ink-2">{ago(pc.lastPushAt, now)}</span> : null}
            />
            <Row
              title="Bills waiting to upload"
              sub={pc.pendingOrders === null ? "Update BillerPe on this PC to see this" : pc.status === "offline" && pc.pendingOrders ? "On the PC; they upload when it reconnects" : "Made on the PC, not yet in the cloud"}
              end={pc.pendingOrders === null ? "—" : String(pc.pendingOrders)}
              endTag={pc.pendingOrders ? <Tag tone="warn">Waiting</Tag> : null}
            />
            <Row title="BillerPe server" sub={update?.text || "On the outlet PC"} end={pc.version || "—"} endTag={update ? <Tag tone={update.tone}>{update.tone === "warn" ? "Needs help" : "Updating"}</Tag> : pc.version ? <Tag tone="ok">Running</Tag> : null} />
            <Row title="PC name" sub="The registered outlet PC" end={pc.pcName || "—"} />
            <Row title="Registered since" sub="When this PC became the outlet's server" end={pc.registeredAt ? fullDate(pc.registeredAt) : "—"} />
            {outlet.subscriptionEndsOn && <Row title="BillerPe plan" sub="Web POS + Captain App" end={`till ${fullDate(outlet.subscriptionEndsOn)}`} />}
          </div>
        </>
      )}

      {pc.status !== "not-registered" && history && (
        <>
          <Section title="Offline in the last 7 days" />
          {history.periods.length === 0 ? (
            <Card className="mx-4 text-[13px] font-semibold text-ink-2">No offline spells recorded.</Card>
          ) : (
            <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
              {history.periods.map((p) => (
                <div key={p.from} className="flex min-h-[56px] items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0">
                  <IconTile tone="warn" icon={WifiOff} />
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold">
                      {weekday(p.from)} · {time(p.from)} – {p.to ? time(p.to) : "now"}
                    </div>
                    <div className="text-[12.5px] font-semibold text-ink-2">
                      {p.minutes >= 60 ? `${Math.floor(p.minutes / 60)} h ${p.minutes % 60} min` : `${p.minutes} min`}
                      {p.to ? " · back online" : " · still offline"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-2xl bg-muted-soft px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed text-ink-2">
        <IconTile tone="muted" icon={Info} className="size-7 rounded-lg bg-transparent" />
        <span>Billing keeps working on the outlet PC even when it is offline. Its bills reach this app when it reconnects. For PC problems, call BillerPe support.</span>
      </div>
    </Screen>
  );
}

function Row({ title, sub, end, endTag }: { title: string; sub: string; end: string; endTag?: React.ReactNode }) {
  return (
    <div className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold">{title}</div>
        <div className="mt-0.5 text-[12.5px] font-semibold text-ink-2">{sub}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="num text-[14px] font-extrabold">{end}</span>
        {endTag}
      </div>
    </div>
  );
}
