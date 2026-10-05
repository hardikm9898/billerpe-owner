import { useCallback, useEffect, useRef, useState } from "react";
import { call, SessionEndedError } from "./api";

// Loads one owner method and keeps it fresh: again every `pollMs` while the
// app is in front (outlet data changes at most every minute - the outlet PC
// heartbeat), and right away when the app comes back to the front.
// `skew` = server clock - phone clock, for "X min ago".

export interface CallState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  skew: number;
  refresh(): Promise<void>;
}

export function useCall<T extends { serverTime?: string }>(name: string, args: unknown[] = [], pollMs = 60000): CallState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [skew, setSkew] = useState(0);
  const key = JSON.stringify([name, args]);
  const keyRef = useRef(key);
  keyRef.current = key;

  const load = useCallback(async () => {
    const asked = key;
    setRefreshing(true);
    try {
      const sentAt = Date.now();
      const r = await call<T>(name, ...args);
      if (keyRef.current !== asked) return;
      if (r && typeof r === "object" && r.serverTime) {
        const mid = (sentAt + Date.now()) / 2;
        setSkew(new Date(r.serverTime).getTime() - mid);
      }
      setData(r);
      setError(null);
    } catch (e) {
      if (e instanceof SessionEndedError) return;
      if (keyRef.current === asked) setError((e as Error).message);
    } finally {
      if (keyRef.current === asked) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, pollMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, pollMs]);

  return { data, error, loading, refreshing, skew, refresh: load };
}

/** The server's "now" in phone milliseconds, ticking every 15 s for "X min ago". */
export function useServerNow(skew: number) {
  const [now, setNow] = useState(() => Date.now() + skew);
  useEffect(() => {
    setNow(Date.now() + skew);
    const t = setInterval(() => setNow(Date.now() + skew), 15000);
    return () => clearInterval(t);
  }, [skew]);
  return now;
}
