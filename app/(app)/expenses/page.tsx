"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getVisibleFinanceRoutes } from "@/lib/hrms/route-access";

type ClaimRow = { id: string; title?: string | null; purpose?: string | null; claim_number?: string | null; status?: string | null; total_amount?: number | null; amount?: number | null; created_at?: string | null; employee?: PersonRef | null };
type AdvanceRow = { id: string; purpose?: string | null; status?: string | null; amount?: number | null; requested_amount?: number | null; required_by?: string | null; employee?: PersonRef | null };
type TravelRow = { id: string; destination?: string | null; purpose?: string | null; status?: string | null; estimated_amount?: number | null; start_date?: string | null; employee?: PersonRef | null };
type PersonRef = { name?: string | null; employee_code?: string | null };

function money(value?: number | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function personLabel(person?: PersonRef | null) {
  if (!person) return "Current person";
  return person.employee_code ? `${person.employee_code} - ${person.name ?? "Person"}` : person.name ?? "Person";
}

function statusClass(status?: string | null) {
  if (status === "approved" || status === "paid" || status === "settled" || status === "completed") return "bg-green-100 text-green-700";
  if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "submitted") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function ExpensesOverviewPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [advances, setAdvances] = useState<AdvanceRow[]>([]);
  const [travel, setTravel] = useState<TravelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("submitted");

  async function load() {
    setLoading(true);
    setError("");
    const [claimRes, advanceRes, travelRes] = await Promise.all([
      fetch("/api/hrms/expenses/claims"),
      fetch("/api/hrms/expenses/advances?status=submitted"),
      fetch("/api/hrms/travel/requests?status=submitted"),
    ]);

    if (claimRes.ok) setClaims(await readList<ClaimRow>(claimRes));
    else {
      const message = (await claimRes.json().catch(() => ({}))).error ?? "Could not load claims";
      setError(message);
      toast.error(message);
    }
    if (advanceRes.ok) setAdvances(await readList<AdvanceRow>(advanceRes));
    else setAdvances([]);
    if (travelRes.ok) setTravel(await readList<TravelRow>(travelRes));
    else setTravel([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const allowed = getVisibleFinanceRoutes(json?.data).some((route) => route.href === "/expenses");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const kpis = useMemo(() => {
    const submittedClaims = claims.filter((row) => row.status === "submitted").length;
    const approvedUnpaid = claims.filter((row) => row.status === "approved").length;
    return [
      { label: "Submitted claims", value: submittedClaims },
      { label: "Approved unpaid", value: approvedUnpaid },
      { label: "Open advances", value: advances.length },
      { label: "Pending travel", value: travel.length },
    ];
  }, [advances.length, claims, travel.length]);

  const filteredClaims = useMemo(() => (
    status === "all" ? claims : claims.filter((row) => row.status === status)
  ), [claims, status]);

  const pendingApprovals = useMemo(() => [
    ...claims.filter((row) => row.status === "submitted").map((row) => ({
      id: `claim:${row.id}`,
      kind: "Claim",
      title: row.title ?? row.purpose ?? row.claim_number ?? "Expense claim",
      person: personLabel(row.employee),
      amount: money(row.total_amount ?? row.amount),
      href: "/expenses/claims",
    })),
    ...advances.map((row) => ({
      id: `advance:${row.id}`,
      kind: "Advance",
      title: row.purpose ?? "Employee advance",
      person: personLabel(row.employee),
      amount: money(row.requested_amount ?? row.amount),
      href: "/expenses/advances",
    })),
    ...travel.map((row) => ({
      id: `travel:${row.id}`,
      kind: "Travel",
      title: row.destination ?? row.purpose ?? "Travel request",
      person: personLabel(row.employee),
      amount: money(row.estimated_amount),
      href: "/travel",
    })),
  ], [advances, claims, travel]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finance Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Review expense work queues, unpaid approvals, open advances and travel requests.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase text-gray-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Claim queue</h2>
              <p className="text-xs text-gray-500">{filteredClaims.length} records in the selected status</p>
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-fit rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="all">All statuses</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr><th className="px-4 py-3">Claim</th><th className="px-4 py-3">Person</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : filteredClaims.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No claims in this queue.</td></tr>
                ) : filteredClaims.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.title ?? row.purpose ?? row.claim_number ?? "Expense claim"}</td>
                    <td className="px-4 py-3 text-gray-600">{personLabel(row.employee)}</td>
                    <td className="px-4 py-3 text-gray-900">{money(row.total_amount ?? row.amount)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Pending approvals</h2>
              <p className="text-xs text-gray-500">{pendingApprovals.length} submitted finance items</p>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
              ) : pendingApprovals.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No pending approvals.</div>
              ) : pendingApprovals.slice(0, 5).map((item) => (
                <Link key={item.id} href={item.href} className="block px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.kind} - {item.person}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{item.amount}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {[
            { href: "/expenses/claims", label: "Expense claims", detail: "Create and review reimbursements" },
            { href: "/expenses/advances", label: "Employee advances", detail: "Track requests and settlements" },
            { href: "/travel", label: "Travel requests", detail: "Review itineraries and estimates" },
            { href: "/vehicles", label: "Vehicle expenses", detail: "Log trips and service costs" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50">
              <span>
                <span className="block text-sm font-semibold text-gray-900">{item.label}</span>
                <span className="text-xs text-gray-500">{item.detail}</span>
              </span>
              <ArrowRight size={16} className="text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
