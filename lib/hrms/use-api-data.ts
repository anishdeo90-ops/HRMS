"use client";

import { useEffect, useState } from "react";

export function useApiData<T>(url: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);

  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => {
        if (alive) setData((json.data ?? fallback) as T);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);

  return data;
}
