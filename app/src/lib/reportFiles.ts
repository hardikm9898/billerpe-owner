import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { ReportResult } from "./api";
import { fullDate } from "./format";
import { xlsx } from "./xlsx";

// A report as a file to share: PDF (for WhatsApp) or Excel .xlsx (for the
// accountant). Both carry the whole table, not just what the phone shows.
// jsPDF's built-in fonts have no rupee sign, so the PDF writes "Rs.".

const rangeText = (r: ReportResult) => (r.range.from === r.range.to ? fullDate(r.range.from) : `${fullDate(r.range.from)} – ${fullDate(r.range.to)}`);
const outletText = (r: ReportResult) => (r.outlets.length === 1 ? r.outlets[0]! : `All outlets (${r.outlets.length}): ${r.outlets.join(", ")}`);

export function reportFileName(r: ReportResult, ext: "pdf" | "xlsx") {
  const view = r.views.find((v) => v.key === r.view)?.label;
  const base = [r.title, view, r.range.from === r.range.to ? r.range.from : `${r.range.from} to ${r.range.to}`].filter(Boolean).join(" - ");
  return `${base.replace(/[\\/:*?"<>|]/g, "-")}.${ext}`;
}

const inr = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function reportPdf(r: ReportResult): Uint8Array {
  const wide = r.columns.length > 5;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: wide ? "landscape" : "portrait" });
  const W = doc.internal.pageSize.getWidth();
  const view = r.views.find((v) => v.key === r.view)?.label;
  doc.setFont("helvetica", "bold").setFontSize(16).text(`${r.title}${view ? ` · ${view}` : ""}`, 14, 16);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(90);
  doc.text(doc.splitTextToSize(`${outletText(r)}  ·  ${rangeText(r)}`, W - 28) as string[], 14, 23);
  doc.setTextColor(0);
  let y = 31;
  const tiles = r.summary.map((s) => `${s.label}: ${typeof s.value === "number" ? (s.money ? `Rs. ${inr(s.value)}` : s.value.toLocaleString("en-IN")) : s.value}`);
  if (tiles.length) {
    doc.setFont("helvetica", "bold").setFontSize(10).text(tiles.join("     "), 14, y);
    y += 6;
  }
  if (r.note) {
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(154, 74, 6).text(r.note, 14, y);
    doc.setTextColor(0);
    y += 6;
  }
  const fmt = (v: string | number | undefined, money?: boolean) => (typeof v === "number" ? (money ? inr(v) : v.toLocaleString("en-IN")) : String(v ?? ""));
  autoTable(doc, {
    startY: y,
    head: [r.columns.map((c) => (c.money ? `${c.label} (Rs.)` : c.label))],
    body: r.rows.map((row) => r.columns.map((c) => fmt(row[c.key], c.money))),
    ...(r.totals ? { foot: [r.columns.map((c) => fmt(r.totals![c.key], c.money))] } : {}),
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: [32, 24, 21], textColor: 255 },
    footStyles: { fillColor: [239, 233, 227], textColor: 20, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 245, 241] },
    columnStyles: Object.fromEntries(r.columns.map((c, i) => [i, c.money || c.num ? { halign: "right" } : {}])),
    // Numbers line up on the right in the header and totals too.
    didParseCell: (data) => {
      const c = r.columns[data.column.index];
      if (c && (c.money || c.num) && data.section !== "body") data.cell.styles.halign = "right";
    },
    didDrawPage: () => {
      const H = doc.internal.pageSize.getHeight();
      doc.setFontSize(8).setTextColor(130).text(`BillerPe Owner · page ${doc.getNumberOfPages()}`, 14, H - 8);
      doc.setTextColor(0);
    },
  });
  if (!r.rows.length) doc.setFontSize(10).text("No data for this period.", 14, y + 14);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function reportXlsx(r: ReportResult): Uint8Array {
  const view = r.views.find((v) => v.key === r.view)?.label;
  return xlsx({
    name: r.title,
    title: [`${r.title}${view ? ` · ${view}` : ""}`, outletText(r), rangeText(r), ...(r.note ? [r.note] : [])],
    header: r.columns.map((c) => c.label),
    kinds: r.columns.map((c) => (c.money ? "money" : c.num ? "num" : "text")),
    rows: r.rows.map((row) => r.columns.map((c) => row[c.key] ?? "")),
    ...(r.totals ? { totals: r.columns.map((c) => r.totals![c.key] ?? "") } : {}),
  });
}
