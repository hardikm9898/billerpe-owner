import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ChevronRight, Plus, Truck } from "lucide-react";
import { useState } from "react";
import { ErrorNote, Field, SaveButton, SelectField, Syncing, Toast, reachText } from "@/components/forms";
import { Chips, Sheet, useOutlets } from "@/components/pickers";
import { Card, ErrorState, IconTile, Screen, Section, Skeleton, TopBar, cn } from "@/components/ui";
import type { ManageStock } from "@/lib/api";
import { qty } from "@/lib/format";
import { useAction } from "@/lib/useAction";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/manage_/stock/$outletId")({ component: StockScreen });

// Stock (design v1): levels and the low list as the outlet PC last uploaded
// them (view only - the PC owns its stock), and the masters the owner may
// edit: raw materials (units, minimum level) and suppliers. Recipes are view
// only (owner 2026-10-05). Daily entries stay at the outlet.

type Tab = "low" | "raw" | "suppliers" | "recipes";
type Raw = ManageStock["raw"][number];

function StockScreen() {
  const { outletId } = Route.useParams();
  const q = useCall<ManageStock>("manageStock", [Number(outletId)], 30000);
  const { outlets } = useOutlets();
  const outlet = outlets.find((o) => String(o.id) === outletId);
  const reach = reachText(outlet?.name ?? "", outlet ? outlet.pc.status === "online" : null);
  const act = useAction(() => q.refresh());
  const [tab, setTab] = useState<Tab>("low");
  const [raw, setRaw] = useState<Raw | "new" | null>(null);
  const [supplier, setSupplier] = useState<{ id?: string; name: string } | null>(null);
  const [recipe, setRecipe] = useState<ManageStock["recipes"][number] | null>(null);
  const x = q.data;
  const unit = (id: string) => x?.units.find((u) => u.id === id)?.short ?? "";
  const low = (x?.raw ?? []).filter((r) => r.low);
  const id = Number(outletId);

  return (
    <Screen>
      <TopBar title="Stock" sub={`${outlet?.name ?? ""}${x ? ` · ${x.raw.length} raw materials` : ""}`} />
      {x && (
        <Chips
          className="mt-1.5"
          items={[
            { key: "low" as Tab, label: "Low", count: x.stockUploaded ? low.length : undefined },
            { key: "raw" as Tab, label: "Raw materials", count: x.raw.length },
            { key: "suppliers" as Tab, label: "Suppliers", count: x.suppliers.length },
            { key: "recipes" as Tab, label: "Recipes", count: x.recipes.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}
      <div className="px-4 pt-2">
        <ErrorNote text={act.error} />
      </div>
      {q.loading ? (
        <div className="px-4 pt-2">
          <Skeleton className="h-[380px] rounded-[20px]" />
        </div>
      ) : q.error && !x ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : x ? (
        <>
          {tab === "low" &&
            (!x.stockUploaded ? (
              <Card className="mx-4 mt-1 text-[13px] font-semibold leading-relaxed text-ink-2">No stock has been uploaded from the outlet PC yet. It appears once the PC runs BillerPe 1.1.7 or newer.</Card>
            ) : low.length === 0 ? (
              <Card className="mx-4 mt-1 text-center text-[13px] font-semibold text-ink-2">Nothing is below its minimum level.</Card>
            ) : (
              <div className="mx-4 mt-1 overflow-hidden rounded-[20px] bg-surface">
                {low.map((r) => (
                  <button key={r.id} type="button" onClick={() => setRaw(r)} className="block w-full border-t border-line px-3.5 py-3 text-left first:border-t-0">
                    <div className="flex justify-between gap-3">
                      <b className="truncate text-[14.5px]">{r.name}</b>
                      <span className="num shrink-0 font-extrabold text-brand">
                        {qty(r.stock ?? 0)} {unit(r.unitId)}
                      </span>
                    </div>
                    <div className="my-2 h-2 overflow-hidden rounded bg-[#F1EBE5]">
                      <i className="block h-2 rounded bg-brand" style={{ width: `${r.reorderLevel > 0 ? Math.max(2, Math.min(100, ((r.stock ?? 0) / r.reorderLevel) * 100)) : 100}%` }} />
                    </div>
                    <div className="text-[12.5px] font-semibold text-ink-2">
                      Minimum {qty(r.reorderLevel)} {unit(r.unitId)}
                    </div>
                  </button>
                ))}
              </div>
            ))}

          {tab === "raw" && (
            <>
              <div className="flex justify-end px-4 pb-2">
                <button type="button" onClick={() => setRaw("new")} className="flex h-10 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[13px] font-extrabold text-white">
                  <Plus className="size-[18px]" />
                  Raw material
                </button>
              </div>
              <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
                {x.raw.map((r) => (
                  <button key={r.id} type="button" onClick={() => setRaw(r)} className="flex min-h-[60px] w-full items-center gap-3 border-t border-line px-3.5 py-2.5 text-left first:border-t-0">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-bold">{r.name}</div>
                      <div className="truncate text-[12.5px] font-semibold text-ink-2">
                        {r.stock !== null ? `${qty(r.stock)} ${unit(r.unitId)} in hand · ` : ""}minimum {qty(r.reorderLevel)} {unit(r.unitId)}
                        {r.syncing && (
                          <>
                            {" · "}
                            <Syncing />
                          </>
                        )}
                      </div>
                    </div>
                    {r.low && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-extrabold text-brand">Low</span>}
                    <ChevronRight className="size-4 text-[#9A8F88]" />
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === "suppliers" && (
            <>
              <div className="flex justify-end px-4 pb-2">
                <button type="button" onClick={() => setSupplier({ name: "" })} className="flex h-10 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[13px] font-extrabold text-white">
                  <Plus className="size-[18px]" />
                  Supplier
                </button>
              </div>
              {x.suppliers.length === 0 ? (
                <Card className="mx-4 text-center text-[13px] font-semibold text-ink-2">No suppliers yet.</Card>
              ) : (
                <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
                  {x.suppliers.map((s) => (
                    <button key={s.id} type="button" onClick={() => setSupplier({ id: s.id, name: s.name })} className="flex min-h-[56px] w-full items-center gap-3 border-t border-line px-3.5 py-2.5 text-left first:border-t-0">
                      <IconTile tone="ok" icon={Truck} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-bold">{s.name}</div>
                        <div className="text-[12.5px] font-semibold text-ink-2">
                          {s.outstanding > 0 ? `₹${qty(s.outstanding)} to pay` : "Nothing to pay"}
                          {s.syncing && (
                            <>
                              {" · "}
                              <Syncing />
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "recipes" &&
            (x.recipes.length === 0 ? (
              <Card className="mx-4 mt-1 text-center text-[13px] font-semibold text-ink-2">No recipes set up at this outlet.</Card>
            ) : (
              <>
                <p className="mx-5 mb-2 text-xs font-semibold text-ink-2">What each item uses. Recipes are changed at the outlet.</p>
                <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
                  {x.recipes.map((r) => (
                    <button key={r.itemId} type="button" onClick={() => setRecipe(r)} className="flex min-h-[56px] w-full items-center gap-3 border-t border-line px-3.5 py-2.5 text-left first:border-t-0">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-bold">{r.itemName}</div>
                        <div className="text-[12.5px] font-semibold text-ink-2">
                          {r.base.length} ingredient{r.base.length === 1 ? "" : "s"}
                          {r.variants ? ` · ${r.variants} by variant` : ""}
                          {r.addons ? ` · ${r.addons} by add-on` : ""}
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-[#9A8F88]" />
                    </button>
                  ))}
                </div>
              </>
            ))}

          <Section title="Stock reports" />
          <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
            {[
              { id: "stock", title: "Stock in hand & ledger", sub: "Every item's movement over a period" },
              { id: "purchases-wastage", title: "Purchases & wastage", sub: "Purchase orders, payments, wastage" },
            ].map((r) => (
              <Link key={r.id} to="/report/$reportId" params={{ reportId: r.id }} search={{ outlet: id }} className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-3 text-ink first:border-t-0">
                <IconTile tone="ok" icon={BarChart3} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-bold">{r.title}</div>
                  <div className="text-[12.5px] font-semibold text-ink-2">{r.sub}</div>
                </div>
                <ChevronRight className="size-5 text-[#9A8F88]" />
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {x && raw && <RawSheet key={raw === "new" ? "new" : raw.id} raw={raw === "new" ? null : raw} units={x.units} busy={act.busy} error={act.error} onClose={() => setRaw(null)} onSave={async (body) => (await act.run("saveRaw", [id, body], reach)) !== null} />}

      <Sheet open={!!supplier} onClose={() => setSupplier(null)} title={supplier?.id ? "Rename supplier" : "New supplier"}>
        {supplier && (
          <div className="flex flex-col gap-3">
            <Field label="Supplier name" value={supplier.name} onChange={(e) => setSupplier({ ...supplier, name: e.target.value })} autoFocus />
            <ErrorNote text={act.error} />
            <SaveButton
              busy={act.busy}
              disabled={!supplier.name.trim()}
              onClick={async () => {
                if (await act.run("saveSupplier", [id, { ...supplier, name: supplier.name.trim() }], reach)) setSupplier(null);
              }}
            >
              Save supplier
            </SaveButton>
          </div>
        )}
      </Sheet>

      <Sheet open={!!recipe} onClose={() => setRecipe(null)} title={recipe?.itemName ?? "Recipe"}>
        {recipe && x && (
          <div className="overflow-hidden rounded-[20px] bg-surface">
            {recipe.base.map((l, k) => {
              const r = l.kind === "raw" ? x.raw.find((m) => m.id === l.refId) : null;
              const semi = l.kind === "semi" ? x.semi.find((m) => m.id === l.refId) : null;
              return (
                <div key={k} className="flex min-h-[50px] items-center justify-between gap-3 border-t border-line px-3.5 first:border-t-0">
                  <span className="text-[14px] font-bold">{r?.name ?? semi?.name ?? "Item"}</span>
                  <span className="num font-extrabold">
                    {qty(l.qty)} {r ? unit(r.unitId) : ""}
                  </span>
                </div>
              );
            })}
            {(recipe.variants > 0 || recipe.addons > 0) && <p className="border-t border-line px-3.5 py-3 text-xs font-semibold text-ink-2">Variant and add-on extras are set at the outlet.</p>}
          </div>
        )}
      </Sheet>
      <Toast text={act.done} />
    </Screen>
  );
}

function RawSheet({ raw, units, busy, error, onClose, onSave }: { raw: Raw | null; units: ManageStock["units"]; busy: boolean; error: string | null; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [name, setName] = useState(raw?.name ?? "");
  const [unitId, setUnitId] = useState(raw?.unitId ?? units[0]?.id ?? "");
  const [purchaseUnitId, setPurchaseUnitId] = useState(raw?.purchaseUnitId ?? units[0]?.id ?? "");
  const [conversion, setConversion] = useState(String(raw?.conversion ?? 1));
  const [reorder, setReorder] = useState(String(raw?.reorderLevel ?? 0));
  const u = (id: string) => units.find((x) => x.id === id)?.short ?? "";
  const options = units.map((x) => ({ value: x.id, label: `${x.name} (${x.short})` }));
  return (
    <Sheet open onClose={onClose} title={raw ? raw.name : "New raw material"}>
      <div className="flex flex-col gap-3.5">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-2.5">
          <SelectField label="Bought in" value={purchaseUnitId} onChange={setPurchaseUnitId} options={options} />
          <SelectField label="Used in" value={unitId} onChange={setUnitId} options={options} />
        </div>
        <Field label={`1 ${u(purchaseUnitId) || "unit"} = how many ${u(unitId) || "units"}`} value={conversion} inputMode="decimal" onChange={(e) => setConversion(e.target.value.replace(/[^\d.]/g, ""))} />
        <Field label={`Minimum level (${u(unitId) || "unit"})`} value={reorder} inputMode="decimal" onChange={(e) => setReorder(e.target.value.replace(/[^\d.]/g, ""))} hint="Below this it shows as low, and you get a low-stock alert" />
        <p className={cn("px-1 text-xs font-semibold text-ink-2")}>Stock itself is entered at the outlet (purchases, stock in, wastage).</p>
        <ErrorNote text={error} />
        <SaveButton
          busy={busy}
          disabled={!name.trim() || !unitId || !purchaseUnitId || !(Number(conversion) > 0)}
          onClick={async () => {
            if (await onSave({ ...(raw ? { id: raw.id } : {}), name: name.trim(), unitId, purchaseUnitId, conversion: Number(conversion), reorderLevel: Number(reorder) || 0 })) onClose();
          }}
        >
          Save raw material
        </SaveButton>
      </div>
    </Sheet>
  );
}
