"use client";

import { useEffect, useState } from "react";

export function useHrmsApi<T>(url: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    setData(json.data ?? fallback);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [url]);

  return { data, loading, reload: load, setData };
}

export async function hrmsMutation(url: string, method: "POST" | "PATCH", body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json.data;
}
