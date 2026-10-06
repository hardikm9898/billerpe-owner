import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { Fingerprint, LogOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import mark from "@/assets/billerpe-mark.png";
import { tr } from "@/lib/i18n";
import { useOwner, useSession } from "@/lib/session";

// Fingerprint lock (design v1: "Fingerprint unlock after the first login";
// Profile -> Security & help). When the app is opened again - a cold start
// with a saved login, or back after more than a minute away - the screen is
// covered until the phone's fingerprint / face unlock says it is the owner.
// The minute's grace is for the share sheet and file saving, which send the
// app to the background for a moment. There is no PIN: if the fingerprint
// does not work, "Log out" leads to the normal mobile + password login.
// On by default on a phone that has a fingerprint or face unlock set up.

const KEY = "owner.lock";
const GRACE_MS = 60_000;

let enabled: boolean | null = null; // null = not read yet
let available = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

async function biometricAvailable() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    return (await NativeBiometric.isAvailable()).isAvailable;
  } catch {
    return false;
  }
}

/** Reads the setting and whether the phone can do it (once, at start). */
export async function initLock() {
  available = await biometricAvailable();
  const { value } = await Preferences.get({ key: KEY });
  enabled = value === null ? true : value === "on";
  emit();
}

export async function setLockEnabled(on: boolean) {
  enabled = on;
  await Preferences.set({ key: KEY, value: on ? "on" : "off" });
  emit();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
/** { available: the phone has fingerprint/face unlock, on: the owner's switch }. */
export function useLockSetting() {
  const on = useSyncExternalStore(subscribe, () => enabled);
  const can = useSyncExternalStore(subscribe, () => available);
  return { available: can, on: Boolean(on) };
}

export function AppLock() {
  const { owner } = useOwner();
  const { logout, state } = useSession();
  const { available: can, on } = useLockSetting();
  const active = can && on;
  // Until the phone has said whether it can unlock (a few ms after start), a
  // saved login stays covered: no data flashes before the lock appears.
  const checking = useSyncExternalStore(subscribe, () => enabled === null) && Capacitor.isNativePlatform();
  // A saved login opened from cold: locked from the first frame.
  const [locked, setLocked] = useState(() => state.status === "in" && Boolean(state.resumed));
  const [failed, setFailed] = useState(false);
  const hiddenAt = useRef<number | null>(null);
  const asking = useRef(false);

  useEffect(() => void initLock(), []);

  // Away -> back: lock if it was longer than the grace period.
  useEffect(() => {
    const away = () => (hiddenAt.current ??= Date.now());
    const back = () => {
      if (active && hiddenAt.current && Date.now() - hiddenAt.current > GRACE_MS) setLocked(true);
      hiddenAt.current = null;
    };
    const onVisibility = () => (document.hidden ? away() : back());
    document.addEventListener("visibilitychange", onVisibility);
    const sub = Capacitor.isNativePlatform() ? App.addListener("appStateChange", ({ isActive }) => (isActive ? back() : away())) : null;
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void sub?.then((s) => s.remove());
    };
  }, [active]);

  const ask = useCallback(async () => {
    if (asking.current) return;
    asking.current = true;
    setFailed(false);
    try {
      await NativeBiometric.verifyIdentity({
        title: tr("Unlock BillerPe Owner"),
        subtitle: owner.name || "",
        negativeButtonText: tr("Cancel"),
        maxAttempts: 5,
      });
      setLocked(false);
    } catch {
      setFailed(true); // cancelled or not recognised: the button asks again
    } finally {
      asking.current = false;
    }
  }, [owner.name]);

  // Ask as soon as the lock shows.
  const show = locked && active;
  useEffect(() => {
    if (show) void ask();
  }, [show, ask]);

  if (locked && checking) return <div className="fixed inset-0 z-[100] bg-ground" aria-hidden="true" />;
  if (!show) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="App locked" className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ground px-8 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-center">
      <img src={mark} alt="BillerPe" className="h-9" />
      <p className="mt-8 font-display text-[22px] font-extrabold" translate="no">
        {owner.name || "Owner"}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink-2">{failed ? "Not unlocked. Try again." : "Unlock with your fingerprint"}</p>
      <button type="button" onClick={() => void ask()} aria-label="Unlock with fingerprint" className="mt-8 flex size-20 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Fingerprint className="size-10" />
      </button>
      <button type="button" onClick={() => void logout()} className="mt-10 flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-extrabold text-ink-2">
        <LogOut className="size-4" />
        Log out and use the password
      </button>
    </div>
  );
}
