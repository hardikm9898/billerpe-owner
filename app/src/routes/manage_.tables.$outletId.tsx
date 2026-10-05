import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { ConfirmSheet, ErrorNote, Field, SaveButton, SelectField, Syncing, Toast, reachText } from "@/components/forms";
import { Sheet, useOutlets } from "@/components/pickers";
import { Card, ErrorState, Screen, Section, Skeleton, TopBar, cn } from "@/components/ui";
import type { ManageTables } from "@/lib/api";
import { useAction } from "@/lib/useAction";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/manage_/tables/$outletId")({ component: TablesSetup });

// Tables & sections (design v1): add, rename, switch off. A table with a
// running bill cannot be changed or switched off (the outlet's own rule).

type TableRow = ManageTables["sections"][number]["tables"][number];

function TablesSetup() {
  const { outletId } = Route.useParams();
  const q = useCall<ManageTables>("manageTables", [Number(outletId)], 30000);
  const { outlets } = useOutlets();
  const outlet = outlets.find((o) => String(o.id) === outletId);
  const reach = reachText(outlet?.name ?? "", outlet ? outlet.pc.status === "online" : null);
  const act = useAction(() => q.refresh());
  const [sectionSheet, setSectionSheet] = useState<{ id?: string; name: string } | null>(null);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [table, setTable] = useState<(TableRow & { sectionId: string }) | null>(null);
  const [offSection, setOffSection] = useState<string | null>(null);
  const x = q.data;
  const id = Number(outletId);

  return (
    <Screen>
      <TopBar
        title="Tables & sections"
        sub={`${outlet?.name ?? ""}${x ? ` · ${x.sections.reduce((a, s) => a + s.tables.length, 0)} tables` : ""}`}
        right={
          <button type="button" onClick={() => setSectionSheet({ name: "" })} className="mr-1 flex h-10 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[13px] font-extrabold text-white">
            <Plus className="size-[18px]" />
            Section
          </button>
        }
      />
      <div className="px-4 pt-1">
        <ErrorNote text={act.error} />
      </div>
      {q.loading ? (
        <div className="space-y-2.5 px-4 pt-2">
          <Skeleton className="h-[160px]" />
          <Skeleton className="h-[160px]" />
        </div>
      ) : q.error && !x ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : x ? (
        x.sections.length === 0 ? (
          <Card className="mx-4 mt-3 text-center text-[13px] font-semibold text-ink-2">No sections yet. Add one to start.</Card>
        ) : (
          x.sections.map((s) => (
            <div key={s.id}>
              <Section
                title={s.name}
                right={
                  <span className="flex items-center gap-3">
                    {s.syncing && <Syncing />}
                    <button type="button" onClick={() => setSectionSheet({ id: s.id, name: s.name })} aria-label={`Rename ${s.name}`} className="flex items-center gap-1 text-brand">
                      <Pencil className="size-3.5" />
                      Rename
                    </button>
                  </span>
                }
              />
              <div className="mx-4 rounded-[20px] bg-surface p-3">
                <div className="grid grid-cols-4 gap-2">
                  {s.tables.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTable({ ...t, sectionId: s.id })}
                      className={cn("flex min-h-[64px] flex-col items-start rounded-2xl border p-2 text-left", t.running ? "border-transparent bg-brand-soft" : "border-line-2 bg-ground")}
                    >
                      <b className="font-display text-[15px]">{t.name}</b>
                      <span className="text-[11px] font-semibold text-ink-2">{t.running ? "Running" : `${t.seats} seats`}</span>
                      {t.syncing && (
                        <span className="text-[10.5px] font-bold">
                          <Syncing />
                        </span>
                      )}
                    </button>
                  ))}
                  <button type="button" onClick={() => setAddTo(s.id)} className="flex min-h-[64px] flex-col items-center justify-center rounded-2xl border border-dashed border-line-2 text-[12px] font-bold text-brand">
                    <Plus className="size-5" />
                    Tables
                  </button>
                </div>
                {s.tables.length === 0 && (
                  <button type="button" onClick={() => setOffSection(s.id)} className="mt-2 text-[12.5px] font-bold text-ink-2 underline">
                    Switch this empty section off
                  </button>
                )}
              </div>
            </div>
          ))
        )
      ) : null}

      <Sheet open={!!sectionSheet} onClose={() => setSectionSheet(null)} title={sectionSheet?.id ? "Rename section" : "New section"}>
        {sectionSheet && (
          <div className="flex flex-col gap-3">
            <Field label="Section name" value={sectionSheet.name} onChange={(e) => setSectionSheet({ ...sectionSheet, name: e.target.value })} placeholder="Rooftop" autoFocus />
            <ErrorNote text={act.error} />
            <SaveButton
              busy={act.busy}
              disabled={!sectionSheet.name.trim()}
              onClick={async () => {
                const r = await act.run("saveSection", [id, { ...(sectionSheet.id ? { id: sectionSheet.id } : {}), name: sectionSheet.name.trim() }], reach);
                if (r) setSectionSheet(null);
              }}
            >
              Save section
            </SaveButton>
          </div>
        )}
      </Sheet>

      <AddTablesSheet sectionId={addTo} onClose={() => setAddTo(null)} onSave={async (spec, seats) => (await act.run("addTables", [id, addTo, spec, seats], reach)) !== null} busy={act.busy} error={act.error} />

      <TableSheet
        table={table}
        sections={x?.sections ?? []}
        busy={act.busy}
        error={act.error}
        onClose={() => setTable(null)}
        onSave={async (patch) => (await act.run("editTable", [id, table!.id, patch], reach)) !== null}
        onRemove={async () => (await act.run("removeTable", [id, table!.id], `${table!.name} switched off. ${reach.replace(/^Saved\. /, "")}`)) !== null}
      />

      <ConfirmSheet
        open={!!offSection}
        onClose={() => setOffSection(null)}
        title="Switch section off?"
        text="The section is hidden at the outlet. Old bills keep it."
        confirm="Switch off"
        busy={act.busy}
        onConfirm={async () => {
          const r = await act.run("deleteSection", [id, offSection], reach);
          if (r) setOffSection(null);
        }}
      />
      <Toast text={act.done} />
    </Screen>
  );
}

function AddTablesSheet({ sectionId, onClose, onSave, busy, error }: { sectionId: string | null; onClose: () => void; onSave: (spec: string, seats: number) => Promise<boolean>; busy: boolean; error: string | null }) {
  const [spec, setSpec] = useState("");
  const [seats, setSeats] = useState("4");
  return (
    <Sheet open={!!sectionId} onClose={onClose} title="Add tables">
      <div className="flex flex-col gap-3">
        <Field label="Table or range" value={spec} onChange={(e) => setSpec(e.target.value.toUpperCase())} placeholder="T11 or T11-T20" hint="A range adds every table in it (up to 200)" autoFocus />
        <Field label="Seats each" value={seats} inputMode="numeric" onChange={(e) => setSeats(e.target.value.replace(/\D/g, "").slice(0, 2))} />
        <ErrorNote text={error} />
        <SaveButton
          busy={busy}
          disabled={!spec.trim() || !(Number(seats) >= 1)}
          onClick={async () => {
            if (await onSave(spec.trim(), Number(seats))) {
              setSpec("");
              onClose();
            }
          }}
        >
          Add tables
        </SaveButton>
      </div>
    </Sheet>
  );
}

function TableSheet({ table, sections, busy, error, onClose, onSave, onRemove }: { table: (TableRow & { sectionId: string }) | null; sections: ManageTables["sections"]; busy: boolean; error: string | null; onClose: () => void; onSave: (patch: { name: string; seats: number; sectionId: string }) => Promise<boolean>; onRemove: () => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  if (table && table.id !== lastId) {
    setLastId(table.id);
    setName(table.name);
    setSeats(String(table.seats));
    setSectionId(table.sectionId);
  }
  return (
    <Sheet open={!!table} onClose={onClose} title={table ? `Table ${table.name}` : "Table"}>
      {table && (
        <div className="flex flex-col gap-3">
          {table.running && <p className="rounded-2xl bg-warn-soft px-3.5 py-3 text-[13px] font-bold text-warn">This table has a running bill. Change it after the bill is settled.</p>}
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} disabled={table.running} />
          <Field label="Seats" value={seats} inputMode="numeric" onChange={(e) => setSeats(e.target.value.replace(/\D/g, "").slice(0, 2))} disabled={table.running} />
          <SelectField label="Section" value={sectionId} onChange={setSectionId} options={sections.map((s) => ({ value: s.id, label: s.name }))} disabled={table.running} />
          <ErrorNote text={error} />
          <SaveButton
            busy={busy}
            disabled={table.running || !name.trim() || !(Number(seats) >= 1)}
            onClick={async () => {
              if (await onSave({ name: name.trim(), seats: Number(seats), sectionId })) onClose();
            }}
          >
            Save table
          </SaveButton>
          <SaveButton busy={false} tone="danger" disabled={table.running} onClick={() => setConfirm(true)}>
            Switch table off
          </SaveButton>
          <ConfirmSheet
            open={confirm}
            onClose={() => setConfirm(false)}
            title={`Switch ${table.name} off?`}
            text="It disappears from the outlet's table grid. Old bills keep it."
            confirm="Switch off"
            busy={busy}
            onConfirm={async () => {
              if (await onRemove()) {
                setConfirm(false);
                onClose();
              }
            }}
          />
        </div>
      )}
    </Sheet>
  );
}
