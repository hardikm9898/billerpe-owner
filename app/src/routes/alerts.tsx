import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Box, Check, Loader2, Moon, Pencil, Percent, Banknote, WifiOff, XCircle, Bell, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Chips } from "@/components/pickers";
import { BigTitle, Card, ErrorState, Screen, Section, Skeleton, cn } from "@/components/ui";
import { call, type AlertKind, type AlertRow, type AlertsResult } from "@/lib/api";
import { refreshAlertCount, setAlertCount } from "@/lib/alertCount";
import { day, time } from "@/lib/format";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/alerts")({ component: Alerts });

// Alerts (design v1): outlet PC offline / back, risky actions (cancel after
// KOT, big discount, edited settled bill, cash difference), low stock and
// the nightly day summary - each also a push notification. Tapping one
// opens the bill, outlet, stock or summary.

type Filter = "all" | "risky" | "pc" | "stock" | "summary";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "risky", label: "Risky actions" },
  { key: "pc", label: "Outlet PC" },
  { key: "stock", label: "Stock" },
  { key: "summary", label: "Day summary" },
];

const LOOK: Record<AlertKind, { icon: LucideIcon; tone: string }> = {
  "pc-offline": { icon: WifiOff, tone: "bg-warn-soft text-warn" },
  "pc-online": { icon: Check, tone: "bg-ok-soft text-ok" },
  "cancel-after-kot": { icon: XCircle, tone: "bg-brand-soft text-brand" },
  discount: { icon: Percent, tone: "bg-brand-soft text-brand" },
  edited: { icon: Pencil, tone: "bg-warn-soft text-warn" },
  "cash-diff": { icon: Banknote, tone: "bg-info-soft text-info" },
  "low-stock": { icon: Box, tone: "bg-ok-soft text-ok" },
  summary: { icon: Moon, tone: "bg-[#3A2E29] text-[#FFD08A]" },
};

function groupOf(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(today.getTime() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return "Earlier";
}

function Alerts() {
  const [filter, setFilter] = useState<Filter>("all");
  const router = useRouter();
  const q = useCall<AlertsResult>("alerts", [{ filter }], 60000);
  const [extra, setExtra] = useState<AlertRow[]>([]);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [readNow, setReadNow] = useState<Set<number>>(new Set());
  useEffect(() => {
    setExtra([]);
    setMore(q.data?.more ?? false);
    if (q.data) setAlertCount(q.data.unread);
  }, [q.data]);
  const list = [...(q.data?.alerts ?? []), ...extra].map((a) => (readNow.has(a.id) ? { ...a, read: true } : a));
  const unread = list.filter((a) => !a.read).length;

  const open = (a: AlertRow) => {
    if (!a.read) {
      setReadNow((s) => new Set(s).add(a.id));
      void call("markAlertsRead", [a.id]).then(() => refreshAlertCount()).catch(() => {});
    }
    // A link may carry a query (a report for one outlet): the history takes the whole address.
    router.history.push(a.link);
  };
  const readAll = async () => {
    setReadNow(new Set(list.map((a) => a.id)));
    try {
      const r = await call<{ unread: number }>("markAlertsRead", "all");
      setAlertCount(r.unread);
    } catch {
      /* the next refresh shows the truth */
    }
  };
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const r = await call<AlertsResult>("alerts", { filter, before: list[list.length - 1]?.id });
      setExtra((e) => [...e, ...r.alerts]);
      setMore(r.more);
    } finally {
      setLoadingMore(false);
    }
  };

  const groups = new Map<string, AlertRow[]>();
  for (const a of list) groups.set(groupOf(a.at), [...(groups.get(groupOf(a.at)) ?? []), a]);

  return (
    <Screen>
      <BigTitle
        right={
          <Link to="/profile" hash="rules" className="text-[13px] font-bold text-brand">
            Alert rules
          </Link>
        }
      >
        Alerts
      </BigTitle>
      <Chips className="mt-1.5" items={FILTERS.map((f) => ({ ...f, count: f.key === "all" && unread ? unread : undefined }))} value={filter} onChange={setFilter} />
      {q.loading ? (
        <div className="space-y-2.5 px-4 pt-3">
          <Skeleton className="h-[78px]" />
          <Skeleton className="h-[78px]" />
          <Skeleton className="h-[78px]" />
        </div>
      ) : q.error && !q.data ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : list.length === 0 ? (
        <Card className="mx-4 mt-3 flex flex-col items-center py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted-soft text-ink-2">
            <Bell className="size-6" />
          </span>
          <p className="mt-3 text-[15px] font-bold">No alerts here</p>
          <p className="mt-1 max-w-[260px] text-[13px] font-semibold text-ink-2">When an outlet PC goes offline, a bill is cancelled after KOT or stock runs low, you hear it here and on your phone.</p>
        </Card>
      ) : (
        [...groups.entries()].map(([g, rows], gi) => (
          <div key={g}>
            <Section
              title={g}
              right={
                gi === 0 && unread > 0 ? (
                  <button type="button" onClick={() => void readAll()} className="text-brand">
                    Mark all read
                  </button>
                ) : undefined
              }
            />
            <div className="flex flex-col gap-2.5 px-4">
              {rows.map((a) => {
                const look = LOOK[a.kind] ?? { icon: Bell, tone: "bg-muted-soft text-ink-2" };
                const Icon = look.icon;
                const dark = a.kind === "summary";
                return (
                  <button key={a.id} type="button" onClick={() => open(a)} className={cn("flex gap-3 rounded-[20px] p-4 text-left", dark ? "bg-dark text-on-dark" : "bg-surface text-ink", a.read && !dark && "opacity-80")}>
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", look.tone)}>
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <b className="text-sm">{a.title}</b>
                        {!a.read && <i aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
                      </span>
                      <span className={cn("mt-0.5 block text-[12.5px] font-semibold", dark ? "text-on-dark-2" : "text-ink-2")}>
                        {a.body}
                        {` · ${g === "Earlier" ? `${day(a.at)}, ` : ""}${time(a.at)}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
      {more && (
        <div className="px-4 pt-3">
          <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line-2 bg-surface text-sm font-extrabold">
            {loadingMore && <Loader2 className="size-4 animate-spin" />}
            Older alerts
          </button>
        </div>
      )}
    </Screen>
  );
}
