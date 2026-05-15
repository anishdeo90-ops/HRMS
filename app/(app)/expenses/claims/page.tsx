"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Paperclip, Plus, RefreshCw, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { getVisibleFinanceRoutes } from "@/lib/hrms/route-access";

type ClaimRow = { id: string; title?: string | null; claim_number?: string | null; status?: string | null; total_amount?: number | null; expense_date?: string | null; description?: string | null; employee?: PersonRef | null };
type PersonRef = { name?: string | null; employee_code?: string | null };
type LineItem = { expense_type_key: string; description: string; spent_on: string; amount: string; merchant_name: string };

const emptyLine: LineItem = { expense_type_key: "general", description: "", spent_on: "", amount: "", merchant_name: "" };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function personLabel(person?: PersonRef | null) {
  if (!person) return "Current person";
  return person.employee_code ? `${person.employee_code} - ${person.name ?? "Person"}` : person.name ?? "Person";
}

function statusClass(status?: string | null) {
  if (status === "approved" || status === "paid") return "bg-green-100 text-green-700";
  if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "submitted") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

function money(value?: number | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function ExpenseClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [status, setStatus] = useState("submitted");
  const [form, setForm] = useState({ title: "", claim_type_key: "general", expense_date: today(), amount: "", currency: "INR", description: "" });
  const [lines, setLines] = useState<LineItem[]>([{ ...emptyLine, spent_on: today() }]);
  const [comment, setComment] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    const res = await fetch(`/api/hrms/expenses/claims?${params.toString()}`);
    if (res.ok) setClaims(await readList<ClaimRow>(res));
    else toast.error("Could not load expense claims");
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const allowed = getVisibleFinanceRoutes(json?.data).some((route) => route.href === "/expenses/claims");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const total = useMemo(() => lines.reduce((sum, row) => sum + Number(row.amount || 0), 0), [lines]);

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  async function submitClaim() {
    if (!form.title.trim() || !form.expense_date) {
      toast.error("Title and expense date are required");
      return;
    }
    setSaving("create");
    const res = await fetch("/api/hrms/expenses/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount || total || 0),
        status: "submitted",
        line_items: lines.map((row) => ({ ...row, amount: Number(row.amount || 0) })),
      }),
    });
    setSaving("");
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Claim submission failed");
      return;
    }
    toast.success("Expense claim submitted");
    setForm({ title: "", claim_type_key: "general", expense_date: today(), amount: "", currency: "INR", description: "" });
    setLines([{ ...emptyLine, spent_on: today() }]);
    setAttachment(null);
    await load();
  }

  async function uploadAttachment(claimId: string) {
    if (!attachment) return;
    setSaving(`attachment:${claimId}`);
    const body = new FormData();
    body.set("file", attachment);
    const res = await fetch(`/api/hrms/expenses/claims/${claimId}/attachments`, { method: "POST", body });
    setSaving("");
    if (!res.ok) toast.error("Attachment upload failed");
    else toast.success("Attachment uploaded");
  }

  async function decide(row: ClaimRow, action: "approve" | "reject" | "cancel" | "paid") {
    setSaving(`${row.id}:${action}`);
    const res = await fetch(`/api/hrms/expenses/claims/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, approver_comment: comment.trim() || null }),
    });
    setSaving("");
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Decision failed");
      return;
    }
    toast.success(action === "paid" ? "Marked paid" : `${action} saved`);
    setComment("");
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Expense Claims</h1>
          <p className="mt-1 text-sm text-gray-500">Submit reimbursements, attach receipts and review claim decisions.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">New claim</h2>
          <div className="mt-3 grid gap-3">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Claim title" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.claim_type_key} onChange={(event) => setForm({ ...form, claim_type_key: event.target.value })} placeholder="Claim type" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={form.expense_date} onChange={(event) => setForm({ ...form, expense_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <input type="number" min="0" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder={`Amount or ${money(total)}`} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" className="h-20 resize-none rounded border border-gray-300 px-3 py-2 text-sm" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-gray-500">Line items</p>
                <button onClick={() => setLines([...lines, { ...emptyLine, spent_on: today() }])} className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"><Plus size={12} /> Add</button>
              </div>
              {lines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded border border-gray-200 p-2">
                  <input value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} placeholder="Item description" className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="date" value={line.spent_on} onChange={(event) => updateLine(index, { spent_on: event.target.value })} className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                    <input value={line.merchant_name} onChange={(event) => updateLine(index, { merchant_name: event.target.value })} placeholder="Merchant" className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                    <input type="number" min="0" value={line.amount} onChange={(event) => updateLine(index, { amount: event.target.value })} placeholder="Amount" className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                  </div>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600">
              <Paperclip size={14} /> {attachment?.name ?? "Attach receipt"}
              <input type="file" className="hidden" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} />
            </label>
            <button disabled={saving === "create"} onClick={() => void submitClaim()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Send size={14} /> Submit claim
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Claims</h2>
              <p className="text-xs text-gray-500">{claims.length} claims loaded</p>
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-fit rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="all">All statuses</option>
            </select>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : claims.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No claims found.</div>
            ) : claims.map((row) => (
              <div key={row.id} className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_330px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-gray-900">{row.title ?? row.claim_number ?? "Expense claim"}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span>
                    <span className="text-xs text-gray-400">{row.expense_date ?? "-"}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{personLabel(row.employee)} - {money(row.total_amount)}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{row.description ?? "No description provided."}</p>
                </div>
                <div className="space-y-2">
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Decision comment" className="h-16 w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm" />
                  <div className="flex flex-wrap justify-end gap-2">
                    <button onClick={() => void decide(row, "approve")} className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-2 text-sm text-white"><Check size={14} /> Approve</button>
                    <button onClick={() => void decide(row, "reject")} className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-2 text-sm text-white"><X size={14} /> Reject</button>
                    <button onClick={() => void decide(row, "cancel")} className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700">Cancel</button>
                    <button onClick={() => void decide(row, "paid")} className="rounded border border-green-300 px-3 py-2 text-sm text-green-700">Mark paid</button>
                    <button disabled={!attachment || saving === `attachment:${row.id}`} onClick={() => void uploadAttachment(row.id)} className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-40">Upload</button>
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
