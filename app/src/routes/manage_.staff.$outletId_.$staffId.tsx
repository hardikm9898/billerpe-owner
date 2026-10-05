import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ErrorNote, Field, SaveButton, SelectField, Switch } from "@/components/forms";
import { Sheet, useOutlets } from "@/components/pickers";
import { Card, ErrorState, Screen, Section, Skeleton, TopBar, cn } from "@/components/ui";
import type { ManageStaff, Perms } from "@/lib/api";
import { MODULES, ROLES, SPECIALS, changedFrom, clonePerms } from "@/lib/permissions";
import { useAction } from "@/lib/useAction";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/manage_/staff/$outletId_/$staffId")({ component: StaffEdit });

// Edit staff + permissions (design v1): name, mobile, role, reset PIN or
// password, switch off; per-person permissions on the Web POS's own module
// grid (view / add / edit / delete) against the role's defaults.

const ACTIONS = ["view", "create", "edit", "delete"] as const;
const ACTION_LABEL = { view: "View", create: "Add", edit: "Edit", delete: "Delete" };

function StaffEdit() {
  const { outletId, staffId } = Route.useParams();
  const isNew = staffId === "new";
  const navigate = useNavigate();
  const q = useCall<ManageStaff>("manageStaff", [Number(outletId)], 600000);
  const { outlets } = useOutlets();
  const outlet = outlets.find((o) => String(o.id) === outletId);
  const s = q.data?.staff.find((x) => x.id === staffId);

  if (q.loading)
    return (
      <Screen nav={false}>
        <TopBar title={isNew ? "New staff" : "Staff"} />
        <div className="space-y-2.5 px-4 pt-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </Screen>
    );
  if (q.error && !q.data)
    return (
      <Screen nav={false}>
        <TopBar title="Staff" />
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      </Screen>
    );
  if (!q.data || (!isNew && !s))
    return (
      <Screen nav={false}>
        <TopBar title="Staff" />
        <Card className="mx-4 mt-4 text-center text-sm font-semibold text-ink-2">This person is not at the outlet any more.</Card>
      </Screen>
    );
  return <Editor key={staffId} data={q.data} staffId={isNew ? null : staffId} outletId={Number(outletId)} outletName={outlet?.name ?? ""} onDone={() => void navigate({ to: "/manage/staff/$outletId", params: { outletId } })} />;
}

function Editor({ data, staffId, outletId, outletName, onDone }: { data: ManageStaff; staffId: string | null; outletId: number; outletName: string; onDone: () => void }) {
  const s = staffId ? data.staff.find((x) => x.id === staffId)! : null;
  const [name, setName] = useState(s?.name ?? "");
  const [mobile, setMobile] = useState(s?.mobile ?? "");
  const [role, setRole] = useState(s && !s.isOwner ? s.role : "Cashier");
  const [active, setActive] = useState(s?.active ?? true);
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [sheet, setSheet] = useState<"pin" | "password" | null>(null);
  const defaults = data.roleDefaults[role] ?? data.roleDefaults["Cashier"]!;
  const [perms, setPerms] = useState<Perms>(() => clonePerms(s?.overrides ?? defaults));
  const [custom, setCustom] = useState(!!s?.overrides);
  const [all, setAll] = useState(false);
  const act = useAction();
  // A new role starts from its own defaults unless the owner has customised.
  useEffect(() => {
    if (!custom) setPerms(clonePerms(defaults));
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps
  const changed = useMemo(() => changedFrom(perms, defaults), [perms, defaults]);

  if (s?.isOwner) {
    return (
      <Screen nav={false}>
        <TopBar title={s.name} sub={`Owner · ${outletName}`} />
        <Card className="mx-4 mt-2 text-[13.5px] font-semibold leading-relaxed text-ink-2">
          This is the owner's own login. It always has every permission and cannot be switched off or given another role. Change your name, mobile or password in the Web POS profile.
        </Card>
      </Screen>
    );
  }

  const setGrant = (module: string, action: (typeof ACTIONS)[number], v: boolean) => {
    setCustom(true);
    setPerms((p) => {
      const g = { ...(p.modules[module] ?? { view: false, create: false, edit: false, delete: false }), [action]: v };
      // Add / edit / delete need view; no view = nothing.
      if (action === "view" && !v) Object.assign(g, { create: false, edit: false, delete: false });
      if (action !== "view" && v) g.view = true;
      return { ...p, modules: { ...p.modules, [module]: g } };
    });
  };

  const save = async () => {
    const body = { ...(s ? { id: s.id } : {}), name: name.trim(), mobile: mobile.replace(/\D/g, ""), role, ...(password ? { password } : {}), ...(pin ? { pin } : {}) };
    const saved = await act.run<{ id: string | null }>("saveStaff", [outletId, body]);
    if (!saved) return;
    const id = s?.id ?? saved.id;
    if (s && active !== s.active) if (!(await act.run("setStaffActive", [outletId, s.id, active]))) return;
    if (id) {
      const isCustom = changed.size > 0;
      if (isCustom || s?.overrides) if (!(await act.run("setStaffPermissions", [outletId, id, isCustom ? perms : null]))) return;
    }
    onDone();
  };

  const rows = all ? MODULES : MODULES.slice(0, 6);
  return (
    <Screen
      nav={false}
      className="pb-4"
      footer={
        <div className="safe-bottom shrink-0 bg-ground px-4 pb-4 pt-2">
          <ErrorNote text={act.error} />
          <div className={act.error ? "mt-2" : ""}>
            <SaveButton busy={act.busy} onClick={() => void save()} disabled={!name.trim() || mobile.replace(/\D/g, "").length !== 10 || (!s && (!password || pin.length !== 4))}>
              {s ? "Save changes" : "Add staff"}
            </SaveButton>
          </div>
        </div>
      }
    >
      <TopBar title={s ? s.name : "New staff"} sub={`${s ? s.role : "Add a person"} · ${outletName}`} />
      <div className="flex flex-col gap-3.5 px-4 pt-1.5">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Mobile (login)" value={mobile} inputMode="numeric" onChange={(e) => setMobile(e.target.value.replace(/[^\d ]/g, "").slice(0, 12))} />
        <SelectField label="Role" value={role} onChange={setRole} options={ROLES.map((r) => ({ value: r, label: r }))} />
        {s ? (
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => setSheet("pin")} className={cn("flex h-[50px] items-center justify-center gap-2 rounded-2xl border border-line-2 bg-surface text-sm font-extrabold", pin && "border-ok text-ok")}>
              <KeyRound className="size-[18px]" />
              {pin ? "New PIN set" : "Reset PIN"}
            </button>
            <button type="button" onClick={() => setSheet("password")} className={cn("flex h-[50px] items-center justify-center gap-2 rounded-2xl border border-line-2 bg-surface text-sm font-extrabold", password && "border-ok text-ok")}>
              <Lock className="size-[18px]" />
              {password ? "New password set" : "Reset password"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 6 characters" />
            <Field label="4-digit PIN" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </div>
        )}
        {s && (
          <div className="flex items-center justify-between rounded-[20px] bg-surface px-3.5 py-3">
            <div>
              <div className="text-sm font-bold">Active</div>
              <div className="text-xs font-semibold text-ink-2">Off = cannot log in anywhere</div>
            </div>
            <Switch on={active} onChange={setActive} label="Active" />
          </div>
        )}
      </div>

      <Section title="Permissions" right={changed.size ? `${changed.size} changed from ${role}` : `${role} defaults`} />
      <div className="px-4">
        <Card className="px-3.5 py-2.5">
          <div className="grid grid-cols-[1fr_repeat(4,44px)] items-center pb-1.5 text-center text-[11px] font-extrabold text-ink-2">
            <span className="text-left">Module</span>
            {ACTIONS.map((a) => (
              <span key={a}>{ACTION_LABEL[a]}</span>
            ))}
          </div>
          {rows.map((m) => {
            const g = perms.modules[m.key] ?? { view: false, create: false, edit: false, delete: false };
            const diff = changed.has(m.key);
            return (
              <div key={m.key} className={cn("-mx-3.5 grid min-h-[44px] grid-cols-[1fr_repeat(4,44px)] items-center border-t border-line px-3.5 text-center", diff && "bg-[#FFF7EC]")}>
                <span className="text-left text-[13.5px] font-bold">
                  {m.label}
                  {diff && <span className="ml-1 text-[11px] text-warn">changed</span>}
                </span>
                {ACTIONS.map((a) => (
                  <input key={a} type="checkbox" checked={!!g[a]} onChange={(e) => setGrant(m.key, a, e.target.checked)} aria-label={`${m.label} ${ACTION_LABEL[a]}`} className="mx-auto size-[18px] accent-[#AE0A1E]" />
                ))}
              </div>
            );
          })}
          {all && (
            <div className="mt-2 border-t border-line pt-2.5">
              <div className="pb-1 text-[12px] font-extrabold text-ink-2">Special permissions</div>
              {SPECIALS.map((sp) => (
                <label key={sp.key} className={cn("-mx-3.5 flex min-h-[44px] items-center gap-3 px-3.5", changed.has(sp.key) && "bg-[#FFF7EC]")}>
                  <input
                    type="checkbox"
                    checked={!!perms.special[sp.key]}
                    onChange={(e) => {
                      setCustom(true);
                      setPerms((p) => ({ ...p, special: { ...p.special, [sp.key]: e.target.checked } }));
                    }}
                    className="size-[18px] accent-[#AE0A1E]"
                  />
                  <span className="text-[13.5px] font-bold">{sp.label}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-between gap-2 pb-1 pt-2.5 text-[12.5px] font-bold">
            <button type="button" onClick={() => setAll((v) => !v)} className="text-brand">
              {all ? "Show fewer" : `Show all ${MODULES.length} modules`}
            </button>
            {changed.size > 0 && (
              <button
                type="button"
                className="text-brand"
                onClick={() => {
                  setCustom(false);
                  setPerms(clonePerms(defaults));
                }}
              >
                Reset to {role} defaults
              </button>
            )}
          </div>
        </Card>
      </div>

      <Sheet open={sheet === "pin"} onClose={() => setSheet(null)} title="New PIN">
        <Field label="4-digit PIN" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} autoFocus />
        <p className="mt-2 px-1 text-xs font-semibold text-ink-2">Used for the PIN login on the Web POS and Captain App. Saved with the other changes.</p>
        <div className="mt-3">
          <SaveButton busy={false} tone="dark" disabled={pin.length !== 4} onClick={() => setSheet(null)}>
            Use this PIN
          </SaveButton>
        </div>
      </Sheet>
      <Sheet open={sheet === "password"} onClose={() => setSheet(null)} title="New password">
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus hint="At least 6 characters" />
        <div className="mt-3">
          <SaveButton busy={false} tone="dark" disabled={password.length < 6} onClick={() => setSheet(null)}>
            Use this password
          </SaveButton>
        </div>
      </Sheet>
    </Screen>
  );
}
