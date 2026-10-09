import type { CapacitorConfig } from "@capacitor/cli";

// BillerPe Owner talks only to the BillerPe cloud over HTTPS (/owner/v1),
// never to an outlet PC.
const config: CapacitorConfig = {
  appId: "com.billerpe.owner",
  appName: "BillerPe Owner",
  webDir: "dist",
  server: { androidScheme: "https" },
  android: { backgroundColor: "#201815" },
  plugins: {
    // Android 15+ edge to edge: MainActivity pads the app natively (EdgeInsets.java).
    SystemBars: { insetsHandling: "disable" },
    StatusBar: { style: "DARK", backgroundColor: "#201815", overlaysWebView: false },
  },
};

export default config;
