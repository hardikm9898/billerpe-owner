import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Loader2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Chips, OutletPicker, RangePicker, useOutlets, type OutletChoice } from "@/components/pickers";
import { BigTitle, Card, ErrorState, Screen, Skeleton, Tag, cn } from "@/components/ui";
import { call, type BillFilter, type BillRow, type BillsResult, type Range, type RangeKey } from "@/lib/api";
import { day, money, time } from "@/lib/format";
import { useCall } from "@/lib/useCall";

// Bills (design v1): every bill from every outlet, with quick filters for
// what owners worry about - cancelled, edited after settle, due, discounts.
// Search by bill number, table, customer name or mobile.

interface BillsSearch {
  filter?: BillFilter | undefined;
  outlet?: number | undefined;
  range?: RangeKey | undefined;
}
const FILTERS: { key: BillFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "running", label: "Running" },
  { key: "settled", label: "Settled" },
  { key: "cancelled", label: "Cancelled" },
  { key: "edited", label: "Edited" },
  { key: "due", label: "Due" },
  { key: "discount", label: "Discount" },
];
const RANGE_KEYS: RangeKey[] = ["today", "yesterday", "7d", "30d"];

export const Route = createFileRoute("/bills")({
  component: Bills,
  validateSearch: (s: Record<string, unknown>): BillsSearch => ({
    filter: FILTERS.some((f) => f.key === s["filter"]) ? (s["filter"] as BillFilter) : undefined,
    outlet: Number(s["outlet"]) > 0 ? Number(s["outlet"]) : undefined,
    range: RANGE_KEYS.includes(s["range"] as RangeKey) ? (s["range"] as RangeKey) : undefined,
  }),
});

function Bills() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/bills" });
  const filter = search.filter ?? "all";
  const outlet: OutletChoice = search.outlet ?? "all";
  const [range, setRange] = useState<Range>({ key: search.range ?? "today" });
  const [searchOpen, setSearchOpen] = useState(false);
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const { outlets } = useOutlets();

  // Typing settles for 400 ms before the list is asked for again.
  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);

  const query = { outletId: outlet, range, filter, search: term };
  const q = useCall<BillsResult>("bills", [query]);
  const [extra, setExtra] = useState<BillRow[]>([]);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setExtra([]);
    setMore(q.data?.more ?? false);
  }, [q.data]);
  const list = [...(q.data?.bills ?? []), ...extra];
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const r = await call<BillsResult>("bills", { ...query, offset: list.length });
      setExtra((e) => [...e, ...r.bills]);
      setMore(r.more);
    } finally {
      setLoadingMore(false);
    }
  };
  const multi = outlet === "all" && outlets.length > 1;

  return (
    <Screen>
      <BigTitle
        right={
          <button
            type="button"
            aria-label={searchOpen ? "Close search" : "Search bills"}
            onClick={() => {
              setSearchOpen((o) => !o);
              setText("");
            }}
            className="flex size-11 items-center justify-center rounded-full border border-line-2 bg-surface"
          >
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
        }
      >
        Bills
      </BigTitle>
      {searchOpen && (
        <div className="px-4 pt-1.5">
          <label className="flex h-[46px] items-center gap-2 rounded-2xl border border-line-2 bg-surface px-3">
            <Search className="size-[18px] text-ink-2" />
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Bill no., table, customer or mobile" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
          </label>
        </div>
      )}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-2">
        {outlets.length > 1 && <OutletPicker value={outlet} outlets={outlets} onChange={(v) => void navigate({ search: (s) => ({ ...s, outlet: v === "all" ? undefined : v }), replace: true })} />}
        <RangePicker value={range} onChange={setRange} />
      </div>
      <Chips
        className="mt-3"
        items={FILTERS.map((f) => ({ ...f, count: q.data?.counts[f.key] }))}
        value={filter}
        onChange={(k) => void navigate({ search: (s) => ({ ...s, filter: k === "all" ? undefined : k }), replace: true })}
      />

      {q.loading ? (
        <div className="space-y-px px-4 pt-3">
          <Skeleton className="h-[400px] rounded-[20px]" />
        </div>
      ) : q.error && !q.data ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : list.length === 0 ? (
        <Card className="mx-4 mt-3 py-8 text-center">
          <p className="text-[15px] font-bold">No bills here</p>
          <p className="mt-1 text-[13px] font-semibold text-ink-2">{term ? `Nothing matches “${term}”.` : "Try another filter or date range."}</p>
        </Card>
      ) : (
        <div className="px-4 pt-3">
          <div className="overflow-hidden rounded-[20px] bg-surface">
            {list.map((b) => (
              <BillLine key={`${b.outletId}-${b.id}`} b={b} showOutlet={multi} showDay={range.key !== "today" && range.key !== "yesterday"} />
            ))}
          </div>
          {more && (
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line-2 bg-surface text-sm font-extrabold">
              {loadingMore && <Loader2 className="size-4 animate-spin" />}
              Show more bills
            </button>
          )}
        </div>
      )}
    </Screen>
  );
}

function BillLine({ b, showOutlet, showDay }: { b: BillRow; showOutlet: boolean; showDay: boolean }) {
  const cancelled = b.status === "cancelled";
  const when = `${showDay ? `${day(b.at)}, ` : ""}${b.status === "running" || b.status === "billed" || b.status === "hold" ? `since ${time(b.at)}` : time(b.at)}`;
  return (
    <Link
      to="/bill/$outletId/$billId"
      params={{ outletId: String(b.outletId), billId: b.id }}
      className={cn("flex min-h-[64px] items-center gap-3 border-t border-line px-3.5 py-3 text-ink first:border-t-0", cancelled && "bg-[#FFF8F8]")}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-bold">
          #{b.billNo} · {b.place}
        </div>
        <div className="mt-0.5 truncate text-[12.5px] font-semibold text-ink-2">{[when, b.sub, showOutlet ? b.outletName : null].filter(Boolean).join(" · ")}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={cn("num text-[15px] font-extrabold", cancelled && "text-ink-3 line-through")}>{money(b.amount)}</span>
        <Tag tone={b.tag.tone}>{b.tag.text}</Tag>
      </div>
      <ChevronRight className="size-4 shrink-0 text-[#9A8F88]" />
    </Link>
  );
}
