"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type BoardingRow = { id: string; employee_name?: string | null; template_name?: string | null; status?: string | null; target_date?: string | null };
type ChangeRow = { id: string; employee_name?: string | null; status?: string | null; effective_date?: string | null; from_department_name?: string | null; to_department_name?: string | null; current_role?: string | null; new_role?: string | null };
type SummaryRow = { id: string; employee_name?: string | null; summary_date?: string | null; status?: string | null; work_summary?: string | null; blockers?: string | null };

function statusClass(status?: string | null) {
  if (status === "approved" || status === "completed" || status === "resolved") return "bg-green-100 text-green-700";
  if (status === "submitted" || status === "in_progress" || status === "open") return "bg-blue-100 text-blue-700";
  if (status === "rejected" || status === "cancelled" || status === "blocked") return "bg-red-100 text-red-700";
  if (status === "draft" || status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function LifecycleOverviewPage() {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState<BoardingRow[]>([]);
  const [separations, setSeparations] = useState<BoardingRow[]>([]);
  const [promotions, setPromotions] = useState<ChangeRow[]>([]);
  const [transfers, setTransfers] = useState<ChangeRow[]>([]);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");

  async function load(currentRole = role) {
    setLoading(true);
    setError("");
    const scope = currentRole === "employee" ? "?scope=mine" : "";
    const [onboardingRes, separationRes, promotionRes, transferRes, summaryRes] = await Promise.all([
      fetch(`/api/hrms/lifecycle/onboarding${scope}`),
      fetch(`/api/hrms/lifecycle/separation${scope}`),
      fetch("/api/hrms/lifecycle/promotions"),
      fetch("/api/hrms/lifecycle/transfers"),
      fetch(`/api/hrms/lifecycle/daily-summaries${scope}`),
    ]);

    if (onboardingRes.ok) setOnboarding(await readList<BoardingRow>(onboardingRes));
    else {
      const message = (await onboardingRes.json().catch(() => ({}))).error ?? "Could not load lifecycle overview";
      setError(message);
      toast.error(message);
    }
    if (separationRes.ok) setSeparations(await readList<BoardingRow>(separationRes));
    else setSeparations([]);
    if (promotionRes.ok) setPromotions(await readList<ChangeRow>(promotionRes));
    else setPromotions([]);
    if (transferRes.ok) setTransfers(await readList<ChangeRow>(transferRes));
    else setTransfers([]);
    if (summaryRes.ok) setSummaries(await readList<SummaryRow>(summaryRes));
    else setSummaries([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const currentRole = json?.data?.role;
        const allowed = getNavForRole(currentRole).some((item) => item.href === "/lifecycle");
        if (!allowed) router.replace("/dashboard");
        else {
          setRole(currentRole);
          void load(currentRole);
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const kpis = useMemo(() => [
    { label: "Onboarding queue", value: onboarding.filter((row) => row.status !== "completed" && row.status !== "cancelled").length },
    { label: "Separation queue", value: separations.filter((row) => row.status !== "completed" && row.status !== "cancelled").length },
    { label: "Promotion activity", value: promotions.filter((row) => row.status === "draft" || row.status === "submitted" || row.status === "approved").length },
    { label: "Transfer activity", value: transfers.filter((row) => row.status === "draft" || row.status === "submitted" || row.status === "approved").length },
  ], [onboarding, promotions, separations, transfers]);

  const allowedLinks = getNavForRole(role as never).filter((item) => ["/lifecycle/onboarding", "/lifecycle/separation", "/lifecycle/promotions", "/lifecycle/transfers", "/grievances", "/training"].includes(item.href));

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lifecycle Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Track onboarding, separation, employee changes and daily work summaries.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {role === "employee" && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Employee lifecycle view is scoped to your onboarding, separation, grievances, training and daily summaries.</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase text-gray-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Onboarding/separation queue</h2>
              <p className="text-xs text-gray-500">{onboarding.length + separations.length} records loaded</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Workflow</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : onboarding.length + separations.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No lifecycle queue records found.</td></tr> : [...onboarding.map((row) => ({ ...row, workflow: "Onboarding" })), ...separations.map((row) => ({ ...row, workflow: "Separation" }))].slice(0, 8).map((row) => (
                    <tr key={`${row.workflow}:${row.id}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.employee_name ?? "Employee"}</td>
                      <td className="px-4 py-3 text-gray-600">{row.workflow} - {row.template_name ?? "Template"}</td>
                      <td className="px-4 py-3 text-gray-600">{row.target_date ?? "-"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Promotion and transfer activity</h2>
              <p className="text-xs text-gray-500">{promotions.length + transfers.length} employee change records loaded</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Change</th><th className="px-4 py-3">Effective</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {promotions.length + transfers.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No promotion or transfer activity found.</td></tr> : [...promotions.map((row) => ({ ...row, change: "Promotion", detail: `${row.current_role ?? "-"} to ${row.new_role ?? "-"}` })), ...transfers.map((row) => ({ ...row, change: "Transfer", detail: `${row.from_department_name ?? "-"} to ${row.to_department_name ?? "-"}` }))].slice(0, 8).map((row) => (
                    <tr key={`${row.change}:${row.id}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.employee_name ?? "Employee"}</td>
                      <td className="px-4 py-3 text-gray-600">{row.change} - {row.detail}</td>
                      <td className="px-4 py-3 text-gray-600">{row.effective_date ?? "-"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Daily work summary snapshot</h2>
              <p className="text-xs text-gray-500">{summaries.length} summaries loaded</p>
            </div>
            <div className="divide-y divide-gray-100">
              {summaries.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No daily summaries found.</div> : summaries.slice(0, 5).map((row) => (
                <div key={row.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-gray-900">{row.employee_name ?? "Employee"}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "submitted"}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{row.summary_date ?? "-"} - {row.work_summary ?? row.blockers ?? "Summary pending"}</p>
                </div>
              ))}
            </div>
          </div>

          {allowedLinks.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50">
              <span>
                <span className="block text-sm font-semibold text-gray-900">{item.label}</span>
                <span className="text-xs text-gray-500">Open {item.label.toLowerCase()} workspace</span>
              </span>
              <ArrowRight size={16} className="text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
