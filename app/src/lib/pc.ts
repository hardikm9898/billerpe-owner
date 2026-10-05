import type { PcState } from "./api";
import { ago, since, time } from "./format";

// How an outlet PC's state reads to the owner. The PC sends a heartbeat every
// minute; the server calls it offline after three missed beats.

export interface PcLine {
  tone: "ok" | "warn" | "muted";
  label: string;
  short: string;
}

export function pcLine(pc: PcState, now: number): PcLine {
  if (pc.status === "online") {
    const waiting = pc.pendingOrders ? ` · ${bills(pc.pendingOrders)} uploading` : "";
    return { tone: "ok", label: `Online · last heard ${ago(pc.lastSeenAt, now)}${waiting}`, short: "Online" };
  }
  if (pc.status === "offline") {
    if (!pc.lastSeenAt) return { tone: "warn", label: "Offline · never connected", short: "Offline" };
    // "Offline 15 min · last heard 4:14 PM" (a clock time, not "15 min ago" twice).
    const recent = now - new Date(pc.lastSeenAt).getTime() < 20 * 3600 * 1000;
    // An offline PC with bills on it: the count is the one it reported last.
    if (pc.pendingOrders) return { tone: "warn", label: `Offline ${since(pc.lastSeenAt, now)} · ${bills(pc.pendingOrders)} waiting`, short: "Offline" };
    return { tone: "warn", label: `Offline ${since(pc.lastSeenAt, now)} · last heard ${recent ? time(pc.lastSeenAt) : ago(pc.lastSeenAt, now)}`, short: "Offline" };
  }
  return { tone: "muted", label: "No outlet PC registered yet", short: "Not set up" };
}

/** The PC's own update report ("ready 1.1.2", "failed 1.1.2: reason"...) in plain words. */
export function updateLine(status: string | null): { tone: "ok" | "warn" | "info"; text: string } | null {
  // "<word> <version>[: reason | percent]" - billerpe-local-exe services/exeUpdate.js statusLine().
  const m = /^(\w+)\s+([^\s:]+):?\s*(.*)$/.exec(status || "");
  if (!m) return null;
  const [, word, version, extra] = m;
  switch (word) {
    case "downloading":
      return { tone: "info", text: `Downloading update ${version} (${extra || "0%"})` };
    case "waiting":
      return { tone: "info", text: `Update ${version} is queued to download` };
    case "ready":
      return { tone: "info", text: `Update ${version} downloaded · installs tonight` };
    case "installing":
      return { tone: "info", text: `Installing update ${version}` };
    case "failed":
      return { tone: "warn", text: `Update ${version} failed · BillerPe support can help` };
    default:
      return null;
  }
}

export const bills = (n: number) => `${n} bill${n === 1 ? "" : "s"}`;

export const lastHeardAt = (pc: PcState) => (pc.lastSeenAt ? time(pc.lastSeenAt) : "—");
