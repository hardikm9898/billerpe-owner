import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Banknote, BookOpen, Calendar, ChevronRight, Clock, FileText, Layers, Percent, ReceiptText, Store, Truck, Wallet, XCircle, Box, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ChipButton, Chips, OutletPicker, RangeSheet, useOutlets } from "@/components/pickers";
import { BigTitle, ErrorState, IconTile, Screen, Section, Skeleton } from "@/components/ui";
import type { ReportDef } from "@/lib/api";
import { PRESETS, presetLabel, validateReportSearch, type ReportPreset } from "@/lib/reportRange";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/reports")({ component: Reports, validateSearch: validateReportSearch });

// Reports (design v1): one outlet or all outlets together, any date range;
// every report opens with a visual summary and downloads as PDF or Excel.

const LOOK: Record<string, { icon: LucideIcon; tone: "brand" | "dark" | "warn" | "info" | "ok" }> = {
  "day-wise": { icon: Calendar, tone: "brand" },
  "item-wise": { icon: BookOpen, tone: "brand" },
  "category-wise": { icon: Layers, tone: "brand" },
  "payment-mode": { icon: Wallet, tone: "brand" },
  hourly: { icon: Clock, tone: "brand" },
  outlets: { icon: Store, tone: "dark" },
  "cancelled-edited": { icon: XCircle, tone: "warn" },
  discount: { icon: Percent, tone: "warn" },
  tax: { icon: FileText, tone: "info" },
  "cash-session": { icon: Banknote, tone: "info" },
  due: { icon: Wallet, tone: "info" },
  expense: { icon: ReceiptText, tone: "info" },
  stock: { icon: Box, tone: "ok" },
  "purchases-wastage": { icon: Truck, tone: "ok" },
};

function Reports() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/reports" });
  const preset: ReportPreset = s.range ?? "today";
  const { outlets } = useOutlets();
  const q = useCall<{ reports: ReportDef[] }>("reportCatalog", [], 3600000);
  const [customOpen, setCustomOpen] = useState(false);
  const groups = new Map<string, ReportDef[]>();
  for (const r of q.data?.reports ?? []) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
  const multi = outlets.length > 1;
  const setSearch = (patch: Partial<typeof s>) => void navigate({ search: (old) => ({ ...old, ...patch }), replace: true });

  return (
    <Screen>
      <BigTitle>Reports</BigTitle>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-1.5">
        {multi && <OutletPicker value={s.outlet ?? "all"} outlets={outlets} onChange={(v) => setSearch({ outlet: v === "all" ? undefined : v })} />}
        <ChipButton icon={<Calendar className="size-[18px] shrink-0" strokeWidth={1.9} />} onClick={() => setCustomOpen(true)}>
          {presetLabel(preset, s.from, s.to)}
        </ChipButton>
      </div>
      <Chips
        className="mt-2.5"
        items={PRESETS.map((p) => ({ key: p.key, label: p.label }))}
        value={preset}
        onChange={(k) => (k === "custom" ? setCustomOpen(true) : setSearch({ range: k === "today" ? undefined : k, from: undefined, to: undefined }))}
      />
      <RangeSheet
        open={customOpen}
        value={preset === "custom" && s.from && s.to ? { key: "custom", from: s.from, to: s.to } : { key: "today" }}
        onClose={() => setCustomOpen(false)}
        onChange={(r) => {
          setCustomOpen(false);
          if (r.key === "custom") setSearch({ range: "custom", from: r.from, to: r.to });
          else setSearch({ range: r.key === "today" ? undefined : r.key === "30d" ? "thismonth" : (r.key as ReportPreset), from: undefined, to: undefined });
        }}
      />

      {q.loading ? (
        <div className="space-y-2.5 px-4 pt-5">
          <Skeleton className="h-[380px] rounded-[20px]" />
          <Skeleton className="h-[300px] rounded-[20px]" />
        </div>
      ) : q.error && !q.data ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : (
        [...groups.entries()].map(([group, list]) => (
          <div key={group}>
            <Section title={group} />
            <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
              {list
                .filter((r) => r.id !== "outlets" || (multi && !s.outlet))
                .map((r) => {
                  const look = LOOK[r.id] ?? { icon: FileText, tone: "info" as const };
                  return (
                    <Link
                      key={r.id}
                      to="/report/$reportId"
                      params={{ reportId: r.id }}
                      search={{ outlet: s.outlet, range: s.range, from: s.from, to: s.to }}
                      className="flex min-h-[64px] items-center gap-3 border-t border-line px-3.5 py-3 text-ink first:border-t-0"
                    >
                      <IconTile tone={look.tone} icon={look.icon} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-bold">{r.name}</div>
                        <div className="truncate text-[12.5px] font-semibold text-ink-2">{r.desc}</div>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-[#9A8F88]" />
                    </Link>
                  );
                })}
            </div>
          </div>
        ))
      )}
    </Screen>
  );
}
