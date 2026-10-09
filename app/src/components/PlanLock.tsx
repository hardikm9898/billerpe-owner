import { CalendarPlus, CreditCard, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet } from "./pickers";
import { call, onPlanLocked, type PlanState } from "@/lib/api";

// An outlet whose BillerPe plan has ended is locked (owner 2026-10-08): its
// pages answer "plan expired" and this dialog opens - renew with the payment
// link, or use the outlet's one "Extend 1 day". The owner's other outlets
// keep working.

export function PlanLockHost() {
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    onPlanLocked((p) => {
      if (!p) return;
      setPlan(p);
      setError(null);
      setNote(null);
    });
  }, []);
  if (!plan) return null;
  const run = async (kind: string, fn: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const close = () => setPlan(null);
  return (
    <Sheet open onClose={close} title={`${plan.outlet}: ${(plan as { reason?: string | null }).reason === "unpaid" ? "payment pending" : "plan ended"}`}>
      <p className="text-[14px] font-semibold leading-relaxed text-ink-2">{plan.message || "This outlet's BillerPe software is locked until the plan is renewed."}</p>
      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          disabled={!!busy}
          onClick={() =>
            void run("pay", async () => {
              const r = await call<{ url: string }>("planPayLink", plan.hotelId);
              window.open(r.url, "_blank", "noopener");
            })
          }
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-[14.5px] font-extrabold text-white disabled:opacity-50"
        >
          <CreditCard className="size-5" /> {(plan as { reason?: string | null }).reason === "unpaid" ? "Pay now (online)" : "Renew now (pay online)"}
        </button>
        {plan.canExtend && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              void run("extend", async () => {
                await call("planExtend", plan.hotelId);
                window.location.reload();
              })
            }
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-line-2 bg-surface text-[14.5px] font-extrabold disabled:opacity-50"
          >
            <CalendarPlus className="size-5" /> Extend 1 day (once)
          </button>
        )}
        <button
          type="button"
          disabled={!!busy}
          onClick={() =>
            void run("check", async () => {
              const p = await call<PlanState>("planStatus", plan.hotelId);
              if (!p.expired) window.location.reload();
              else setNote("Not renewed yet. After paying online it unlocks within a minute.");
            })
          }
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-line-2 bg-surface text-[14.5px] font-extrabold disabled:opacity-50"
        >
          <RefreshCw className="size-5" /> I have paid: check again
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-[13px] font-bold text-brand">{error}</p>}
      {note && <p className="mt-3 text-[13px] font-semibold text-ink-2">{note}</p>}
      {!plan.canExtend && <p className="mt-3 text-[12.5px] font-semibold text-ink-2">The 1-day extension is already used.</p>}
    </Sheet>
  );
}
