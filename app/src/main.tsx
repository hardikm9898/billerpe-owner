import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/800.css";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { router } from "./router";
import { initI18n } from "./lib/i18n";
import { initTheme } from "./lib/theme";

initTheme();

// Android back button: step back through the app; from a tab's first screen
// put the app in the background instead of closing it to a blank view.
const ROOTS = new Set(["/", "/bills", "/reports", "/manage", "/alerts"]);
if (Capacitor.isNativePlatform()) {
  void CapApp.addListener("backButton", () => {
    if (ROOTS.has(router.history.location.pathname)) void CapApp.minimizeApp();
    else router.history.back();
  });
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  void StatusBar.setBackgroundColor({ color: "#201815" }).catch(() => {});
}

// The phone's language first, so the first screen is already in it.
void initI18n().finally(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  ),
);
