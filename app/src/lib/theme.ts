import { useSyncExternalStore } from "react";

// Dark mode for this phone (Profile -> Security & help). Off by default so
// the app looks like design v1; the choice is kept on the phone only.

const KEY = "owner.theme";
const listeners = new Set<() => void>();
let dark = false;

function apply() {
  document.documentElement.dataset["theme"] = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#13100e" : "#f5f1ec");
}

/** At start, before the first render. */
export function initTheme() {
  try {
    dark = localStorage.getItem(KEY) === "dark";
  } catch {
    /* storage blocked: light */
  }
  apply();
}

export function setDark(on: boolean) {
  dark = on;
  try {
    localStorage.setItem(KEY, on ? "dark" : "light");
  } catch {
    /* this session only */
  }
  apply();
  listeners.forEach((fn) => fn());
}

export const useDark = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    () => dark,
  );
