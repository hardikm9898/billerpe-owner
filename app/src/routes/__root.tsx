import { Navigate, Outlet, createRootRoute, useNavigate, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { refreshAlertCount } from "@/lib/alertCount";
import { useEffect } from "react";
import { LoginScreen } from "@/components/LoginScreen";
import { SessionProvider, useSession } from "@/lib/session";
import { useLang } from "@/lib/i18n";
import { AppLock } from "@/components/AppLock";
import { PlanLockHost } from "@/components/PlanLock";
import mark from "@/assets/billerpe-mark.png";

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: () => <Navigate to="/" />,
  errorComponent: ErrorScreen,
});

function Root() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  );
}

/** Logged out = the login screen, whatever the route. Logged in = the app. */
function Gate() {
  const { state, pendingLink, clearPendingLink } = useSession();
  const router = useRouter();
  // A new language draws every screen again (dates and month names come from code).
  const lang = useLang();

  // A tapped notification opens its screen once the app is ready (the
  // link may carry a query, so the history takes the whole address).
  useEffect(() => {
    if (state.status === "in" && pendingLink) {
      clearPendingLink();
      router.history.push(pendingLink);
      void refreshAlertCount();
    }
  }, [state.status, pendingLink, clearPendingLink, router]);

  if (state.status === "loading") return <Splash />;
  if (state.status === "out") return <LoginScreen notice={state.notice} />;
  return (
    <>
      <Outlet key={lang} />
      <PlanLockHost />
      <AppLock />
    </>
  );
}

function Splash() {
  return (
    <div className="flex h-full items-center justify-center bg-ground">
      <img src={mark} alt="BillerPe" className="h-9 opacity-90" />
    </div>
  );
}

function ErrorScreen({ error, reset }: ErrorComponentProps) {
  console.error(error);
  return (
    <div className="flex h-full flex-col items-center justify-center bg-ground px-8 text-center">
      <p className="font-display text-xl font-extrabold">This screen did not load</p>
      <p className="mt-2 text-sm font-semibold text-ink-2">Something went wrong in the app. Try again, or go back home.</p>
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={reset} className="h-11 rounded-2xl bg-dark px-5 text-sm font-extrabold text-on-dark">
          Try again
        </button>
        <a href="#/" className="flex h-11 items-center rounded-2xl border border-line-2 bg-surface px-5 text-sm font-extrabold text-ink">
          Home
        </a>
      </div>
    </div>
  );
}
