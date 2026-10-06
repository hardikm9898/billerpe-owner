import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Preferences } from "@capacitor/preferences";
import * as api from "./api";
import { deviceInfo } from "./device";
import { startPush } from "./push";
import { currentLang, onLangChange } from "./i18n";

// Who is logged in on this phone. The token is kept in app storage and
// checked with the server at every app start (resume); any 401 later sends
// the app back to the login screen - never a half-logged-in state.

const KEY = "owner.session";

type State =
  | { status: "loading" }
  | { status: "out"; notice?: string }
  /** resumed = a saved login opened again (the fingerprint lock asks first). */
  | { status: "in"; session: api.Session; resumed?: boolean };

interface SessionApi {
  state: State;
  login(mobile: string, password: string): Promise<{ ok: true } | { ok: false; message: string }>;
  logout(): Promise<void>;
  /** Where a tapped notification wants to go (the root layout navigates). */
  pendingLink: string | null;
  clearPendingLink(): void;
}

const Ctx = createContext<SessionApi | null>(null);

const LOGIN_MESSAGES: Record<string, string> = {
  "wrong-password": "Wrong mobile number or password.",
  network: "No internet connection. Check your mobile data or Wi-Fi and try again.",
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const end = useCallback(async (notice?: string) => {
    api.setToken(null);
    await Preferences.remove({ key: KEY });
    setState(notice ? { status: "out", notice } : { status: "out" });
  }, []);

  // Any 401 from the server.
  useEffect(() => {
    api.onSessionEnded(() => {
      if (stateRef.current.status === "in") void end("Your session has ended. Please log in again.");
    });
  }, [end]);

  // App start: check the saved session with the server.
  useEffect(() => {
    void (async () => {
      const { value } = await Preferences.get({ key: KEY });
      const saved = value ? (JSON.parse(value) as api.Session) : null;
      if (!saved?.token) return setState({ status: "out" });
      const r = await api.resume(saved.token, await deviceInfo());
      if (r.ok) {
        api.setToken(r.session.token);
        setState({ status: "in", session: r.session, resumed: true });
      } else if (r.error === "network") {
        // Offline at start: keep the session; screens show the network error and retry.
        api.setToken(saved.token);
        setState({ status: "in", session: saved, resumed: true });
      } else {
        await end("Your session has ended. Please log in again.");
      }
    })();
  }, [end]);

  // Push: register this phone's token with the server while logged in.
  const loggedIn = state.status === "in";
  useEffect(() => {
    if (!loggedIn) return;
    return startPush(
      (t) => void api.call("setPushToken", t).catch(() => {}),
      (link) => setPendingLink(link),
    );
  }, [loggedIn]);

  // The server writes this phone's notifications in its language.
  useEffect(() => {
    if (!loggedIn) return;
    const send = () => void api.call("setLanguage", currentLang()).catch(() => {});
    send();
    return onLangChange(send);
  }, [loggedIn]);

  const login = useCallback(async (mobile: string, password: string) => {
    const r = await api.login(mobile, password, await deviceInfo());
    if (!r.ok) return { ok: false as const, message: r.message || LOGIN_MESSAGES[r.error] || api.GENERIC };
    api.setToken(r.session.token);
    await Preferences.set({ key: KEY, value: JSON.stringify(r.session) });
    setState({ status: "in", session: r.session });
    return { ok: true as const };
  }, []);

  const logout = useCallback(async () => {
    // The server forgets this phone (and its push token); log out locally even if offline.
    await api.call("logout").catch(() => {});
    await end();
  }, [end]);

  const value = useMemo<SessionApi>(
    () => ({ state, login, logout, pendingLink, clearPendingLink: () => setPendingLink(null) }),
    [state, login, logout, pendingLink],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}

/** The logged-in session (only inside screens behind the login gate). */
export function useOwner() {
  const { state } = useSession();
  if (state.status !== "in") throw new Error("useOwner while logged out");
  return state.session;
}
