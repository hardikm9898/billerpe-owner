import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { Syncing } from "@/components/forms";
import { Chips, useOutlets } from "@/components/pickers";
import { Card, ErrorState, Screen, Skeleton, Tag, TopBar } from "@/components/ui";
import type { ManageStaff } from "@/lib/api";
import { initials } from "@/lib/format";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/manage_/staff/$outletId")({ component: StaffScreen });

// Staff & access (design v1): everyone at the outlet by role. Switching a
// person off stops their logins on the Web POS and Captain App.

const TONES = ["bg-dark text-on-dark", "bg-brand-soft text-brand", "bg-info-soft text-info", "bg-warn-soft text-warn", "bg-ok-soft text-ok"];

function StaffScreen() {
  const { outletId } = Route.useParams();
  const q = useCall<ManageStaff>("manageStaff", [Number(outletId)], 30000);
  const { outlets } = useOutlets();
  const outlet = outlets.find((o) => String(o.id) === outletId);
  const [role, setRole] = useState("all");
  const x = q.data;
  const roles = [...new Set((x?.staff ?? []).map((s) => s.role))];
  const list = (x?.staff ?? []).filter((s) => role === "all" || s.role === role).sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));

  return (
    <Screen>
      <TopBar
        title="Staff & access"
        sub={`${outlet?.name ?? ""}${x ? ` · ${x.staff.length} staff` : ""}`}
        right={
          <Link to="/manage/staff/$outletId/$staffId" params={{ outletId, staffId: "new" }} className="mr-1 flex h-10 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[13px] font-extrabold text-white">
            <Plus className="size-[18px]" />
            Staff
          </Link>
        }
      />
      {x && (
        <Chips
          className="mt-1.5"
          items={[{ key: "all", label: "All", count: x.staff.length }, ...roles.map((r) => ({ key: r, label: r, count: x.staff.filter((s) => s.role === r).length }))]}
          value={role}
          onChange={setRole}
        />
      )}
      {q.loading ? (
        <div className="px-4 pt-3">
          <Skeleton className="h-[420px] rounded-[20px]" />
        </div>
      ) : q.error && !x ? (
        <ErrorState message={q.error} onRetry={() => void q.refresh()} />
      ) : x ? (
        list.length === 0 ? (
          <Card className="mx-4 mt-3 text-center text-[13px] font-semibold text-ink-2">No staff here yet.</Card>
        ) : (
          <div className="mx-4 mt-3 overflow-hidden rounded-[20px] bg-surface">
            {list.map((s, k) => (
              <Link key={s.id} to="/manage/staff/$outletId/$staffId" params={{ outletId, staffId: s.id }} className="flex min-h-[64px] items-center gap-3 border-t border-line px-3.5 py-2.5 text-ink first:border-t-0">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold ${s.active ? TONES[k % TONES.length] : "bg-muted-soft text-ink-3"}`}>{initials(s.name)}</span>
                <div className={`min-w-0 flex-1 ${s.active ? "" : "opacity-70"}`}>
                  <div className="truncate text-[14.5px] font-bold">{s.name}</div>
                  <div className="truncate text-[12.5px] font-semibold text-ink-2">
                    {s.isOwner ? "Owner" : s.role} · {s.mobile.replace(/^(\d{5})\d{2}(\d{3})$/, "$1 ••• $2")}
                    {s.overrides ? " · custom access" : ""}
                    {s.syncing && (
                      <>
                        {" · "}
                        <Syncing />
                      </>
                    )}
                  </div>
                </div>
                <Tag tone={s.active ? "ok" : "muted"}>{s.active ? "Active" : "Off"}</Tag>
                <ChevronRight className="size-4 shrink-0 text-chev" />
              </Link>
            ))}
          </div>
        )
      ) : null}
    </Screen>
  );
}
