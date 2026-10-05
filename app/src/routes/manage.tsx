import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Box, ChevronRight, CloudOff, FileText, Monitor, RefreshCw, Table2, Tag, Users, Wallet, Banknote, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { OutletPicker, useOutlets } from "@/components/pickers";
import { BigTitle, ErrorState, IconTile, Screen, Section, Skeleton, cn } from "@/components/ui";
import type { ManageHub } from "@/lib/api";
import { ago, since } from "@/lib/format";
import { useCall, useServerNow } from "@/lib/useCall";

// Manage (design v1): per outlet, everything the owner can change from the
// phone - with a plain note on when a change reaches the outlet PC.

const KEY = "owner.manageOutlet";
const remembered = () => {
  try {
    return Number(localStorage.getItem(KEY)) || undefined;
  } catch {
    return undefined;
  }
};

export const Route = createFileRoute("/manage")({
  component: Manage,
  validateSearch: (s: Record<string, unknown>): { outlet?: number | undefined } => ({ outlet: Number(s["outlet"]) > 0 ? Number(s["outlet"]) : undefined }),
});

function Manage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/manage" });
  const { outlets, loading: outletsLoading } = useOutlets();
  const outletId = outlets.find((o) => o.id === s.outlet)?.id ?? outlets.find((o) => o.id === remembered())?.id ?? outlets[0]?.id;
  useEffect(() => {
    if (!outletId) return;
    try {
      localStorage.setItem(KEY, String(outletId));
    } catch {
      /* phone storage off: the first outlet is used */
    }
  }, [outletId]);
  const outlet = outlets.find((o) => o.id === outletId);
  const q = useCall<ManageHub>("manage", [outletId ?? 0], 30000);
  const now = useServerNow(q.skew);
  const x = outletId ? q.data : null;
  const id = String(outletId ?? "");
  const pcOnline = outlet ? outlet.pc.status === "online" : null;

  return (
    <Screen>
      <BigTitle>Manage</BigTitle>
      {outlets.length > 0 && (
        <div className="px-4 pt-1.5">
          <OutletPicker value={outletId ?? "all"} outlets={outlets} allowAll={false} onChange={(v) => v !== "all" && void navigate({ search: { outlet: v }, replace: true })} />
        </div>
      )}
      {outletsLoading || (q.loading && outletId) ? (
        <div className="space-y-2.5 px-4 pt-3">
          <Skeleton className="h-[56px]" />
          <div className="grid grid-cols-2 gap-2.5">
            <Skeleton className="h-[118px]" />
            <Skeleton className="h-[118px]" />
            <Skeleton className="h-[118px]" />
            <Skeleton className="h-[118px]" />
          </div>
        </div>
      ) : !outletId ? null : q.error && !x ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : x && outlet ? (
        <>
          <div className="px-4 pt-3">
            {x.pending > 0 ? (
              <div className={cn("flex gap-2.5 rounded-2xl px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed", pcOnline ? "bg-info-soft text-[#173E8F]" : "bg-warn-soft text-warn")}>
                {pcOnline ? <RefreshCw className="mt-0.5 size-[18px] shrink-0" /> : <CloudOff className="mt-0.5 size-[18px] shrink-0" />}
                <span>
                  {x.pending} change{x.pending === 1 ? "" : "s"} waiting for the outlet PC
                  {x.pendingSince ? ` (since ${since(x.pendingSince, now)})` : ""}.{" "}
                  {pcOnline ? "The PC is online - it downloads them in about a minute." : "The PC is offline - they apply when it reconnects."}
                </span>
              </div>
            ) : (
              <div className={cn("flex gap-2.5 rounded-2xl px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed", pcOnline ? "bg-info-soft text-[#173E8F]" : "bg-warn-soft text-warn")}>
                {pcOnline ? <RefreshCw className="mt-0.5 size-[18px] shrink-0" /> : <CloudOff className="mt-0.5 size-[18px] shrink-0" />}
                <span>
                  {pcOnline
                    ? "Changes reach the outlet PC in about a minute. The PC is online now."
                    : outlet.pc.status === "offline"
                      ? `The outlet PC is offline (last heard ${ago(outlet.pc.lastSeenAt, now)}). Changes apply when it reconnects.`
                      : "No outlet PC is registered yet. Changes apply when it is set up."}
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 px-4 pt-3">
            <Tile to="/manage/menu/$outletId" id={id} icon={BookOpen} tone="brand" title="Menu" sub={`${x.items} items${x.itemsOff ? ` · ${x.itemsOff} off` : ""}`} />
            <Tile to="/manage/staff/$outletId" id={id} icon={Users} tone="info" title="Staff & access" sub={`${x.staff} staff${x.staffOff ? ` · ${x.staffOff} off` : ""}`} />
            <Tile to="/manage/tables/$outletId" id={id} icon={Table2} tone="warn" title="Tables & sections" sub={`${x.tables} tables · ${x.sections} sections`} />
            <Tile
              to="/manage/stock/$outletId"
              id={id}
              icon={Box}
              tone="ok"
              title="Stock"
              sub={x.lowStock === null ? "Not uploaded yet" : x.lowStock ? `${x.lowStock} item${x.lowStock === 1 ? "" : "s"} low` : `${x.stockItems} items · none low`}
              subTone={x.lowStock ? "text-brand" : undefined}
            />
          </div>

          <Section title="Settings" />
          <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
            <Row to="/manage/settings/$outletId/$section" id={id} section="tax" icon={FileText} title="Tax & bill charges" sub={`${x.taxSummary}${x.serviceCharge ? ` · service ${x.serviceCharge}` : " · service charge off"}`} />
            <Row to="/manage/settings/$outletId/$section" id={id} section="payments" icon={Wallet} title="Payment modes" sub={x.paymentModes.join(", ") || "—"} />
            <Row to="/manage/settings/$outletId/$section" id={id} section="promos" icon={Tag} title="Discounts & promo codes" sub={x.promos ? `${x.promos} active` : "None active"} />
            <Row to="/manage/settings/$outletId/$section" id={id} section="expenses" icon={Banknote} title="Expense heads" sub={`${x.expenseHeads} head${x.expenseHeads === 1 ? "" : "s"}`} />
            <Link to="/pc/$outletId" params={{ outletId: id }} className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-3 text-ink">
              <IconTile tone="muted" icon={Monitor} />
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-bold">Outlet PC</div>
                <div className={cn("text-[12.5px] font-semibold", pcOnline ? "text-ok" : "text-warn")}>
                  {pcOnline ? "Online" : outlet.pc.status === "offline" ? "Offline" : "Not set up"}
                  {outlet.pc.version ? ` · v${outlet.pc.version}` : ""}
                </div>
              </div>
              <ChevronRight className="size-5 text-[#9A8F88]" />
            </Link>
          </div>
        </>
      ) : null}
    </Screen>
  );
}

type ManageTo = "/manage/menu/$outletId" | "/manage/staff/$outletId" | "/manage/tables/$outletId" | "/manage/stock/$outletId";

function Tile({ to, id, icon, tone, title, sub, subTone }: { to: ManageTo; id: string; icon: LucideIcon; tone: "brand" | "info" | "warn" | "ok"; title: string; sub: string; subTone?: string | undefined }) {
  return (
    <Link to={to} params={{ outletId: id }} className="block min-h-[118px] rounded-[20px] bg-surface p-4 text-ink">
      <IconTile tone={tone} icon={icon} />
      <b className="mt-3 block text-[15px]">{title}</b>
      <span className={cn("block text-[12.5px] font-semibold text-ink-2", subTone)}>{sub}</span>
    </Link>
  );
}

function Row({ to, id, section, icon, title, sub }: { to: "/manage/settings/$outletId/$section"; id: string; section: string; icon: LucideIcon; title: string; sub: string }) {
  return (
    <Link to={to} params={{ outletId: id, section }} className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-3 text-ink first:border-t-0">
      <IconTile tone="muted" icon={icon} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold">{title}</div>
        <div className="truncate text-[12.5px] font-semibold text-ink-2">{sub}</div>
      </div>
      <ChevronRight className="size-5 text-[#9A8F88]" />
    </Link>
  );
}
