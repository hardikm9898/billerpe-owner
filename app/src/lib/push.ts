import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

// Push notifications from the BillerPe Owner Firebase project (billerpeowner).
// Needs android/app/google-services.json at build time; without it the build
// sets __PUSH_ENABLED__ = false and nothing here runs (registering without
// Firebase would crash the app).

export const pushAvailable = () => Capacitor.isNativePlatform() && __PUSH_ENABLED__;

let token: string | null = null;
let started = false;
const tokenListeners = new Set<(t: string) => void>();
let openHandler: (link: string) => void = () => {};

/**
 * Asks for the notification permission (Android 13+) and registers once per
 * app run. `onToken` runs with the token now (if known) and whenever it
 * changes; `onOpen` gets the notification's link when it is tapped.
 * Returns a function that removes `onToken`.
 */
export function startPush(onToken: (t: string) => void, onOpen: (link: string) => void) {
  if (!pushAvailable()) return () => {};
  tokenListeners.add(onToken);
  openHandler = onOpen;
  if (token) onToken(token);
  if (!started) {
    started = true;
    void (async () => {
      try {
        await PushNotifications.createChannel({
          id: "alerts",
          name: "Owner alerts",
          description: "Outlet offline, risky actions, low stock, day summary",
          importance: 5,
          visibility: 1,
          vibration: true,
        });
        await PushNotifications.addListener("registration", (t) => {
          token = t.value;
          tokenListeners.forEach((l) => l(t.value));
        });
        await PushNotifications.addListener("registrationError", (e) =>
          console.warn("[push] registration failed", e.error),
        );
        await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
          const link = (a.notification.data as { link?: string } | undefined)?.link;
          openHandler(link || "/");
        });
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale")
          perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return;
        await PushNotifications.register();
      } catch (e) {
        console.warn("[push] could not start", e);
      }
    })();
  }
  return () => void tokenListeners.delete(onToken);
}
