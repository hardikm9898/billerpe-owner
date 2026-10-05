import { createFileRoute } from "@tanstack/react-router";
import { Lock, Plus } from "lucide-react";
import { useState } from "react";
import { Choice, ErrorNote, Field, SaveButton, Switch, Syncing, Toast, reachText } from "@/components/forms";
import { Sheet, useOutlets } from "@/components/pickers";
import { Card, ErrorState, Screen, Section, Skeleton, TopBar } from "@/components/ui";
import type { ChargeRule, ManageSettings } from "@/lib/api";
import { useAction } from "@/lib/useAction";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/manage_/settings/$outletId/$section")({ component: SettingsScreen });

// Settings from the Manage screen (design v1): tax & bill charges, payment
// modes, promo codes, expense heads. Nothing is deleted from here - a delete
// would never reach the outlet PC - things are switched off instead.

const TITLES: Record<string, string> = { tax: "Tax & bill charges", payments: "Payment modes", promos: "Discounts & promo codes", expenses: "Expense heads" };
const ORDER_TYPES = [
  { key: "dinin", label: "Dine-in" },
  { key: "pickup", label: "Pickup" },
  { key: "delivery", label: "Delivery" },
];

function SettingsScreen() {
  const { outletId, section } = Route.useParams();
  const q = useCall<ManageSettings>("manageSettings", [Number(outletId)], 30000);
  const { outlets } = useOutlets();
  const outlet = outlets.find((o) => String(o.id) === outletId);
  const reach = reachText(outlet?.name ?? "", outlet ? outlet.pc.status === "online" : null);
  const act = useAction(() => q.refresh());
  const x = q.data;
  const id = Number(outletId);
  const [sheet, setSheet] = useState<{ kind: string; value: Record<string, unknown> } | null>(null);

  const body =
    !x ? null : section === "tax" ? (
      <>
        <Section title="Taxes" right={<button type="button" className="flex items-center gap-1 text-brand" onClick={() => setSheet({ kind: "tax", value: { name: "", type: "pr", rate: "", active: true, orderTypes: [] } })}><Plus className="size-3.5" />Add tax</button>} />
        <List
          empty="No tax set up."
          rows={x.taxes.map((t) => ({
            key: t.id,
            title: t.name,
            sub: `${t.type === "fix" ? `₹${t.rate}` : `${t.rate}%`}${t.orderTypes.length ? ` · ${t.orderTypes.map((o) => ORDER_TYPES.find((x) => x.key === o)?.label ?? o).join(", ")}` : " · all orders"}`,
            syncing: t.syncing,
            on: t.active,
            onToggle: (v: boolean) => void act.run("saveTax", [id, { ...t, active: v }], reach),
            onOpen: () => setSheet({ kind: "tax", value: { ...t, rate: String(t.rate) } }),
          }))}
        />
        <Section title="Bill charges" />
        <List
          rows={[
            { key: "service", title: "Service charge", sub: chargeText(x.serviceCharge), on: x.serviceCharge.active, onToggle: (v: boolean) => (v && !x.serviceCharge.value ? setSheet({ kind: "service", value: { ...x.serviceCharge, active: true, value: "" } }) : void act.run("saveCharge", [id, "service", { ...x.serviceCharge, active: v }], reach)), onOpen: () => setSheet({ kind: "service", value: { ...x.serviceCharge, value: String(x.serviceCharge.value) } }) },
            { key: "packaging", title: "Packaging charge", sub: chargeText(x.packagingCharge), on: x.packagingCharge.active, onToggle: (v: boolean) => (v && !x.packagingCharge.value ? setSheet({ kind: "packaging", value: { ...x.packagingCharge, active: true, value: "" } }) : void act.run("saveCharge", [id, "packaging", { ...x.packagingCharge, active: v }], reach)), onOpen: () => setSheet({ kind: "packaging", value: { ...x.packagingCharge, value: String(x.packagingCharge.value) } }) },
          ]}
        />
      </>
    ) : section === "payments" ? (
      <>
        <Section title="Payment modes" right={<button type="button" className="flex items-center gap-1 text-brand" onClick={() => setSheet({ kind: "mode", value: { name: "", active: true } })}><Plus className="size-3.5" />Add mode</button>} />
        <List
          rows={x.paymentModes.map((m) => ({
            key: m.id,
            title: m.name,
            sub: m.locked ? "Always on" : m.custom ? "Your own mode" : "Built in",
            locked: m.locked,
            on: m.active,
            onToggle: m.locked ? undefined : (v: boolean) => void act.run("savePaymentMode", [id, { ...m, active: v }], reach),
            onOpen: m.custom ? () => setSheet({ kind: "mode", value: { ...m } }) : undefined,
          }))}
        />
        <p className="mx-5 mt-2 text-xs font-semibold text-ink-2">Cash and Due are always on. A mode switched off is hidden when settling bills.</p>
      </>
    ) : section === "promos" ? (
      <>
        <Section title="Promo codes" right={<button type="button" className="flex items-center gap-1 text-brand" onClick={() => setSheet({ kind: "promo", value: { name: "", code: "", type: "pr", value: "", active: true } })}><Plus className="size-3.5" />Add code</button>} />
        <List
          empty="No promo codes yet."
          rows={x.promoCodes.map((p) => ({
            key: p.id,
            title: `${p.code} · ${p.name}`,
            sub: p.type === "pr" ? `${p.value}% off` : `₹${p.value} off`,
            syncing: p.syncing,
            on: p.active,
            onToggle: (v: boolean) => void act.run("savePromo", [id, { ...p, active: v }], reach),
            onOpen: () => setSheet({ kind: "promo", value: { ...p, value: String(p.value) } }),
          }))}
        />
      </>
    ) : section === "expenses" ? (
      <>
        <Section title="Expense heads" right={<button type="button" className="flex items-center gap-1 text-brand" onClick={() => setSheet({ kind: "head", value: { name: "" } })}><Plus className="size-3.5" />Add head</button>} />
        <List
          empty="No expense heads yet."
          rows={x.expenseHeads.map((h) => ({
            key: h.id,
            title: h.name,
            sub: h.system ? "Used for supplier payments" : "Tap to rename",
            syncing: h.syncing,
            locked: h.system,
            onOpen: h.system ? undefined : () => setSheet({ kind: "head", value: { ...h } }),
          }))}
        />
        <p className="mx-5 mt-2 text-xs font-semibold text-ink-2">Expenses themselves are entered at the outlet.</p>
      </>
    ) : (
      <Card className="mx-4 mt-3 text-center text-sm font-semibold text-ink-2">Unknown setting.</Card>
    );

  return (
    <Screen>
      <TopBar title={TITLES[section] ?? "Settings"} sub={outlet?.name ?? ""} />
      <div className="px-4">
        <ErrorNote text={sheet ? null : act.error} />
      </div>
      {q.loading ? (
        <div className="px-4 pt-3">
          <Skeleton className="h-[300px]" />
        </div>
      ) : q.error && !x ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : (
        body
      )}
      <EditSheet sheet={sheet} onClose={() => setSheet(null)} act={act} outletId={id} reach={reach} />
      <Toast text={act.done} />
    </Screen>
  );
}

function chargeText(c: ChargeRule) {
  if (!c.active) return "Off";
  return `${c.type === "fixed" ? `₹${c.value}` : `${c.value}%`}${c.orderTypes.length ? ` · ${c.orderTypes.map((o) => ORDER_TYPES.find((x) => x.key === o)?.label ?? o).join(", ")}` : ""}`;
}

interface Row {
  key: string;
  title: string;
  sub: string;
  syncing?: boolean;
  locked?: boolean;
  on?: boolean;
  onToggle?: ((v: boolean) => void) | undefined;
  onOpen?: (() => void) | undefined;
}

function List({ rows, empty }: { rows: Row[]; empty?: string }) {
  if (!rows.length) return <Card className="mx-4 text-center text-[13px] font-semibold text-ink-2">{empty}</Card>;
  return (
    <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
      {rows.map((r) => (
        <div key={r.key} className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0">
          <button type="button" disabled={!r.onOpen} onClick={r.onOpen} className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5 truncate text-[14.5px] font-bold">
              {r.locked && <Lock className="size-3.5 text-ink-3" />}
              {r.title}
            </div>
            <div className="truncate text-[12.5px] font-semibold text-ink-2">
              {r.sub}
              {r.syncing && (
                <>
                  {" · "}
                  <Syncing />
                </>
              )}
            </div>
          </button>
          {r.onToggle !== undefined || r.on !== undefined ? <Switch on={!!r.on} onChange={(v) => r.onToggle?.(v)} disabled={!r.onToggle} label={`${r.title} on`} /> : null}
        </div>
      ))}
    </div>
  );
}

function EditSheet({ sheet, onClose, act, outletId, reach }: { sheet: { kind: string; value: Record<string, unknown> } | null; onClose: () => void; act: ReturnType<typeof useAction>; outletId: number; reach: string }) {
  const [v, setV] = useState<Record<string, unknown>>({});
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = sheet ? `${sheet.kind}:${String(sheet.value["id"] ?? "new")}` : null;
  if (key !== lastKey) {
    setLastKey(key);
    setV(sheet ? { ...sheet.value } : {});
  }
  if (!sheet) return null;
  const set = (k: string, val: unknown) => setV((o) => ({ ...o, [k]: val }));
  const str = (k: string) => String(v[k] ?? "");
  const save = async () => {
    let r: unknown = null;
    if (sheet.kind === "tax") r = await act.run("saveTax", [outletId, { ...v, name: str("name").trim(), rate: Number(v["rate"]) || 0 }], reach);
    else if (sheet.kind === "service" || sheet.kind === "packaging") r = await act.run("saveCharge", [outletId, sheet.kind, { ...v, value: Number(v["value"]) || 0 }], reach);
    else if (sheet.kind === "mode") r = await act.run("savePaymentMode", [outletId, { ...v, name: str("name").trim() }], reach);
    else if (sheet.kind === "promo") r = await act.run("savePromo", [outletId, { ...v, value: Number(v["value"]) || 0 }], reach);
    else if (sheet.kind === "head") r = await act.run("saveExpenseHead", [outletId, { ...v, name: str("name").trim() }], reach);
    if (r) onClose();
  };
  const types = (v["orderTypes"] as string[] | undefined) ?? [];
  const toggleType = (t: string) => set("orderTypes", types.includes(t) ? types.filter((x) => x !== t) : [...types, t]);
  const title = { tax: "Tax", service: "Service charge", packaging: "Packaging charge", mode: "Payment mode", promo: "Promo code", head: "Expense head" }[sheet.kind] ?? "Edit";
  return (
    <Sheet open onClose={onClose} title={sheet.value["id"] ? title : `New ${title.toLowerCase()}`}>
      <div className="flex flex-col gap-3.5">
        {(sheet.kind === "tax" || sheet.kind === "mode" || sheet.kind === "head" || sheet.kind === "promo") && (
          <Field label="Name" value={str("name")} onChange={(e) => set("name", e.target.value)} placeholder={sheet.kind === "tax" ? "CGST" : sheet.kind === "mode" ? "Paytm" : sheet.kind === "head" ? "Gas cylinder" : "Ten off"} />
        )}
        {sheet.kind === "promo" && <Field label="Code" value={str("code")} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))} placeholder="TEN" hint="3–12 letters or numbers" />}
        {(sheet.kind === "tax" || sheet.kind === "promo") && (
          <>
            <Choice label="Type" value={str("type") as "pr" | "fix"} onChange={(k) => set("type", k)} options={[{ key: "pr", label: "Percent %" }, { key: "fix", label: "Fixed ₹" }]} />
            <Field label={sheet.kind === "tax" ? "Rate" : "Value"} value={str(sheet.kind === "tax" ? "rate" : "value")} inputMode="decimal" onChange={(e) => set(sheet.kind === "tax" ? "rate" : "value", e.target.value.replace(/[^\d.]/g, ""))} />
          </>
        )}
        {(sheet.kind === "service" || sheet.kind === "packaging") && (
          <>
            <Choice label="Type" value={str("type") as "percentage" | "fixed"} onChange={(k) => set("type", k)} options={[{ key: "percentage", label: "Percent %" }, { key: "fixed", label: "Fixed ₹" }]} />
            <Field label="Value" value={str("value")} inputMode="decimal" onChange={(e) => set("value", e.target.value.replace(/[^\d.]/g, ""))} />
          </>
        )}
        {(sheet.kind === "tax" || sheet.kind === "service" || sheet.kind === "packaging") && (
          <div>
            <span className="mb-1.5 block text-[12.5px] font-bold text-ink-2">{sheet.kind === "tax" ? "Order types (none = all)" : "Added automatically on"}</span>
            <div className="flex flex-wrap gap-2">
              {ORDER_TYPES.map((t) => (
                <button key={t.key} type="button" onClick={() => toggleType(t.key)} className={`h-10 rounded-full border px-4 text-[13px] font-bold ${types.includes(t.key) ? "border-dark bg-dark text-on-dark" : "border-line-2 bg-surface"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {v["active"] !== undefined && (
          <div className="flex items-center justify-between rounded-[14px] bg-surface px-3.5 py-3">
            <span className="text-sm font-bold">On</span>
            <Switch on={!!v["active"]} onChange={(on) => set("active", on)} label="On" />
          </div>
        )}
        <ErrorNote text={act.error} />
        <SaveButton busy={act.busy} onClick={() => void save()}>
          Save
        </SaveButton>
      </div>
    </Sheet>
  );
}
