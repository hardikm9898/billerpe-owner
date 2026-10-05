import { useEffect, useSyncExternalStore } from "react";
import { call } from "./api";

// The unread-alerts number on the Alerts tab: one shared poll for the whole
// app (every minute while it is open), refreshed at once after alerts are read.

let count = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let users = 0;

const set = (n: number) => {
  if (n === count) return;
  count = n;
  listeners.forEach((l) => l());
};

export async function refreshAlertCount() {
  try {
    set((await call<{ unread: number }>("alertCount")).unread);
  } catch {
    /* offline or logged out: keep the last number */
  }
}
export const setAlertCount = set;

export function useAlertCount() {
  useEffect(() => {
    users++;
    if (!timer) {
      void refreshAlertCount();
      timer = setInterval(() => document.visibilityState === "visible" && void refreshAlertCount(), 60000);
    }
    return () => {
      users--;
      if (!users && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => count,
  );
}
