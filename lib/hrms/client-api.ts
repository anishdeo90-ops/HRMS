"use client";

import { useEffect, useState } from "react";

export function useHrmsData<T>(url: string, fallback: T): [T, () => Promise<void>] {
  const [data, setData] = useState<T>(fallback);

  async function load() {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setData((json.data ?? fallback) as T);
  }

  useEffect(() => {
    void load();
  }, [url]);

  return [data, load];
}

export async function saveHrmsData<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Save failed");
  return json.data as T;
}
