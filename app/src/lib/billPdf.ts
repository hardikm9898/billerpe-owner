import { jsPDF } from "jspdf";
import type { BillDetail } from "./api";
import { fullDate, time } from "./format";

// The bill as a PDF the owner can share on WhatsApp (bill detail screen).
// An 80 mm roll layout like the printed bill. jsPDF's built-in fonts have no
// rupee sign, so amounts read "Rs.".

const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function billPdf(b: BillDetail): Uint8Array {
  const W = 80;
  const M = 5;
  // Height grows with the lines: measure first, then draw.
  const rows = b.kots.reduce((a, k) => a + 1 + k.lines.length, 0) + b.held.length + b.totals.taxLines.length + b.payments.length;
  const doc = new jsPDF({ unit: "mm", format: [W, Math.max(80, 62 + rows * 5.2)] });
  let y = 9;
  const center = (text: string, size: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size);
    doc.text(text, W / 2, y, { align: "center" });
    y += size * 0.45 + 1.2;
  };
  const row = (left: string, right: string, size = 8.5, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size);
    const lines = doc.splitTextToSize(left, W - 2 * M - 26) as string[];
    doc.text(lines, M, y);
    doc.text(right, W - M, y, { align: "right" });
    y += lines.length * size * 0.42 + 1.4;
  };
  const rule = () => {
    doc.setLineDashPattern([0.8, 0.8], 0).setLineWidth(0.2).line(M, y - 1.5, W - M, y - 1.5);
    y += 3.5; // room for the next line's capitals above its baseline
  };

  center(b.outletName, 12, true);
  center(`Bill #${b.billNo}${b.status === "cancelled" ? " · CANCELLED" : ""}`, 9);
  center(`${fullDate(b.createdAt)} ${time(b.createdAt)}`, 8);
  center(b.type === "pickup" ? "Pickup" : [b.table, b.section].filter(Boolean).join(" · ") || "Dine-in", 8);
  if (b.customer) center([b.customer.name, b.customer.mobile].filter(Boolean).join(" · "), 8);
  y += 1;
  rule();
  for (const k of b.kots) {
    for (const l of k.lines) {
      const extra = [l.variant, l.addons].filter(Boolean).join(", ");
      row(`${l.name}${extra ? ` (${extra})` : ""} x ${l.qty}`, rs(l.amount));
    }
  }
  for (const l of b.held) row(`${l.name} x ${l.qty} (not sent)`, rs(l.amount));
  rule();
  row("Subtotal", rs(b.totals.subtotal));
  if (b.totals.discount) row(`Discount${b.totals.discountReason ? ` (${b.totals.discountReason})` : ""}`, `- ${rs(b.totals.discount)}`);
  if (b.totals.service) row("Service charge", rs(b.totals.service));
  if (b.totals.packaging) row("Packaging", rs(b.totals.packaging));
  for (const t of b.totals.taxLines) row(t.name, rs(t.amount));
  if (b.totals.roundOff) row("Round off", rs(b.totals.roundOff));
  rule();
  row("Total", rs(b.totals.grand), 11, true);
  if (b.payments.length) {
    y += 1;
    for (const p of b.payments) row(`Paid · ${p.name}`, rs(p.amount));
  }
  if (b.dueOutstanding) row("Due", rs(b.dueOutstanding), 8.5, true);
  y += 3;
  center("Shared from BillerPe Owner", 7);
  return new Uint8Array(doc.output("arraybuffer"));
}
