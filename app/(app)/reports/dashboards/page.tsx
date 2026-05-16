"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type DashboardMetric = {
  key?: string;
  label?: string;
  value?: number | string | null;
  status?: string | null;
  detail?: string | null;
};

type DashboardAlert = {
  id?: string;
  title?: string | null;
  message?: string | null;
  severity?: string | null;
  status?: string | null;
  domain?: string | null;
};

type AutomationRule = {
  id?: string;
  name?: string | null;
  rule_name?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  last_run_at?: string | null;
};

type DashboardPayload = {
  metrics?: DashboardMetric[];
  cards?: DashboardMetric[];
  alerts?: DashboardAlert[];
  headcount?: number | null;
  attendance?: number | null;
  leave?: number | null;
  expenses?: number | null;
  payroll_readiness?: number | null;
  performance?: number | null;
  lifecycle?: number | null;
  approvals?: number | null;
};

const DEFAULT_TILES: DashboardMetric[] = [
  { key: "headcount", label: "Headcount", detail: "Active employee count" },
  { key: "attendance", label: "Attendance", detail: "Attendance coverage" },
  { key: "leave", label: "Leave", detail: "Open leave activity" },
  { key: "expenses", label: "Expenses", detail: "Claims and advances" },
  { key: "payroll_readiness", label: "Payroll readiness", detail: "Payroll period readiness" },
  { key: "performance", label: "Performance", detail: "Open goals and reviews" },
  { key: "lifecycle", label: "Lifecycle", detail: "Onboarding and changes" },
  { key: "approvals", label: "Approvals", detail: "Pending manager actions" },
  { key: "alerts", label: "Alerts", detail: "Operational alerts" },
];

function statusClass(status?: string | null) {
  if (status === "good" || status === "active" || status === "completed") return "bg-green-100 text-green-700";
  if (status === "warning" || status === "pending" || status === "open") return "bg-amber-100 text-amber-700";
  if (status === "critical" || status === "blocked" || status === "overdue") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function formatValue(value?: number | string | null) {
  if (typeof value === "number") return new Intl.NumberFormat().format(value);
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
}

async function readDashboard(res: Response): Promise<DashboardPayload> {
  const json = await res.json().catch(() => ({}));
  return (json.data ?? json.dashboard ?? {}) as DashboardPayload;
}

async function readAutomation(res: Response): Promise<AutomationRule[]> {
  const json = await res.json().catch(() => ({}));
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.data?.rules)) return json.data.rules;
  if (Array.isArray(json.rules)) return json.rules;
  return [];
}

export default function ReportsDashboardsPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardPayload>({});
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const [dashboardRes, automationRes] = await Promise.all([
      fetch("/api/hrms/dashboards"),
      fetch("/api/hrms/automation"),
    ]);

    if (dashboardRes.ok) setDashboard(await readDashboard(dashboardRes));
    else {
      const message = (await dashboardRes.json().catch(() => ({}))).error ?? "Could not load HRMS dashboards";
      setError(message);
      toast.error(message);
    }

    if (automationRes.ok) setAutomationRules(await readAutomation(automationRes));
    else setAutomationRules([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/reports/dashboards");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const tiles = useMemo(() => {
    const apiTiles = dashboard.cards ?? dashboard.metrics ?? [];
    if (apiTiles.length > 0) return apiTiles;
    return DEFAULT_TILES.map((tile) => ({ ...tile, value: dashboard[tile.key as keyof DashboardPayload] as number | string | null | undefined }));
  }, [dashboard]);

  const alerts = dashboard.alerts ?? [];
  const activeAutomation = automationRules.filter((rule) => rule.is_active !== false && rule.status !== "disabled");

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">HRMS Dashboards</h1>
          <p className="mt-1 text-sm text-gray-500">Dense operational tiles for headcount, attendance, leave, expenses, payroll readiness, performance, lifecycle, approvals and alerts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/reports" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Reports <ArrowRight size={14} />
          </Link>
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((tile, index) => (
          <div key={tile.key ?? tile.label ?? String(index)} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">{tile.label ?? tile.key ?? "Metric"}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{formatValue(tile.value)}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(tile.status)}`}>{tile.status ?? "ready"}</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">{tile.detail ?? "Dashboard metric"}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Operational alerts</h2>
            <p className="text-xs text-gray-500">{alerts.length} alerts loaded</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr><th className="px-4 py-3">Alert</th><th className="px-4 py-3">Domain</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : alerts.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No operational alerts found.</td></tr>
                ) : alerts.map((alert, index) => (
                  <tr key={alert.id ?? String(index)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{alert.title ?? "Operational alert"}</p>
                      <p className="text-xs text-gray-500">{alert.message ?? "Alert details pending"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{alert.domain ?? "-"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(alert.severity)}`}>{alert.severity ?? "info"}</span></td>
                    <td className="px-4 py-3 text-gray-600">{alert.status ?? "open"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Automation monitor</h2>
            <p className="text-xs text-gray-500">{activeAutomation.length} active automation rules</p>
          </div>
          <div className="divide-y divide-gray-100">
            {activeAutomation.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No automation rules visible.</div>
            ) : activeAutomation.slice(0, 8).map((rule, index) => (
              <div key={rule.id ?? String(index)} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-gray-900">{rule.name ?? rule.rule_name ?? "Automation rule"}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(rule.status)}`}>{rule.status ?? "active"}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Last run {rule.last_run_at ?? "-"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
