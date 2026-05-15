"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { getVisibleFinanceRoutes } from "@/lib/hrms/route-access";

type AdvanceRow = { id: string; amount?: number | null; purpose?: string | null; status?: string | null; required_by?: string | null; settlement_note?: string | null; employee?: PersonRef | null };
type PersonRef = { name?: string | null; employee_code?: string | null };
type Action = "approve" | "reject" | "cancel" | "settled";

function money(value?: number | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function personLabel(person?: PersonRef | null) {
  if (!person) return "Current person";
  return person.employee_code ? `${person.employee_code} - ${person.name ?? "Person"}` : person.name ?? "Person";
}

function statusClass(status?: string | null) {
  if (status === "approved" || status === "settled") return "bg-green-100 text-green-700";
  if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "submitted") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function EmployeeAdvancesPage() {
  const router = useRouter();
  const [advances, setAdvances] = useState<AdvanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [status, setStatus] = useState("submitted");
  const [comment, setComment] = useState("");
  const [form, setForm] = useState({ amount: "", required_by: "", purpose: "", settlement_note: "", attachment_path: "" });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    const res = await fetch(`/api/hrms/expenses/advances?${params.toString()}`);
    if (res.ok) setAdvances(await readList<AdvanceRow>(res));
    else toast.error("Could not load advances");
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const allowed = getVisibleFinanceRoutes(json?.data).some((route) => route.href === "/expenses/advances");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  async function submitAdvance() {
    if (!form.amount || !form.required_by || !form.purpose.trim()) {
      toast.error("Amount, required date and purpose are required");
      return;
    }
    setSaving("create");
    const res = await fetch("/api/hrms/expenses/advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount), status: "submitted" }),
    });
    setSaving("");
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Advance request failed");
      return;
    }
    toast.success("Advance requested");
    setForm({ amount: "", required_by: "", purpose: "", settlement_note: "", attachment_path: "" });
    await load();
  }

  async function decide(row: AdvanceRow, action: Action) {
    setSaving(`${row.id}:${action}`);
    const res = await fetch(`/api/hrms/expenses/advances/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, approver_comment: comment.trim() || null }),
    });
    setSaving("");
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Decision failed");
      return;
    }
    toast.success(action === "settled" ? "Marked settled" : `${action} saved`);
    setComment("");
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Employee Advances</h1>
          <p className="mt-1 text-sm text-gray-500">Request advances, review approvals and track settlement notes.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Request advance</h2>
          <div className="mt-3 grid gap-3">
            <input type="number" min="0" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Amount" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="date" value={form.required_by} onChange={(event) => setForm({ ...form, required_by: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <textarea value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} placeholder="Purpose" className="h-20 resize-none rounded border border-gray-300 px-3 py-2 text-sm" />
            <textarea value={form.settlement_note} onChange={(event) => setForm({ ...form, settlement_note: event.target.value })} placeholder="Repayment or settlement note" className="h-20 resize-none rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={form.attachment_path} onChange={(event) => setForm({ ...form, attachment_path: event.target.value })} placeholder="Attachment reference" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving === "create"} onClick={() => void submitAdvance()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Send size={14} /> Submit request
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Advance status</h2>
              <p className="text-xs text-gray-500">{advances.length} requests loaded</p>
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-fit rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="settled">Settled</option>
              <option value="all">All statuses</option>
            </select>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : advances.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No advance requests found.</div>
            ) : advances.map((row) => (
              <div key={row.id} className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_330px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-gray-900">{money(row.amount)}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span>
                    <span className="text-xs text-gray-400">Required {row.required_by ?? "-"}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{personLabel(row.employee)}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{row.purpose ?? "No purpose provided."}</p>
                </div>
                <div className="space-y-2">
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Decision comment" className="h-16 w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm" />
                  <div className="flex flex-wrap justify-end gap-2">
                    <button onClick={() => void decide(row, "approve")} className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-2 text-sm text-white"><Check size={14} /> Approve</button>
                    <button onClick={() => void decide(row, "reject")} className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-2 text-sm text-white"><X size={14} /> Reject</button>
                    <button onClick={() => void decide(row, "cancel")} className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700">Cancel</button>
                    <button onClick={() => void decide(row, "settled")} className="rounded border border-green-300 px-3 py-2 text-sm text-green-700">Mark settled</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
