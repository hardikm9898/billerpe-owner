import { createFileRoute } from "@tanstack/react-router";
import { ListTree, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Choice, ConfirmSheet, ErrorNote, Field, SaveButton, SelectField, Switch, Syncing, Toast, reachText } from "@/components/forms";
import { Chips, Sheet, useOutlets } from "@/components/pickers";
import { Card, ErrorState, Screen, Skeleton, TopBar, cn } from "@/components/ui";
import type { Dietary, ManageMenu, MenuItemM } from "@/lib/api";
import { money } from "@/lib/format";
import { useAction } from "@/lib/useAction";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/manage_/menu/$outletId")({ component: MenuScreen });

// Menu (design v1): switch an item off when it runs out (Inactive = hidden
// from billing, Captain and QR, still listed), change prices, add and edit
// items and categories. "Syncing…" until the outlet PC has downloaded it.

const DIETS: { key: Dietary; label: string }[] = [
  { key: "veg", label: "Veg" },
  { key: "nonveg", label: "Non-veg" },
  { key: "egg", label: "Egg" },
  { key: "jain", label: "Jain" },
];

function DietMark({ d }: { d: Dietary }) {
  const nonVeg = d === "nonveg" || d === "egg";
  return (
    <span className={cn("flex size-[14px] shrink-0 items-center justify-center rounded-[3px] border-[1.5px]", nonVeg ? "border-brand" : "border-ok")}>
      {nonVeg ? <i className="h-0 w-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-brand" /> : <i className="size-1.5 rounded-full bg-ok" />}
    </span>
  );
}

function MenuScreen() {
  const { outletId } = Route.useParams();
  const q = useCall<ManageMenu>("manageMenu", [Number(outletId)], 30000);
  const { outlets } = useOutlets();
  const outlet = outlets.find((o) => String(o.id) === outletId);
  const act = useAction(() => q.refresh());
  const [text, setText] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<MenuItemM | "new" | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [flip, setFlip] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 4000);
  };
  const x = q.data;
  const reach = reachText(outlet?.name ?? "", outlet ? outlet.pc.status === "online" : null);

  const items = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (x?.items ?? [])
      .filter((i) => cat === "all" || i.categoryId === cat)
      .filter((i) => !t || i.name.toLowerCase().includes(t) || i.shortCode.toLowerCase() === t);
  }, [x, text, cat]);
  const cats = (x?.categories ?? []).filter((c) => c.active);
  const countIn = (id: string) => (x?.items ?? []).filter((i) => i.categoryId === id).length;

  const toggle = async (i: MenuItemM, on: boolean) => {
    setFlip((f) => ({ ...f, [i.id]: on }));
    const r = await act.run("setItemActive", [Number(outletId), i.id, on], `${i.name} ${on ? "is back on" : "is off"}. ${reach.replace(/^Saved\. /, "")}`);
    setFlip((f) => {
      const { [i.id]: _, ...rest } = f;
      return rest;
    });
    return r;
  };

  return (
    <Screen>
      <TopBar
        title="Menu"
        sub={`${outlet?.name ?? ""}${x ? ` · ${x.items.length} items` : ""}`}
        right={
          <button type="button" onClick={() => setEditing("new")} className="mr-1 flex h-10 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[13px] font-extrabold text-white">
            <Plus className="size-[18px]" />
            Item
          </button>
        }
      />
      <div className="flex gap-2 px-4 pt-1.5">
        <label className="flex h-[46px] min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-line-2 bg-surface px-3">
          <Search className="size-[18px] text-ink-2" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search item or short code" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
        </label>
        <button type="button" aria-label="Categories" onClick={() => setCatsOpen(true)} className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px] border border-line-2 bg-surface">
          <ListTree className="size-5" />
        </button>
      </div>
      {x && (
        <Chips
          className="mt-2.5"
          items={[{ key: "all", label: "All", count: x.items.length }, ...cats.map((c) => ({ key: c.id, label: c.name, count: countIn(c.id) }))]}
          value={cat}
          onChange={setCat}
        />
      )}
      <div className="px-4 pt-2.5">
        <ErrorNote text={act.error} />
      </div>
      {q.loading ? (
        <div className="px-4 pt-2">
          <Skeleton className="h-[420px] rounded-[20px]" />
        </div>
      ) : q.error && !x ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : x ? (
        items.length === 0 ? (
          <Card className="mx-4 mt-2 py-8 text-center text-[13px] font-semibold text-ink-2">{text ? `No item matches “${text}”.` : "No items here yet."}</Card>
        ) : (
          <div className="mx-4 mt-1 overflow-hidden rounded-[20px] bg-surface">
            {items.map((i) => {
              const on = flip[i.id] ?? i.active;
              return (
                <div key={i.id} className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0">
                  <DietMark d={i.dietary} />
                  <button type="button" onClick={() => setEditing(i)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-[14.5px] font-bold">{i.name}</div>
                    <div className="truncate text-[12.5px] font-semibold text-ink-2">
                      {!on ? (
                        <span className="text-warn">Off · not on the menu</span>
                      ) : i.variants.length ? (
                        i.variants.map((v) => `${v.name} ${money(v.price)}`).join(" · ")
                      ) : (
                        <>
                          <span className="num font-extrabold text-ink">{money(i.price)}</span>
                          {i.shortCode ? ` · code ${i.shortCode}` : ""}
                        </>
                      )}
                      {i.syncing && (
                        <>
                          {" · "}
                          <Syncing />
                        </>
                      )}
                    </div>
                  </button>
                  <Switch on={on} label={`${i.name} available`} onChange={(v) => void toggle(i, v)} />
                </div>
              );
            })}
          </div>
        )
      ) : null}
      <Toast text={toast ?? act.done} />
      {x && editing && (
        <ItemSheet
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          menu={x}
          defaultCategory={cat !== "all" ? cat : cats[0]?.id ?? ""}
          outletId={Number(outletId)}
          reach={reach}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => {
            setEditing(null);
            await q.refresh();
            showToast(msg);
          }}
        />
      )}
      {x && <CategoriesSheet open={catsOpen} onClose={() => setCatsOpen(false)} menu={x} outletId={Number(outletId)} reach={reach} onChanged={() => q.refresh()} countIn={countIn} />}
    </Screen>
  );
}

function ItemSheet({ item, menu, defaultCategory, outletId, reach, onClose, onSaved }: { item: MenuItemM | null; menu: ManageMenu; defaultCategory: string; outletId: number; reach: string; onClose: () => void; onSaved: (msg: string) => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategory);
  const [shortCode, setShortCode] = useState(item?.shortCode ?? "");
  const [dietary, setDietary] = useState<Dietary>(item?.dietary ?? "veg");
  const [gstType, setGstType] = useState<"G" | "S">(item?.gstType ?? "S");
  const [active, setActive] = useState(item?.active ?? true);
  const [variants, setVariants] = useState(item?.variants.map((v) => ({ ...v, price: String(v.price) })) ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const act = useAction();
  const cats = menu.categories.filter((c) => c.active || c.id === item?.categoryId);

  const save = async () => {
    const body = {
      ...(item ?? { menuId: menu.categories.find((c) => c.id === categoryId)?.menuId ?? menu.menus[0]?.id, description: "", favorite: false, addonGroupIds: [] }),
      name: name.trim(),
      price: Number(price) || 0,
      categoryId,
      shortCode: shortCode.trim(),
      dietary,
      gstType,
      active,
      variants: variants.map((v) => ({ variantId: v.variantId, name: v.name, price: Number(v.price) || 0 })),
    };
    const r = await act.run("saveItem", [outletId, body]);
    if (r) onSaved(`${body.name}: ${reach.replace(/^Saved\. /, "saved. ")}`);
  };
  const remove = async () => {
    if (!item) return;
    const r = await act.run("deleteItem", [outletId, item.id]);
    if (r) onSaved(`${item.name} deleted. ${reach.replace(/^Saved\. /, "")}`);
  };

  return (
    <Sheet open onClose={onClose} title={item ? "Edit item" : "New item"}>
      <div className="flex flex-col gap-3.5">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Paneer Tikka" />
        {variants.length === 0 ? (
          <Field label="Price (₹)" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="0" />
        ) : (
          <div>
            <span className="mb-1.5 block text-[12.5px] font-bold text-ink-2">Prices by variant</span>
            <div className="flex flex-col gap-2">
              {variants.map((v, k) => (
                <label key={v.variantId} className="flex items-center gap-3 rounded-[14px] border border-line-2 bg-surface px-3.5">
                  <span className="min-w-0 flex-1 text-[14.5px] font-bold">{v.name}</span>
                  <span className="text-ink-2">₹</span>
                  <input
                    value={v.price}
                    inputMode="decimal"
                    onChange={(e) => setVariants((list) => list.map((x, j) => (j === k ? { ...x, price: e.target.value.replace(/[^\d.]/g, "") } : x)))}
                    className="h-[48px] w-24 bg-transparent text-right text-[15px] font-bold outline-none"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
        <SelectField label="Category" value={categoryId} onChange={setCategoryId} options={cats.map((c) => ({ value: c.id, label: c.name }))} />
        <Field label="Short code" value={shortCode} onChange={(e) => setShortCode(e.target.value.toUpperCase())} placeholder="Given automatically if empty" hint="Used for quick billing on the Web POS" />
        <Choice label="Food type" value={dietary} onChange={setDietary} options={DIETS} />
        <Choice label="Tax" value={gstType} onChange={setGstType} options={[{ key: "S", label: "Service (with GST)" }, { key: "G", label: "Goods (no tax)" }]} />
        <div className="flex items-center justify-between rounded-[14px] bg-surface px-3.5 py-3">
          <div>
            <div className="text-sm font-bold">On the menu</div>
            <div className="text-xs font-semibold text-ink-2">Off = hidden from billing, Captain and QR</div>
          </div>
          <Switch on={active} onChange={setActive} label="On the menu" />
        </div>
        {item?.hasRecipe && <p className="px-1 text-xs font-semibold text-ink-2">This item has a recipe. Recipes are changed at the outlet.</p>}
        <ErrorNote text={act.error} />
        <SaveButton busy={act.busy} onClick={() => void save()} disabled={!name.trim() || !categoryId}>
          {item ? "Save item" : "Add item"}
        </SaveButton>
        {item && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="flex h-11 items-center justify-center gap-2 text-sm font-extrabold text-brand">
            <Trash2 className="size-4" />
            Delete item
          </button>
        )}
      </div>
      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete item?"
        text={`${item?.name ?? "This item"} goes off every menu at the outlet. Old bills keep it.`}
        confirm="Delete"
        busy={act.busy}
        onConfirm={() => void remove()}
      />
    </Sheet>
  );
}

function CategoriesSheet({ open, onClose, menu, outletId, reach, onChanged, countIn }: { open: boolean; onClose: () => void; menu: ManageMenu; outletId: number; reach: string; onChanged: () => Promise<void> | void; countIn: (id: string) => number }) {
  const act = useAction(onChanged);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const menuId = menu.menus.find((m) => m.isDefault)?.id ?? menu.menus[0]?.id;
  return (
    <Sheet open={open} onClose={onClose} title="Categories">
      <div className="overflow-hidden rounded-[20px] bg-surface">
        {menu.categories.map((c) => (
          <div key={c.id} className="flex min-h-[56px] items-center gap-3 border-t border-line px-3.5 py-2 first:border-t-0">
            {renaming?.id === c.id ? (
              <input autoFocus value={renaming.name} onChange={(e) => setRenaming({ id: c.id, name: e.target.value })} className="h-10 min-w-0 flex-1 rounded-xl border border-line-2 px-3 text-sm font-semibold" />
            ) : (
              <button type="button" onClick={() => setRenaming({ id: c.id, name: c.name })} className="min-w-0 flex-1 text-left">
                <div className={cn("truncate text-[14.5px] font-bold", !c.active && "text-ink-3")}>{c.name}</div>
                <div className="text-xs font-semibold text-ink-2">
                  {countIn(c.id)} items{!c.active ? " · off" : ""}
                  {c.syncing && (
                    <>
                      {" · "}
                      <Syncing />
                    </>
                  )}
                </div>
              </button>
            )}
            {renaming?.id === c.id ? (
              <button
                type="button"
                className="h-10 rounded-full bg-dark px-4 text-sm font-extrabold text-on-dark"
                onClick={async () => {
                  const r = await act.run("saveCategory", [outletId, { ...c, name: renaming.name.trim() }], reach);
                  if (r) setRenaming(null);
                }}
              >
                Save
              </button>
            ) : (
              <Switch on={c.active} label={`${c.name} on`} onChange={(v) => void act.run("saveCategory", [outletId, { ...c, active: v }], reach)} />
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 px-1 text-xs font-semibold text-ink-2">Tap a name to rename it. A category switched off is hidden at the outlet.</p>
      <div className="mt-3 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" className="h-[50px] min-w-0 flex-1 rounded-[14px] border border-line-2 bg-surface px-3.5 text-[15px] font-semibold" />
        <button
          type="button"
          disabled={!name.trim() || act.busy}
          onClick={async () => {
            const r = await act.run("saveCategory", [outletId, { menuId, name: name.trim(), active: true }], reach);
            if (r) setName("");
          }}
          className="h-[50px] shrink-0 rounded-[14px] bg-brand px-4 text-sm font-extrabold text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <div className="mt-2">
        <ErrorNote text={act.error} />
      </div>
      <Toast text={act.done} />
    </Sheet>
  );
}
