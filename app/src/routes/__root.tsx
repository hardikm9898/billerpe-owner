import { Navigate, Outlet, createRootRoute, useNavigate, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoginScreen } from "@/components/LoginScreen";
import { SessionProvider, useSession } from "@/lib/session";
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
  const navigate = useNavigate();

  // A tapped notification opens its screen once the app is ready.
  useEffect(() => {
    if (state.status === "in" && pendingLink) {
      clearPendingLink();
      void navigate({ to: pendingLink });
    }
  }, [state.status, pendingLink, clearPendingLink, navigate]);

  if (state.status === "loading") return <Splash />;
  if (state.status === "out") return <LoginScreen notice={state.notice} />;
  return <Outlet />;
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
