import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Monitor } from "lucide-react";
import { Card, Dot, ErrorState, RefreshButton, Screen, Section, Skeleton, cn } from "@/components/ui";
import type { OutletsResult } from "@/lib/api";
import { greeting, initials, weekday } from "@/lib/format";
import { pcLine } from "@/lib/pc";
import { useOwner } from "@/lib/session";
import { useCall, useServerNow } from "@/lib/useCall";

export const Route = createFileRoute("/")({ component: Home });

// Home (design v1 "Home · all outlets"). Phase 0: every outlet with its PC's
// state. Sales, running tables and alerts join this screen in phase 1.

const TONE_TEXT = { ok: "text-ok", warn: "text-warn", muted: "text-ink-2" } as const;
const TONE_DOT = { ok: "bg-ok", warn: "bg-warn", muted: "bg-ink-3" } as const;

function Home() {
  const { owner } = useOwner();
  const q = useCall<OutletsResult>("outlets");
  const now = useServerNow(q.skew);
  const outlets = q.data?.outlets ?? [];
  const online = outlets.filter((o) => o.pc.status === "online").length;
  const offline = outlets.filter((o) => o.pc.status === "offline").length;

  return (
    <Screen>
      <header className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-3">
          <Link to="/profile" aria-label="Profile and settings" className="flex size-11 items-center justify-center rounded-full bg-dark font-display text-[15px] font-bold text-on-dark">
            {initials(owner.name)}
          </Link>
          <div>
            <div className="text-[13px] font-semibold text-ink-2">{greeting()}</div>
            <div className="font-display text-[19px] font-bold leading-tight">{owner.name || "Owner"}</div>
          </div>
        </div>
        <RefreshButton onClick={() => void q.refresh()} spinning={q.refreshing} />
      </header>
      <div className="px-5 pt-4 text-[12.5px] font-semibold text-ink-2">Today · {weekday(new Date(now))}</div>

      {q.loading ? (
        <div className="space-y-2.5 px-4 pt-3">
          <Skeleton className="h-[150px] rounded-3xl" />
          <Skeleton className="h-[86px]" />
          <Skeleton className="h-[86px]" />
        </div>
      ) : q.error && !q.data ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : (
        <>
          <div className="mx-4 mt-2.5 rounded-3xl bg-dark px-5 pb-4 pt-5 text-on-dark">
            <div className="text-[13px] font-semibold text-on-dark-2">Outlet PCs</div>
            <div className="num mt-1.5 text-[40px] font-extrabold leading-none tracking-[-0.8px]">
              {online}
              <span className="text-[22px] text-on-dark-2"> of {outlets.length} online</span>
            </div>
            <div className="mt-4 grid grid-cols-3 border-t border-dark-line pt-3.5">
              <Stat label="Outlets" value={outlets.length} />
              <Stat label="Online" value={online} border />
              <Stat label="Offline" value={offline} border warn={offline > 0} />
            </div>
          </div>
          <p className="mx-5 mt-3 text-[12.5px] font-semibold leading-relaxed text-ink-2">
            Sales, running tables and bills for each outlet arrive in the next update of this app.
          </p>

          <Section title="Your outlets" right={outlets.length === 1 ? "1 outlet" : `${outlets.length} outlets`} />
          <div className="flex flex-col gap-2.5 px-4">
            {outlets.map((o) => {
              const line = pcLine(o.pc, now);
              return (
                <Link
                  key={o.id}
                  to="/outlet/$outletId"
                  params={{ outletId: String(o.id) }}
                  className={cn("flex items-center gap-3 rounded-[20px] bg-surface p-4 text-ink", line.tone === "warn" && "shadow-[inset_0_0_0_1.5px_#EBC48F]")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-bold">{o.name}</div>
                    <div className={cn("mt-1 flex items-center gap-1.5 text-xs font-bold", TONE_TEXT[line.tone])}>
                      <Dot className={TONE_DOT[line.tone]} />
                      <span className="truncate">{line.label}</span>
                    </div>
                  </div>
                  {o.pc.version && (
                    <span className="flex items-center gap-1 text-[11.5px] font-bold text-ink-3">
                      <Monitor className="size-3.5" />
                      {o.pc.version}
                    </span>
                  )}
                  <ChevronRight className="size-5 shrink-0 text-[#9A8F88]" />
                </Link>
              );
            })}
          </div>
          {q.error && <p className="mx-5 mt-3 text-[12.5px] font-bold text-warn">Could not refresh: {q.error}</p>}
          {outlets.length > 0 && <Card className="mx-4 mt-4 text-[12.5px] font-semibold leading-relaxed text-ink-2">Billing keeps working on an outlet PC even while it is offline. Its bills reach the cloud when it reconnects.</Card>}
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value, border, warn }: { label: string; value: number; border?: boolean; warn?: boolean }) {
  return (
    <div className={cn(border && "border-l border-dark-line pl-3.5")}>
      <div className="text-[11.5px] font-semibold text-on-dark-2">{label}</div>
      <div className={cn("num mt-0.5 text-[19px] font-bold", warn && "text-[#FFC58A]")}>{value}</div>
    </div>
  );
}
