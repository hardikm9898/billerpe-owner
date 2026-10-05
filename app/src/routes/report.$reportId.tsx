import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, Info, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { Segmented } from "@/components/pickers";
import { Card, ErrorState, Screen, Skeleton, TopBar, cn } from "@/components/ui";
import type { ReportResult } from "@/lib/api";
import { isShareCancel, saveFile, shareFile } from "@/lib/fileExport";
import { day, fullDate, money, qty } from "@/lib/format";
import { reportFileName, reportPdf, reportXlsx } from "@/lib/reportFiles";
import { presetRange, validateReportSearch } from "@/lib/reportRange";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/report/$reportId")({ component: ReportScreen, validateSearch: validateReportSearch });

// Report + download (design v1): a visual summary on the phone, the whole
// table in the PDF (for WhatsApp) and the Excel file (for the accountant).

const PDF_MIME = "application/pdf";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function ReportScreen() {
  const { reportId } = Route.useParams();
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/report/$reportId" });
  const range = presetRange(s.range ?? "today", s.from, s.to);
  const q = useCall<ReportResult>("report", [{ id: reportId, view: s.view, outletId: s.outlet ?? "all", range }], 300000);
  const r = q.data;
  const [busy, setBusy] = useState<null | "pdf" | "xlsx" | "share">(null);
  const [message, setMessage] = useState<string | null>(null);

  const out = async (kind: "pdf" | "xlsx" | "share") => {
    if (!r) return;
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === "share") await shareFile(reportFileName(r, "pdf"), reportPdf(r), PDF_MIME);
      else {
        const where = await saveFile(reportFileName(r, kind), kind === "pdf" ? reportPdf(r) : reportXlsx(r), kind === "pdf" ? PDF_MIME : XLSX_MIME);
        setMessage(`Saved to ${where}`);
      }
    } catch (e) {
      if (!isShareCancel(e)) setMessage(e instanceof Error && /permission/i.test(e.message) ? "Allow storage to save files." : "Could not make the file. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const sub = r ? `${r.outlets.length === 1 ? r.outlets[0] : "All outlets"} · ${r.range.from === r.range.to ? fullDate(r.range.from) : `${day(r.range.from)} – ${fullDate(r.range.to)}`}` : "";
  const fmt = (v: number | string, isMoney?: boolean) => (typeof v === "number" ? (isMoney ? money(v) : qty(Math.round(v * 100) / 100)) : v);
  const max = r?.visual ? Math.max(...r.visual.items.map((i) => Math.abs(i.value)), 0) || 1 : 1;
  const total = r?.visual ? r.visual.items.reduce((a, i) => a + Math.max(0, i.value), 0) : 0;

  const footer = r ? (
    <div className="flex shrink-0 gap-2.5 bg-ground px-4 pb-3 pt-2">
      <button type="button" disabled={!!busy} onClick={() => void out("pdf")} className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-brand text-[15px] font-extrabold text-white disabled:opacity-60">
        {busy === "pdf" ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />}
        PDF
      </button>
      <button type="button" disabled={!!busy} onClick={() => void out("xlsx")} className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-dark text-[15px] font-extrabold text-on-dark disabled:opacity-60">
        {busy === "xlsx" ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />}
        Excel
      </button>
      <button type="button" aria-label="Share PDF" disabled={!!busy} onClick={() => void out("share")} className="flex size-[50px] shrink-0 items-center justify-center rounded-2xl border border-line-2 bg-surface disabled:opacity-60">
        {busy === "share" ? <Loader2 className="size-5 animate-spin" /> : <Share2 className="size-5" />}
      </button>
    </div>
  ) : null;

  return (
      <Screen className="pb-4" footer={footer}>
        <TopBar title={r?.title ?? "Report"} sub={sub} />
        {r && r.views.length > 0 && (
          <div className="px-4 pt-1.5">
            <Segmented items={r.views} value={r.view ?? r.views[0]!.key} onChange={(v) => void navigate({ search: (old) => ({ ...old, view: v }), replace: true })} />
          </div>
        )}
        {q.loading ? (
          <div className="space-y-2.5 px-4 pt-3">
            <div className="grid grid-cols-2 gap-2.5">
              <Skeleton className="h-[78px]" />
              <Skeleton className="h-[78px]" />
            </div>
            <Skeleton className="h-[420px]" />
          </div>
        ) : q.error && !r ? (
          <ErrorState message={q.error} onRetry={() => void q.refresh()} />
        ) : r ? (
          <>
            {r.note && (
              <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-2xl bg-warn-soft px-3.5 py-3 text-[12.5px] font-semibold text-warn">
                <Info className="mt-0.5 size-4 shrink-0" />
                <span>{r.note}</span>
              </div>
            )}
            {r.summary.length > 0 && (
              <div className={cn("grid gap-2.5 px-4 pt-3", r.summary.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
                {r.summary.slice(0, 4).map((t) => (
                  <Card key={t.label} className="min-w-0">
                    <div className="truncate text-xs font-bold text-ink-2">{t.label}</div>
                    <div className={cn("num mt-0.5 truncate font-extrabold", r.summary.length === 3 ? "text-xl" : "text-2xl")}>{fmt(t.value, t.money)}</div>
                  </Card>
                ))}
              </div>
            )}
            <div className="px-4 pt-2.5">
              {!r.rows.length ? (
                <Card className="py-8 text-center">
                  <p className="text-[15px] font-bold">Nothing in this period</p>
                  <p className="mt-1 text-[13px] font-semibold text-ink-2">Try a longer date range.</p>
                </Card>
              ) : r.visual ? (
                <Card className="flex flex-col gap-3.5">
                  {r.visual.items.map((i, k) => (
                    <div key={k} className="min-w-0">
                      <div className="flex justify-between gap-3">
                        <span className="truncate text-sm font-bold">{i.label || "—"}</span>
                        <span className={cn("num shrink-0 font-extrabold", (i.value < 0 || i.low) && "text-brand")}>
                          {r.visual!.money ? money(i.value) : `${qty(Math.round(i.value * 100) / 100)}${i.unit ? ` ${i.unit}` : ""}`}
                        </span>
                      </div>
                      <div className="mb-1.5 mt-0.5 flex justify-between gap-3 text-[12.5px] font-semibold text-ink-2">
                        <span className="truncate">{[r.outlets.length > 1 && i.outlet ? i.outlet : null, i.sub].filter(Boolean).join(" · ")}</span>
                        {r.visual!.money && total > 0 && i.value > 0 && <span className="shrink-0">{((i.value / total) * 100).toFixed(1)}%</span>}
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-[#F1EBE5]">
                        {i.min !== undefined ? (
                          <i className={cn("block h-2 rounded", i.low ? "bg-brand" : "bg-ok")} style={{ width: `${i.min > 0 ? Math.max(2, Math.min(100, (Math.max(0, i.value) / i.min) * 100)) : 100}%` }} />
                        ) : (
                          <i className={cn("block h-2 rounded", i.value < 0 ? "bg-warn" : "bg-brand")} style={{ width: `${Math.max(2, (Math.abs(i.value) / max) * 100)}%` }} />
                        )}
                      </div>
                    </div>
                  ))}
                  {r.visual.more > 0 && <p className="text-center text-[12.5px] font-bold text-ink-2">+{r.visual.more} more in the PDF and Excel file</p>}
                </Card>
              ) : null}
            </div>
            {message && <p className="mx-5 mt-3 text-center text-[12.5px] font-bold text-ink-2">{message}</p>}
          </>
        ) : null}
      </Screen>
  );
}
