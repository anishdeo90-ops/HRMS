"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type SlabRow = { id: string; name?: string | null; min_income?: number | null; max_income?: number | null; rate?: number | null; regime?: string | null };
type DeclarationRow = { id: string; employee_name?: string | null; fiscal_year?: string | null; declared_amount?: number | null; approved_amount?: number | null; benefit_name?: string | null; requested_amount?: number | null; claim_amount?: number | null; status?: string | null };
type BenefitRow = { id: string; employee_name?: string | null; fiscal_year?: string | null; declared_amount?: number | null; approved_amount?: number | null; benefit_name?: string | null; requested_amount?: number | null; claim_amount?: number | null; status?: string | null };

function money(value?: number | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function statusClass(status?: string | null) {
  if (status === "approved" || status === "paid") return "bg-green-100 text-green-700";
  if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "submitted") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function TaxBenefitsPage() {
  const router = useRouter();
  const [slabs, setSlabs] = useState<SlabRow[]>([]);
  const [declarations, setDeclarations] = useState<DeclarationRow[]>([]);
  const [benefits, setBenefits] = useState<BenefitRow[]>([]);
  const [claims, setClaims] = useState<BenefitRow[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fiscal_year: "", declaration_key: "", declared_amount: "", notes: "" });

  async function load() {
    setLoading(true);
    setError("");
    const [slabRes, declarationRes, benefitRes, claimRes] = await Promise.all([
      fetch("/api/hrms/payroll/tax-slabs"),
      fetch("/api/hrms/payroll/tax-declarations"),
      fetch("/api/hrms/payroll/benefit-applications"),
      fetch("/api/hrms/payroll/benefit-claims"),
    ]);
    if (slabRes.ok) setSlabs(await readList<SlabRow>(slabRes));
    else {
      const message = (await slabRes.json().catch(() => ({}))).error ?? "Could not load tax slabs";
      setError(message);
      toast.error(message);
    }
    if (declarationRes.ok) setDeclarations(await readList<DeclarationRow>(declarationRes));
    else setDeclarations([]);
    if (benefitRes.ok) setBenefits(await readList<BenefitRow>(benefitRes));
    else setBenefits([]);
    if (claimRes.ok) setClaims(await readList<BenefitRow>(claimRes));
    else setClaims([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setRole(json?.data?.role ?? "");
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/payroll/tax-benefits");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  async function submitDeclaration() {
    if (!form.fiscal_year || !form.declaration_key || !form.declared_amount) {
      toast.error("Fiscal year, declaration and amount are required");
      return;
    }
    setSaving("declaration");
    const res = await fetch("/api/hrms/payroll/tax-declarations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fiscal_year: form.fiscal_year,
        declaration_key: form.declaration_key,
        declared_amount: Number(form.declared_amount),
        notes: form.notes || null,
        status: "submitted",
      }),
    });
    setSaving("");
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not submit declaration";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Declaration submitted");
    setForm({ fiscal_year: "", declaration_key: "", declared_amount: "", notes: "" });
    await load();
  }

  async function review(kind: "tax-declarations" | "benefit-applications" | "benefit-claims", rowId: string, action: "approve" | "reject") {
    setSaving(`${kind}:${rowId}:${action}`);
    const res = await fetch(`/api/hrms/payroll/${kind}/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setSaving("");
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Review action failed";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Review saved");
    await load();
  }

  const canReview = role === "admin" || role === "hr_manager" || role === "payroll_manager";

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tax & Benefits</h1>
          <p className="mt-1 text-sm text-gray-500">Track tax slabs, employee declarations, benefit applications and benefit claims.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {role === "employee" && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Employee self-service mode shows your own tax declarations and benefit claims.</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Employee declaration</h2>
          <div className="mt-3 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={form.fiscal_year} onChange={(event) => setForm({ ...form, fiscal_year: event.target.value })} placeholder="Fiscal year" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="number" min="0" value={form.declared_amount} onChange={(event) => setForm({ ...form, declared_amount: event.target.value })} placeholder="Amount" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <input value={form.declaration_key} onChange={(event) => setForm({ ...form, declaration_key: event.target.value })} placeholder="Declaration key" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" className="h-20 resize-none rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving === "declaration"} onClick={() => void submitDeclaration()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Save size={14} /> Submit declaration
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Income tax slabs</h2><p className="text-xs text-gray-500">{slabs.length} slabs loaded</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Slab</th><th className="px-4 py-3">Income range</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Regime</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : slabs.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No tax slabs found.</td></tr> : slabs.map((row) => (
                    <tr key={row.id}><td className="px-4 py-3 font-medium text-gray-900">{row.name ?? "Tax slab"}</td><td className="px-4 py-3 text-gray-600">{money(row.min_income)} to {money(row.max_income)}</td><td className="px-4 py-3 text-gray-900">{row.rate ?? 0}%</td><td className="px-4 py-3 text-gray-600">{row.regime ?? "-"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {[
              { title: "Declarations", rows: declarations, kind: "tax-declarations" as const },
              { title: "Benefit applications", rows: benefits, kind: "benefit-applications" as const },
              { title: "Benefit claims", rows: claims, kind: "benefit-claims" as const },
            ].map((group) => (
              <div key={group.title} className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">{group.title}</h2><p className="text-xs text-gray-500">{group.rows.length} records</p></div>
                <div className="divide-y divide-gray-100">
                  {group.rows.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No records found.</div> : group.rows.map((row) => (
                    <div key={row.id} className="space-y-2 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-900">{row.employee_name ?? row.benefit_name ?? row.fiscal_year ?? "Employee record"}</p><p className="text-xs text-gray-500">{money(row.declared_amount ?? row.requested_amount ?? row.claim_amount)}{row.approved_amount ? ` approved ${money(row.approved_amount)}` : ""}</p></div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span>
                      </div>
                      {canReview && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => void review(group.kind, row.id, "approve")} className="inline-flex items-center gap-1 rounded border border-green-300 px-2 py-1 text-xs text-green-700"><Check size={12} /> Approve</button>
                          <button onClick={() => void review(group.kind, row.id, "reject")} className="inline-flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs text-red-700"><X size={12} /> Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
