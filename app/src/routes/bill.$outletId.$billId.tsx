import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightLeft, ChefHat, Check, CircleDollarSign, Loader2, Pencil, Printer, Share2, Table2, XCircle, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Card, ErrorState, Screen, Section, Skeleton, Tag, TopBar, cn } from "@/components/ui";
import type { BillDetail } from "@/lib/api";
import { billPdf } from "@/lib/billPdf";
import { isShareCancel, shareFile } from "@/lib/fileExport";
import { day, money, qty, time } from "@/lib/format";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/bill/$outletId/$billId")({ component: BillScreen });

// Bill detail + activity (design v1): items by KOT, the real totals, and who
// opened, sent KOTs, printed, settled, edited or cancelled it. View only -
// the owner can share the bill but never change it.

const EVENT_ICON: Record<string, { icon: LucideIcon; tone: string }> = {
  place_order: { icon: Table2, tone: "bg-muted-soft text-ink-2" },
  save_order: { icon: Table2, tone: "bg-muted-soft text-ink-2" },
  qr_accept: { icon: Table2, tone: "bg-muted-soft text-ink-2" },
  kot: { icon: ChefHat, tone: "bg-muted-soft text-ink-2" },
  kds_stage: { icon: ChefHat, tone: "bg-muted-soft text-ink-2" },
  move_kot: { icon: ArrowRightLeft, tone: "bg-muted-soft text-ink-2" },
  move_table: { icon: ArrowRightLeft, tone: "bg-muted-soft text-ink-2" },
  merge_table: { icon: ArrowRightLeft, tone: "bg-muted-soft text-ink-2" },
  merged_into: { icon: ArrowRightLeft, tone: "bg-muted-soft text-ink-2" },
  bill_print: { icon: Printer, tone: "bg-info-soft text-info" },
  bill_reprint: { icon: Printer, tone: "bg-info-soft text-info" },
  settle: { icon: Check, tone: "bg-ok-soft text-ok" },
  due_collected: { icon: CircleDollarSign, tone: "bg-ok-soft text-ok" },
  update_order: { icon: Pencil, tone: "bg-warn-soft text-warn" },
  remove_kot: { icon: XCircle, tone: "bg-warn-soft text-warn" },
  decrease_kot_qty: { icon: XCircle, tone: "bg-warn-soft text-warn" },
  kds_reject: { icon: XCircle, tone: "bg-warn-soft text-warn" },
  delete_order: { icon: XCircle, tone: "bg-brand-soft text-brand" },
};

function BillScreen() {
  const { outletId, billId } = Route.useParams();
  const q = useCall<BillDetail>("bill", [Number(outletId), billId]);
  const b = q.data;
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const share = async () => {
    if (!b) return;
    setSharing(true);
    setShareError(null);
    try {
      await shareFile(`Bill-${b.billNo}.pdf`, billPdf(b), "application/pdf");
    } catch (e) {
      if (!isShareCancel(e)) setShareError("Could not share the bill. Try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Screen nav={false} className="pb-4">
        <TopBar title={b ? `Bill #${b.billNo}` : "Bill"} sub={b ? `${b.outletName} · ${day(b.createdAt)}` : ""} right={b ? <span className="mr-2 shrink-0"><Tag tone={b.tag.tone}>{b.tag.text}</Tag></span> : null} />
        {q.loading ? (
          <div className="space-y-2.5 px-4 pt-2">
            <Skeleton className="h-[110px]" />
            <Skeleton className="h-[280px]" />
            <Skeleton className="h-[200px]" />
          </div>
        ) : q.error && !b ? (
          <ErrorState message={q.error} onRetry={() => void q.refresh()} />
        ) : b ? (
          <>
            <div className="px-4 pt-2">
              <Card className="grid grid-cols-2 gap-y-3">
                <Info label={b.type === "pickup" ? "Order" : "Table"} value={b.type === "pickup" ? "Pickup" : [b.table, b.section].filter(Boolean).join(" · ") || "Dine-in"} />
                <Info label="Items" value={qty(b.kots.reduce((a, k) => a + k.lines.reduce((s, l) => s + l.qty, 0), 0) + b.held.reduce((s, l) => s + l.qty, 0))} />
                <Info label="Captain" value={b.captain || "—"} />
                {b.status === "cancelled" ? (
                  <Info label="Cancelled by" value={[...b.activity].reverse().find((a) => a.action === "delete_order")?.by || "—"} />
                ) : (
                  <Info label="Cashier" value={b.cashier || "—"} />
                )}
                {b.customer && <Info label="Customer" value={[b.customer.name, b.customer.mobile].filter(Boolean).join(" · ")} wide />}
              </Card>
            </div>

            <Section title="Items" right={`${b.kots.length} KOT${b.kots.length === 1 ? "" : "s"}`} />
            <div className="px-4">
              <Card className="px-4 py-1.5">
                {b.kots.map((k, i) => (
                  <div key={k.no} className={cn(i > 0 && "mt-1.5 border-t border-line")}>
                    <div className="flex items-center gap-1.5 pb-1 pt-2.5 text-[12.5px] font-semibold text-ink-2">
                      <ChefHat className="size-4" />
                      KOT {k.no} · {time(k.at)}
                      {k.by ? ` · ${k.by}` : ""}
                    </div>
                    {k.lines.map((l, j) => (
                      <Line key={j} name={l.name} extra={[l.variant, l.addons, l.note].filter(Boolean).join(" · ")} qty={l.qty} amount={l.amount} />
                    ))}
                  </div>
                ))}
                {b.held.length > 0 && (
                  <div className={cn(b.kots.length > 0 && "mt-1.5 border-t border-line")}>
                    <div className="pb-1 pt-2.5 text-[12.5px] font-semibold text-warn">Not sent to the kitchen yet</div>
                    {b.held.map((l, j) => (
                      <Line key={j} name={l.name} extra="" qty={l.qty} amount={l.amount} />
                    ))}
                  </div>
                )}
                {b.kots.length === 0 && b.held.length === 0 && <p className="py-3 text-center text-[13px] font-semibold text-ink-2">No items on this bill</p>}
                <div className="mt-1.5 flex flex-col gap-1.5 border-t border-line py-2.5 text-[13.5px]">
                  <Total label="Subtotal" value={b.totals.subtotal} />
                  {b.totals.discount > 0 && <Total label={`Discount${b.totals.discountReason ? ` · ${b.totals.discountReason}` : ""}`} value={-b.totals.discount} />}
                  {b.totals.service > 0 && <Total label="Service charge" value={b.totals.service} />}
                  {b.totals.packaging > 0 && <Total label="Packaging" value={b.totals.packaging} />}
                  {b.totals.taxLines.map((t) => (
                    <Total key={t.name} label={t.name} value={t.amount} />
                  ))}
                  {b.totals.roundOff !== 0 && <Total label="Round off" value={b.totals.roundOff} />}
                  <div className="flex justify-between text-base font-extrabold">
                    <span>Total</span>
                    <span className={cn("num", b.status === "cancelled" && "text-ink-3 line-through")}>{money(b.totals.grand)}</span>
                  </div>
                  {b.payments.map((p) => (
                    <div key={p.name} className="flex justify-between font-semibold text-ok">
                      <span>Paid · {p.name}</span>
                      <span className="num">{money(p.amount)}</span>
                    </div>
                  ))}
                  {b.dueOutstanding > 0 && (
                    <div className="flex justify-between font-bold text-warn">
                      <span>Due outstanding</span>
                      <span className="num">{money(b.dueOutstanding)}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <Section title="Activity" right="Who did what" />
            <div className="px-4">
              <Card className="flex flex-col gap-3.5">
                {b.activity.length === 0 ? (
                  <p className="text-center text-[13px] font-semibold leading-relaxed text-ink-2">No activity was recorded for this bill. Outlet PCs on BillerPe 1.1.7 or newer send it.</p>
                ) : (
                  b.activity.map((a, i) => {
                    const ic = EVENT_ICON[a.action] ?? { icon: Table2, tone: "bg-muted-soft text-ink-2" };
                    const Icon = ic.icon;
                    const reason = a.action === "delete_order" && b.cancelReason ? b.cancelReason : null;
                    return (
                      <div key={i} className="flex gap-3">
                        <span className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-full", ic.tone)}>
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold">{reason ? "Bill cancelled" : a.label}</div>
                          <div className="text-[12.5px] font-semibold text-ink-2">{[time(a.at), a.by ? `${a.by}${a.role ? ` (${a.role})` : ""}` : null].filter(Boolean).join(" · ")}</div>
                          {reason && <div className="mt-1.5 rounded-[10px] bg-brand-soft px-2.5 py-2 text-[13px] font-semibold text-brand-dark">Reason: {reason}</div>}
                        </div>
                      </div>
                    );
                  })
                )}
              </Card>
            </div>
          </>
        ) : null}
      </Screen>
      {b && (
        <div className="safe-bottom shrink-0 bg-ground px-4 pb-4 pt-2">
          {shareError && <p className="mb-2 text-center text-[12.5px] font-bold text-brand">{shareError}</p>}
          <button type="button" onClick={() => void share()} disabled={sharing} className="flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-line-2 bg-surface text-[15px] font-extrabold disabled:opacity-60">
            {sharing ? <Loader2 className="size-5 animate-spin" /> : <Share2 className="size-5" />}
            Share bill PDF
          </button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <div className="text-xs font-bold text-ink-2">{label}</div>
      <div className="truncate font-bold">{value}</div>
    </div>
  );
}

function Line({ name, extra, qty: q, amount }: { name: string; extra: string; qty: number; amount: number }) {
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className="font-semibold">
          {name} × {qty(q)}
        </div>
        {extra && <div className="truncate text-xs font-semibold text-ink-2">{extra}</div>}
      </div>
      <span className="num shrink-0 font-bold">{money(amount)}</span>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-3 text-ink-2">
      <span className="min-w-0 truncate">{label}</span>
      <span className="num shrink-0">{value < 0 ? `− ${money(-value)}` : money(value)}</span>
    </div>
  );
}
