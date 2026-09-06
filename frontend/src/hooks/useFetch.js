import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal data hook: re-runs `fn` when `deps` change; exposes loading / error / reload. */
export const useFetch = (fn, deps = [], { enabled = true } = {}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const seq = useRef(0);

  const run = useCallback(async () => {
    if (!enabled) return;
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      if (id === seq.current) setData(res);
    } catch (e) {
      if (id === seq.current) setError(e?.response?.data?.detail || e.message || "Request failed");
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    run();
  }, [run]);

  return { data, error, loading, reload: run, setData };
};
