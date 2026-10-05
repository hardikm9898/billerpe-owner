import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Chips, useOutlets } from "@/components/pickers";
import { Card, ErrorState, Screen, Section, Skeleton, TopBar, cn } from "@/components/ui";
import type { TableTile, TablesResult } from "@/lib/api";
import { ago, money, time } from "@/lib/format";
import { useCall, useServerNow } from "@/lib/useCall";

export const Route = createFileRoute("/tables/$outletId")({ component: TablesScreen });

// Running tables, view only (design v1): the outlet's floor by section -
// amount, minutes open and captain per table; printed bills and tables open
// over 90 minutes stand out. Tapping a table opens its bill.

function TablesScreen() {
  const { outletId } = Route.useParams();
  const q = useCall<TablesResult>("tables", [Number(outletId)]);
  const { outlets } = useOutlets();
  const now = useServerNow(q.skew);
  const navigate = useNavigate();
  const [section, setSection] = useState("all");
  useEffect(() => setSection("all"), [outletId]);
  const outlet = outlets.find((o) => String(o.id) === outletId);
  const x = q.data;
  const sections = x?.sections ?? [];
  const shown = section === "all" ? sections.flatMap((s) => s.tables) : (sections.find((s) => s.id === section)?.tables ?? []);
  const busy = (list: TableTile[]) => list.filter((t) => t.state !== "free").length;

  return (
    <Screen>
      <TopBar
        title="Running tables"
        sub={`${outlet?.name ?? ""}${x ? ` · updated ${ago(x.serverTime, now)}` : ""}`}
        right={
          <span className="mr-2 inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-muted-soft px-2.5 text-[11.5px] font-extrabold text-ink-2">
            <Eye className="size-3.5" />
            View only
          </span>
        }
      />
      {outlets.length > 1 && (
        <Chips
          className="pb-1"
          items={outlets.map((o) => ({ key: String(o.id), label: o.name }))}
          value={outletId}
          onChange={(k) => void navigate({ to: "/tables/$outletId", params: { outletId: k }, replace: true })}
        />
      )}
      {q.loading ? (
        <div className="grid grid-cols-3 gap-2 px-4 pt-3">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-2xl" />
          ))}
        </div>
      ) : q.error && !x ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : x ? (
        <>
          <Chips
            className="mt-1.5"
            items={[
              { key: "all", label: "All", count: undefined },
              ...sections.map((s) => ({ key: s.id, label: s.name, count: undefined })),
            ].map((c) => {
              const list = c.key === "all" ? sections.flatMap((s) => s.tables) : (sections.find((s) => s.id === c.key)?.tables ?? []);
              return { ...c, label: `${c.label} ${busy(list)}/${list.length}` };
            })}
            value={section}
            onChange={setSection}
          />
          {shown.length === 0 ? (
            <Card className="mx-4 mt-3 text-center text-[13px] font-semibold text-ink-2">No tables set up at this outlet</Card>
          ) : (
            <div className="grid grid-cols-3 gap-2 px-4 pt-3">
              {shown.map((t) => (
                <Tile key={t.id} t={t} outletId={outletId} />
              ))}
            </div>
          )}

          {x.pickup.length > 0 && (
            <>
              <Section title="Open pickup bills" right={`${x.pickup.length}`} />
              <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
                {x.pickup.map((p) => (
                  <Link key={p.billId} to="/bill/$outletId/$billId" params={{ outletId, billId: p.billId }} className="flex min-h-[56px] items-center gap-3 border-t border-line px-3.5 py-2.5 text-ink first:border-t-0">
                    <ShoppingBag className="size-5 text-ink-2" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-bold">#{p.billNo} · Pickup</div>
                      <div className="text-[12.5px] font-semibold text-ink-2">since {time(p.createdAt)}</div>
                    </div>
                    <span className="num font-extrabold">{money(p.amount)}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="mx-4 mt-4 flex flex-wrap gap-x-4 gap-y-3 rounded-[20px] bg-surface p-4 text-xs font-bold text-ink-2">
            <Legend className="bg-[#F0B7BD]">Running</Legend>
            <Legend className="bg-[#F2CD95]">Bill printed</Legend>
            <Legend className="border-2 border-brand">Open over 90 min</Legend>
            <Legend className="border border-dashed border-[#B9AEA6]">Free</Legend>
          </div>
        </>
      ) : null}
    </Screen>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <i className={cn("size-3 rounded", className)} />
      {children}
    </span>
  );
}

function Tile({ t, outletId }: { t: TableTile; outletId: string }) {
  if (t.state === "free" || !t.billId) {
    return (
      <div className="min-h-[92px] rounded-2xl border border-dashed border-line-2 bg-surface p-2.5 text-ink-3">
        <b className="font-display text-[17px]">{t.name}</b>
        <div className="mt-[22px] text-[11px] font-semibold">Free</div>
      </div>
    );
  }
  const billed = t.state === "billed";
  const mins = t.minutes ?? 0;
  const open = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
  return (
    <Link
      to="/bill/$outletId/$billId"
      params={{ outletId, billId: t.billId }}
      className={cn("block min-h-[92px] min-w-0 rounded-2xl p-2.5 text-ink", billed ? "bg-warn-soft" : "bg-brand-soft", t.overdue && "shadow-[inset_0_0_0_2px_var(--color-brand)]")}
    >
      <b className="block truncate font-display text-[17px]">{t.name}</b>
      <div className="num mt-2 truncate text-[15px] font-extrabold">{money(t.amount ?? 0)}</div>
      <div className={cn("truncate text-[11px] font-semibold", t.overdue ? "font-extrabold text-brand" : billed ? "text-warn" : "text-ink-2")}>
        {billed && !t.overdue ? "Bill printed" : t.overdue ? open : [open, t.captain?.split(" ")[0]].filter(Boolean).join(" · ")}
      </div>
    </Link>
  );
}
