// The BillerPe cloud's Owner App API (uat-backend-v2 ownerv1/routes.js).
// POST /owner/v1/<method> with { args }, answer { ok, result } or
// { ok: false, error }. 401 = the session ended (logged out elsewhere,
// password changed at the outlet, owner login switched off).

export const API_BASE = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") || "";

const TIMEOUT_MS = 20000;
export const GENERIC = "Something went wrong. Please try again.";

export interface Owner {
  name: string;
  mobile: string;
}
export interface Session {
  token: string;
  owner: Owner;
  deviceId: string;
}
export interface DeviceInfo {
  deviceId: string;
  name: string;
  make: string;
  model: string;
  android: string;
  appVersion: string;
}

export type PcStatus = "online" | "offline" | "not-registered";
export interface PcState {
  status: PcStatus;
  lastSeenAt: string | null;
  version: string | null;
  updateStatus: string | null;
  pcName: string | null;
  registeredAt: string | null;
  /** Bills on the PC not yet in the cloud; null = the PC's BillerPe is too old to report it (exe < 1.1.7). */
  pendingOrders: number | null;
  /** When the PC last uploaded its bills successfully; null = not reported. */
  lastPushAt: string | null;
}
export interface Outlet {
  id: number;
  name: string;
  subscriptionEndsOn: string | null;
  pc: PcState;
}
export interface OutletsResult {
  serverTime: string;
  outlets: Outlet[];
}

export type LoginResult =
  | { ok: true; session: Session }
  | { ok: false; error: string; message?: string };

/** No answer from the server (no internet, server down, timeout). */
export class NetworkError extends Error {
  constructor() {
    super("No internet connection. Check your mobile data or Wi-Fi.");
  }
}
/** The server ended this phone's session. */
export class SessionEndedError extends Error {
  constructor() {
    super("Your session has ended. Please log in again.");
  }
}

let token: string | null = null;
let sessionEnded: (() => void) | null = null;

export const setToken = (t: string | null) => {
  token = t;
};
/** The session store sends the app back to login through this. */
export const onSessionEnded = (fn: () => void) => {
  sessionEnded = fn;
};

async function post(path: string, body: unknown, auth: boolean) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/owner/v1${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!json) throw new NetworkError();
    return { status: res.status, json };
  } catch (e) {
    if (e instanceof NetworkError) throw e;
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
}

/** Any owner method by name. A refusal is thrown as an Error with the server's message. */
export async function call<T>(name: string, ...args: unknown[]): Promise<T> {
  const { status, json } = await post(`/${name}`, { args }, true);
  if (status === 401) {
    sessionEnded?.();
    throw new SessionEndedError();
  }
  if (!json["ok"]) throw new Error((json["error"] as string) || GENERIC);
  return json["result"] as T;
}

async function sessionCall(path: string, body: unknown): Promise<LoginResult> {
  try {
    const { json } = await post(path, body, false);
    return json as unknown as LoginResult;
  } catch {
    return { ok: false, error: "network" };
  }
}

export const login = (mobile: string, password: string, device: DeviceInfo) =>
  sessionCall("/login", { mobile, password, device });

export const resume = (t: string, device: DeviceInfo) => sessionCall("/resume", { token: t, device });

/* ------------------------------ phase 1 · watch ------------------------------ */

export type RangeKey = "today" | "yesterday" | "7d" | "30d" | "custom";
export interface Range {
  key: RangeKey;
  from?: string;
  to?: string;
}
export interface HourBucket {
  hour: number;
  amount: number;
}
export interface Attention {
  kind: "cancel-after-kot" | "cancel" | "edited" | "discount";
  outletId: number;
  billId: string;
  billNo: string;
  amount: number;
  pct?: number;
  by: string;
  at: string;
  reason?: string;
}
export interface HomeOutlet {
  id: number;
  net: number;
  compareNet: number;
  compareLabel: string;
  bills: number;
  items: number;
  runningTables: number;
  totalTables: number;
  openAmount: number;
  cancelled: number;
  hourly: HourBucket[];
  nowIndex: number;
  dayStart: string;
}
export interface HomeResult {
  serverTime: string;
  outlets: HomeOutlet[];
  attention: Attention | null;
}
export interface OutletResult {
  serverTime: string;
  id: number;
  name: string;
  range: { key: RangeKey; from: string; to: string; days: number; isToday: boolean };
  net: number;
  compareNet: number;
  compareLabel: string;
  bills: number;
  avgBill: number;
  items: number;
  discount: number;
  tax: number;
  expenses: number;
  cancelled: number;
  hourly: HourBucket[] | null;
  nowIndex: number | null;
  daily: { day: string; amount: number }[] | null;
  runningTables: number;
  totalTables: number;
  openAmount: number;
  cash: { expected: number; openedAt: string | null; by: string } | null;
  payments: { name: string; amount: number }[];
  topItems: { name: string; qty: number; amount: number }[];
}
export type TableState = "free" | "running" | "billed";
export interface TableTile {
  id: string;
  name: string;
  state: TableState;
  billId?: string;
  billNo?: string;
  amount?: number;
  minutes?: number;
  overdue?: boolean;
  captain?: string;
}
export interface TablesResult {
  serverTime: string;
  sections: { id: string; name: string; tables: TableTile[] }[];
  running: number;
  total: number;
  pickup: { billId: string; billNo: string; amount: number; createdAt: string }[];
}
export type Tone = "ok" | "warn" | "brand" | "info" | "muted";
export type BillFilter = "all" | "running" | "settled" | "cancelled" | "edited" | "due" | "discount";
export interface BillRow {
  id: string;
  outletId: number;
  outletName: string;
  billNo: string;
  place: string;
  status: "running" | "hold" | "billed" | "settled" | "cancelled";
  amount: number;
  at: string;
  sub: string;
  tag: { tone: Tone; text: string };
}
export interface BillsResult {
  serverTime: string;
  counts: Record<BillFilter, number>;
  more: boolean;
  bills: BillRow[];
}
export interface BillDetail {
  serverTime: string;
  id: string;
  outletId: number;
  outletName: string;
  billNo: string;
  status: BillRow["status"];
  tag: { tone: Tone; text: string };
  type: "dinin" | "pickup";
  table: string | null;
  section: string | null;
  createdAt: string;
  businessDate: string;
  captain: string;
  cashier: string;
  customer: { name: string; mobile: string } | null;
  kots: { no: number; at: string; by: string; lines: { name: string; variant: string; addons: string; note: string; qty: number; amount: number }[] }[];
  held: { name: string; qty: number; amount: number }[];
  totals: {
    subtotal: number;
    discount: number;
    discountReason: string;
    service: number;
    packaging: number;
    taxLines: { name: string; amount: number }[];
    roundOff: number;
    grand: number;
  };
  payments: { name: string; amount: number }[];
  dueOutstanding: number;
  cancelReason: string;
  activity: { at: string; action: string; label: string; by: string; role: string }[];
}
