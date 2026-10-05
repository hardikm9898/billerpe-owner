import { useCallback, useState } from "react";
import { call } from "./api";

// One change from a Manage screen: busy while it runs, the server's message
// when it is refused, and a confirmation the screen shows afterwards.
// Changes reach the outlet PC through its own sync (about a minute).

export function useAction(onDone?: () => void | Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = useCallback(
    async <T = unknown>(name: string, args: unknown[], doneText?: string): Promise<T | null> => {
      setBusy(true);
      setError(null);
      try {
        const r = await call<T>(name, ...args);
        if (doneText) {
          setDone(doneText);
          setTimeout(() => setDone((d) => (d === doneText ? null : d)), 4000);
        }
        await onDone?.();
        return r;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [onDone],
  );

  return { run, busy, error, done, clearError: () => setError(null) };
}
