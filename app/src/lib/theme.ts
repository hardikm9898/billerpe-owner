import { Capacitor, registerPlugin } from "@capacitor/core";
import { useSyncExternalStore } from "react";

// Dark mode for this phone (Profile -> Security & help). Off by default so
// the app looks like design v1; the choice is kept on the phone only.

const KEY = "owner.theme";
const listeners = new Set<() => void>();
let dark = false;

// The strips behind the Android status and gesture bars follow the theme (EdgeInsets.java).
const Bars = registerPlugin<{ setColors(o: { top: string; bottom: string; dark: boolean }): Promise<void> }>("Bars");

function apply() {
  document.documentElement.dataset["theme"] = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#13100e" : "#f5f1ec");
  if (Capacitor.getPlatform() === "android") void Bars.setColors({ top: dark ? "#13100e" : "#f5f1ec", bottom: dark ? "#1e1916" : "#ffffff", dark }).catch(() => undefined);
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
