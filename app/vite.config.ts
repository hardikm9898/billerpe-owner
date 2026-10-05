import { existsSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Plain Vite SPA: Capacitor ships the static dist/ folder inside the Android
// app. Same setup as the BillerPe POS App.
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      routeFileIgnorePrefix: "-",
      quoteStyle: "double",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  // Push only when the Firebase config is in the Android project:
  // registering without it would crash the app (src/lib/push.ts).
  define: {
    __PUSH_ENABLED__: JSON.stringify(existsSync("android/app/google-services.json")),
    __APP_VERSION__: JSON.stringify(process.env["npm_package_version"] || "0.0.0"),
  },
  server: { port: 5191, strictPort: false },
  build: { outDir: "dist", sourcemap: false, target: "es2020" },
});
