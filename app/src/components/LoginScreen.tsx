import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useSession } from "@/lib/session";
import mark from "@/assets/billerpe-mark.png";

// Owner login (design v1 "Login"): the owner's mobile + the same password as
// the Web POS. Staff logins and Plan 2 owners get a clear message from the server.

export function LoginScreen({ notice }: { notice?: string | undefined }) {
  const { login } = useSession();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = mobile.replace(/\D/g, "");
  const ready = digits.length >= 10 && password.length > 0 && !busy;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    const r = await login(digits, password);
    setBusy(false);
    if (!r.ok) setError(r.message);
  };

  return (
    <div className="no-scrollbar flex h-full flex-col overflow-y-auto bg-ground px-6 pb-7 pt-6">
      <img src={mark} alt="BillerPe" className="h-[30px] self-start" />

      <div className="mt-14">
        <span className="inline-flex h-7 items-center rounded-full bg-brand-soft px-3 text-xs font-extrabold tracking-wide text-brand">OWNER APP</span>
        <h1 className="mt-4 font-display text-[36px] font-extrabold leading-[1.06] tracking-[-1px]">
          Every outlet,
          <br />
          in your pocket.
        </h1>
        <p className="mt-3.5 text-[15px] font-medium leading-relaxed text-ink-2">
          Sales, running tables, reports and alerts from your BillerPe outlets, wherever you are.
        </p>
      </div>

      {notice && !error && <p className="mt-6 rounded-2xl bg-warn-soft px-4 py-3 text-[13px] font-bold text-warn">{notice}</p>}

      <form onSubmit={submit} className="mt-8 flex flex-col gap-3.5">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold text-ink-2">Mobile number</span>
          <div className="flex gap-2">
            <span className="flex h-[52px] w-[72px] items-center justify-center rounded-2xl border border-line-2 bg-surface text-[15px] font-semibold">+91</span>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/[^\d ]/g, "").slice(0, 14))}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit mobile"
              className="h-[52px] min-w-0 flex-1 rounded-2xl border border-line-2 bg-surface px-3.5 text-[15px] font-semibold outline-none focus:border-ink"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold text-ink-2">Password</span>
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your Web POS password"
              className="h-[52px] w-full rounded-2xl border border-line-2 bg-surface pl-3.5 pr-12 text-[15px] font-semibold outline-none focus:border-ink"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-1 top-1 flex size-11 items-center justify-center text-ink-2"
            >
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </label>

        {error && <p className="rounded-2xl bg-brand-soft px-4 py-3 text-[13px] font-bold text-brand-dark">{error}</p>}

        <button
          type="submit"
          disabled={!ready}
          className="mt-2 flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-brand text-[15px] font-extrabold text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="size-5 animate-spin" />}
          Log in
        </button>
      </form>

      <p className="mt-5 text-center text-[12.5px] font-semibold text-ink-2">Forgot your password? Change it in the Web POS, or call BillerPe support.</p>
      <p className="mt-auto pt-8 text-center text-[12.5px] font-semibold text-ink-2">
        For owners on BillerPe Web POS + Captain App.
        <br />
        Only the owner's login opens this app.
      </p>
    </div>
  );
}
