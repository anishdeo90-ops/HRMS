"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Archive } from "lucide-react";

type NotificationRow = {
  id: string;
  title: string;
  body?: string | null;
  category: string;
  severity: string;
  status: "unread" | "read" | "archived";
  action_href?: string | null;
  created_at: string;
};

const SEVERITY_CLASS: Record<string, string> = {
  info: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  critical: "bg-red-50 text-red-700",
};

export default function SelfServiceNotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/self-service/notifications");
      const json = await res.json();
      if (json.error) setError(json.error);
      setRows(json.data ?? []);
    } catch {
      setError("Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, status: "read" | "archived") {
    const res = await fetch("/api/hrms/self-service/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setRows((current) => status === "archived"
        ? current.filter((row) => row.id !== id)
        : current.map((row) => row.id === id ? { ...row, status } : row));
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">HRMS alerts and reminders assigned to you.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-800">Inbox</h2>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{rows.length}</span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading notifications...</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Bell size={28} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-500">No active notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_CLASS[row.severity] ?? SEVERITY_CLASS.info}`}>
                  {row.category}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{row.title}</h3>
                    {row.status === "unread" && <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-600">Unread</span>}
                  </div>
                  {row.body && <p className="mt-1 text-sm text-gray-600">{row.body}</p>}
                  <p className="mt-1 text-xs text-gray-400">{new Date(row.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {row.status === "unread" && (
                    <button onClick={() => setStatus(row.id, "read")} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      <CheckCircle2 size={14} />
                      Read
                    </button>
                  )}
                  <button onClick={() => setStatus(row.id, "archived")} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    <Archive size={14} />
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
