import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { BarChart3, Bell, ChevronLeft, Home, ReceiptText, RefreshCw, SlidersHorizontal, WifiOff, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Building blocks of design v1 (BillerPe Owner App/design/index.html).

// twMerge: a screen's own class (bg-dark) beats the component default (bg-surface).
export const cn = (...a: Parameters<typeof clsx>) => twMerge(clsx(...a));

/** A scrolling screen. With `nav`, the bottom navigation; `footer` sits fixed between the content and it. */
export function Screen({ children, nav = true, className, footer }: { children: ReactNode; nav?: boolean; className?: string; footer?: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <main className={cn("no-scrollbar flex-1 overflow-y-auto", nav ? "pb-6" : "pb-8", className)}>{children}</main>
      {footer}
      {nav && <BottomNav />}
    </div>
  );
}

const TABS: { to: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { to: "/", label: "Home", icon: Home, match: (p) => p === "/" || p.startsWith("/outlet") || p.startsWith("/tables") || p === "/profile" },
  { to: "/bills", label: "Bills", icon: ReceiptText, match: (p) => p.startsWith("/bills") || p.startsWith("/bill/") },
  { to: "/reports", label: "Reports", icon: BarChart3, match: (p) => p.startsWith("/reports") || p.startsWith("/report/") },
  { to: "/manage", label: "Manage", icon: SlidersHorizontal, match: (p) => p.startsWith("/manage") },
  { to: "/alerts", label: "Alerts", icon: Bell, match: (p) => p.startsWith("/alerts") },
];

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="safe-bottom shrink-0 border-t border-line bg-surface">
      <div className="flex h-[72px] items-start justify-around pt-2">
        {TABS.map((t) => {
          const on = t.match(path);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn("flex min-h-12 w-16 flex-col items-center gap-[3px] text-[11px] font-bold", on ? "text-brand" : "text-[#6B615B]")}
            >
              <span className={cn("flex h-[30px] w-[54px] items-center justify-center rounded-full", on && "bg-brand-soft")}>
                <Icon className="size-5" strokeWidth={1.9} />
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Back arrow + title row of an inner screen. */
export function TopBar({ title, sub, subClass, right, back = true }: { title: string; sub?: ReactNode; subClass?: string; right?: ReactNode; back?: boolean }) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-1.5 px-3 pb-1.5 pt-3.5">
      {back && (
        <button
          type="button"
          aria-label="Back"
          onClick={() => (window.history.length > 1 ? router.history.back() : void router.navigate({ to: "/" }))}
          className="flex size-11 shrink-0 items-center justify-center rounded-full"
        >
          <ChevronLeft className="size-6" />
        </button>
      )}
      <div className={cn("min-w-0 flex-1", !back && "pl-2")}>
        <h1 className="truncate font-display text-[19px] font-extrabold tracking-tight">{title}</h1>
        {sub && <div className={cn("truncate text-[12.5px] font-semibold text-ink-2", subClass)}>{sub}</div>}
      </div>
      {right}
    </header>
  );
}

/** Big page title of a tab's first screen. */
export function BigTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2.5 px-5 pb-1 pt-[18px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-[-0.5px]">{children}</h1>
      {right}
    </div>
  );
}

export function Section({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-5 pb-2.5 pt-5">
      <h2 className="font-display text-base font-bold">{title}</h2>
      {right && <span className="text-[12.5px] font-bold text-ink-2">{right}</span>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[20px] bg-surface p-4", className)}>{children}</div>;
}

type Tone = "ok" | "warn" | "brand" | "info" | "muted";
const TONE: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  brand: "bg-brand-soft text-brand",
  info: "bg-info-soft text-info",
  muted: "bg-muted-soft text-ink-2",
};

export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-extrabold", TONE[tone])}>{children}</span>;
}

export function IconTile({ tone, icon: Icon, className }: { tone: Tone | "dark"; icon: LucideIcon; className?: string }) {
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tone === "dark" ? "bg-dark text-on-dark" : TONE[tone], className)}>
      <Icon className="size-5" strokeWidth={1.9} />
    </span>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/** A load that failed: the reason and a retry. Never stale or made-up data. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-4 mt-6 flex flex-col items-center rounded-[20px] bg-surface px-6 py-8 text-center">
      <IconTile tone="warn" icon={WifiOff} className="size-12 rounded-2xl" />
      <p className="mt-4 text-[15px] font-bold">Could not load</p>
      <p className="mt-1 text-[13px] font-semibold text-ink-2">{message}</p>
      <button type="button" onClick={onRetry} className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-dark px-5 text-sm font-extrabold text-on-dark">
        <RefreshCw className="size-4" />
        Try again
      </button>
    </div>
  );
}

/** A note shown on a list that is still loading in the background (pull to refresh feel). */
export function RefreshButton({ onClick, spinning }: { onClick: () => void; spinning: boolean }) {
  return (
    <button type="button" aria-label="Refresh" onClick={onClick} className="flex size-10 items-center justify-center rounded-full border border-line-2 bg-surface">
      <RefreshCw className={cn("size-[18px]", spinning && "animate-spin")} />
    </button>
  );
}

/** A tab whose screens arrive in a later phase. Says so plainly; shows no sample data. */
export function ComingSoon({ title, icon, phase, points }: { title: string; icon: LucideIcon; phase: string; points: string[] }) {
  return (
    <Screen>
      <BigTitle>{title}</BigTitle>
      <div className="px-4 pt-3">
        <Card className="flex flex-col items-center px-6 py-8 text-center">
          <IconTile tone="brand" icon={icon} className="size-14 rounded-2xl" />
          <p className="mt-4 font-display text-lg font-bold">Coming in the next update</p>
          <p className="mt-1 text-[13px] font-semibold text-ink-2">{phase}</p>
          <ul className="mt-5 w-full space-y-2 text-left">
            {points.map((p) => (
              <li key={p} className="flex gap-2.5 rounded-xl bg-ground px-3.5 py-2.5 text-[13.5px] font-semibold">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand" />
                {p}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Screen>
  );
}
