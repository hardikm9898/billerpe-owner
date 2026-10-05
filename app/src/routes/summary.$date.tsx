import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Banknote, ChevronLeft, Loader2, Pencil, Percent, ReceiptText, Share2, XCircle } from "lucide-react";
import { useState } from "react";
import { ErrorState, IconTile, Screen, Section, Skeleton, cn } from "@/components/ui";
import type { DaySummary } from "@/lib/api";
import { isShareCancel, shareTextOut } from "@/lib/fileExport";
import { delta, money, weekday } from "@/lib/format";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/summary/$date")({ component: SummaryScreen });

// Nightly day summary (design v1): one business day, every outlet - sales,
// the outlet split, and everything worth checking.

function SummaryScreen() {
  const { date } = Route.useParams();
  const router = useRouter();
  const q = useCall<DaySummary>("daySummary", [date], 600000);
  const s = q.data;
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const d = s ? delta(s.net, s.compareNet) : null;
  const max = s ? Math.max(...s.outlets.map((o) => o.net), 1) : 1;
  const nice = weekday(`${date}T12:00:00`);

  const text = () => {
    if (!s) return "";
    const lines = [
      `BillerPe · Day summary · ${nice}`,
      `Net sales ${money(s.net)} · ${s.bills} bills · avg ${money(s.avgBill)}`,
      ...s.outlets.map((o) => `• ${o.name}: ${money(o.net)} (${o.bills} bills)`),
      s.look.cancelled ? `Cancelled: ${s.look.cancelled} (${s.look.cancelledAfterKot} after KOT) · ${money(s.look.cancelledValue)}` : null,
      s.look.discounts ? `Discounts: ${money(s.look.discounts)}` : null,
      s.look.edited.length ? `Settled bills edited: ${s.look.edited.length}` : null,
      ...s.look.cashDiff.map((c) => `Cash ${c.amount < 0 ? "short" : "over"} ${money(Math.abs(c.amount))} · ${c.outlet}`),
      s.look.expenses ? `Expenses: ${money(s.look.expenses)}` : null,
    ];
    return lines.filter(Boolean).join("\n");
  };
  const share = async () => {
    setSharing(true);
    setNote(null);
    try {
      if (!(await shareTextOut(`Day summary ${nice}`, text()))) {
        await navigator.clipboard?.writeText(text());
        setNote("Copied - paste it into WhatsApp.");
      }
    } catch (e) {
      if (!isShareCancel(e)) setNote("Could not share. Try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen
      nav={false}
      className="pb-4"
      footer={
        s ? (
          <div className="safe-bottom shrink-0 bg-ground px-4 pb-4 pt-2">
            {note && <p className="mb-2 text-center text-[12.5px] font-bold text-ink-2">{note}</p>}
            <button type="button" onClick={() => void share()} disabled={sharing} className="flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-brand text-[15px] font-extrabold text-white disabled:opacity-60">
              {sharing ? <Loader2 className="size-5 animate-spin" /> : <Share2 className="size-5" />}
              Share summary
            </button>
          </div>
        ) : null
      }
    >
      <div className="rounded-b-[28px] bg-dark px-3 pb-6 pt-3.5 text-on-dark">
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Back" onClick={() => (window.history.length > 1 ? router.history.back() : router.history.push("/alerts"))} className="flex size-11 items-center justify-center">
            <ChevronLeft className="size-6" />
          </button>
          <div>
            <div className="font-display text-[19px] font-extrabold">Day summary</div>
            <div className="text-[12.5px] font-semibold text-on-dark-2">
              {nice} · {s ? (s.outlets.length === 1 ? s.outlets[0]!.name : "all outlets") : ""}
            </div>
          </div>
        </div>
        {s && (
          <div className="px-2 pt-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-on-dark-2">Net sales</span>
              {d && <span className={cn("rounded-[10px] px-2.5 py-1 text-xs font-extrabold", d.up ? "bg-[#1E3527] text-[#9BE3B5]" : "bg-[#3B2020] text-[#FFB4B4]")}>{`${d.text} ${s.compareLabel}`}</span>}
            </div>
            <div className="num mt-1 text-[42px] font-extrabold leading-tight tracking-[-0.8px]">{money(s.net)}</div>
            <div className="mt-3.5 grid grid-cols-3">
              <Stat label="Bills" value={String(s.bills)} />
              <Stat label="Avg bill" value={s.bills ? money(s.avgBill) : "—"} />
              <Stat label="Items" value={String(Math.round(s.items))} />
            </div>
          </div>
        )}
      </div>
      {q.loading ? (
        <div className="space-y-2.5 px-4 pt-4">
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[260px]" />
        </div>
      ) : q.error && !s ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : s ? (
        <>
          {s.outlets.length > 1 && (
            <>
              <Section title="By outlet" />
              <div className="mx-4 flex flex-col gap-3.5 rounded-[20px] bg-surface p-4">
                {s.outlets.map((o) => (
                  <div key={o.id}>
                    <div className="flex justify-between gap-3">
                      <span className="truncate font-bold">{o.name.includes(" · ") ? o.name.split(" · ").pop() : o.name}</span>
                      <span className="num font-extrabold">{money(o.net)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded bg-[#F1EBE5]">
                      <i className="block h-2 rounded bg-brand" style={{ width: `${Math.max(2, (o.net / max) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <Section title="Worth a look" />
          <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
            <Look to={{ filter: "cancelled" }} date={date} icon={XCircle} tone="brand" title={`${s.look.cancelled} bill${s.look.cancelled === 1 ? "" : "s"} cancelled`} sub={s.look.cancelledAfterKot ? `${s.look.cancelledAfterKot} after KOT` : "None after KOT"} end={money(s.look.cancelledValue)} />
            <Look to={{ filter: "discount" }} date={date} icon={Percent} tone="warn" title="Discounts" sub={s.look.discountOver ? `${s.look.discountOver} above your ${s.discountLimit}% limit` : `None above your ${s.discountLimit}% limit`} end={money(s.look.discounts)} />
            <Look to={{ filter: "edited" }} date={date} icon={Pencil} tone="warn" title={`${s.look.edited.length} settled bill${s.look.edited.length === 1 ? "" : "s"} edited`} sub={s.look.edited.slice(0, 2).map((e) => `${e.outlet} · ${e.by}`).join(", ") || "None"} end="" />
            {s.look.cashDiff.map((c, k) => (
              <div key={k} className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-3">
                <IconTile tone="info" icon={Banknote} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-bold">Cash {c.amount < 0 ? "short" : "over"}</div>
                  <div className="truncate text-[12.5px] font-semibold text-ink-2">
                    {c.outlet}
                    {c.by ? ` · closed by ${c.by}` : ""}
                  </div>
                </div>
                <span className={cn("num font-extrabold", c.amount < 0 && "text-brand")}>{`${c.amount < 0 ? "−" : "+"}${money(Math.abs(c.amount))}`}</span>
              </div>
            ))}
            <div className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-3">
              <IconTile tone="muted" icon={ReceiptText} />
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-bold">Expenses</div>
                <div className="text-[12.5px] font-semibold text-ink-2">Entered at the outlets</div>
              </div>
              <span className="num font-extrabold">{money(s.look.expenses)}</span>
            </div>
          </div>
        </>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11.5px] font-semibold text-on-dark-2">{label}</div>
      <div className="num text-lg font-bold">{value}</div>
    </div>
  );
}

/** The Bills range that holds this business day (today, yesterday, else the last 7 / 30 days). */
function rangeFor(date: string): "today" | "yesterday" | "7d" | "30d" {
  const d = new Date();
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const days = Math.round((new Date(`${iso(d)}T00:00:00`).getTime() - new Date(`${date}T00:00:00`).getTime()) / 86400000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : days < 7 ? "7d" : "30d";
}

function Look({ to, date, icon, tone, title, sub, end }: { to: { filter: "cancelled" | "discount" | "edited" }; date: string; icon: typeof XCircle; tone: "brand" | "warn"; title: string; sub: string; end: string }) {
  return (
    <Link to="/bills" search={{ filter: to.filter, range: rangeFor(date) }} className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-3 text-ink first:border-t-0">
      <IconTile tone={tone} icon={icon} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold">{title}</div>
        <div className="truncate text-[12.5px] font-semibold text-ink-2">{sub}</div>
      </div>
      {end && <span className="num font-extrabold">{end}</span>}
    </Link>
  );
}
