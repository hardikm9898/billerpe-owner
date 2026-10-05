import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Preferences } from "@capacitor/preferences";
import type { DeviceInfo } from "./api";

// This phone, as the cloud's owner_devices row knows it. The id is Android's
// own id on a phone; in a browser (development) a random id kept in storage.

let cached: DeviceInfo | null = null;

async function browserId() {
  const { value } = await Preferences.get({ key: "owner.deviceId" });
  if (value) return value;
  const id = `web-${crypto.randomUUID()}`;
  await Preferences.set({ key: "owner.deviceId", value: id });
  return id;
}

export async function deviceInfo(): Promise<DeviceInfo> {
  if (cached) return cached;
  const native = Capacitor.isNativePlatform();
  const [id, info] = await Promise.all([
    native ? Device.getId().then((d) => d.identifier) : browserId(),
    Device.getInfo().catch(() => null),
  ]);
  cached = {
    deviceId: id,
    name: info?.name || info?.model || "Phone",
    make: info?.manufacturer || "",
    model: info?.model || "",
    android: info?.osVersion || "",
    appVersion: __APP_VERSION__,
  };
  return cached;
}
