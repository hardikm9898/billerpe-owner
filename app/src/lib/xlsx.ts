import { strToU8, zipSync } from "fflate";

// A real Excel workbook (.xlsx) for the accountant, without a spreadsheet
// library: an .xlsx is a zip of a few XML files. One sheet, a bold header,
// numbers as numbers (so SUM works in Excel), amounts with 2 decimals.

export interface Sheet {
  name: string;
  /** Lines above the table (report name, outlets, dates). */
  title: string[];
  header: string[];
  /** Per column: "text" | "num" | "money". */
  kinds: ("text" | "num" | "money")[];
  rows: (string | number)[][];
  totals?: (string | number)[];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// Style ids (xl/styles.xml below): 0 normal, 1 bold, 2 money, 3 bold money, 4 big bold title.
function cell(ref: string, v: string | number | undefined, kind: "text" | "num" | "money", bold: boolean) {
  if (v === undefined || v === null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    const s = kind === "money" ? (bold ? 3 : 2) : bold ? 1 : 0;
    return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${bold ? ' s="1"' : ""}><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
}

export function xlsx(sheet: Sheet): Uint8Array {
  const rows: string[] = [];
  let r = 1;
  sheet.title.forEach((t, i) => {
    rows.push(`<row r="${r}"><c r="A${r}" t="inlineStr" s="${i === 0 ? 4 : 0}"><is><t xml:space="preserve">${esc(t)}</t></is></c></row>`);
    r++;
  });
  r++; // a blank line before the table
  const headerRow = r;
  rows.push(`<row r="${r}">${sheet.header.map((h, i) => cell(`${colName(i)}${r}`, h, "text", true)).join("")}</row>`);
  r++;
  for (const row of sheet.rows) {
    rows.push(`<row r="${r}">${row.map((v, i) => cell(`${colName(i)}${r}`, v, sheet.kinds[i] ?? "text", false)).join("")}</row>`);
    r++;
  }
  if (sheet.totals) rows.push(`<row r="${r}">${sheet.totals.map((v, i) => cell(`${colName(i)}${r}`, v, sheet.kinds[i] ?? "text", true)).join("")}</row>`);
  const widths = sheet.header.map((h, i) => {
    const longest = Math.max(h.length, ...sheet.rows.slice(0, 500).map((row) => String(row[i] ?? "").length));
    return `<col min="${i + 1}" max="${i + 1}" width="${Math.min(48, Math.max(9, longest + 3))}" customWidth="1"/>`;
  });
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.join("")}</cols><sheetData>${rows.join("")}</sheetData></worksheet>`;
  const name = esc(sheet.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Report");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml),
  };
  return zipSync(files, { level: 6 });
}
