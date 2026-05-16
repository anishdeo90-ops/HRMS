"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type CriteriaRow = { id: string; name?: string | null; description?: string | null; max_rating?: number | null; is_active?: boolean | null };
type RatingRow = { id: string; employee_name?: string | null; reviewer_name?: string | null; criteria_name?: string | null; rating?: number | null; comments?: string | null; feedback_type?: string | null; status?: string | null };

function statusClass(status?: string | null) {
  if (status === "approved" || status === "completed") return "bg-green-100 text-green-700";
  if (status === "submitted" || status === "requested") return "bg-blue-100 text-blue-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "draft") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function PerformanceFeedbackPage() {
  const router = useRouter();
  const [criteria, setCriteria] = useState<CriteriaRow[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ employee_id: "", criteria_id: "", rating: "3", feedback_type: "self", comments: "" });

  async function load(currentRole = role) {
    setLoading(true);
    setError("");
    const scope = currentRole === "employee" ? "?scope=mine" : "";
    const [criteriaRes, ratingRes] = await Promise.all([
      fetch("/api/hrms/performance/feedback/criteria"),
      fetch(`/api/hrms/performance/feedback${scope}`),
    ]);
    if (criteriaRes.ok) setCriteria(await readList<CriteriaRow>(criteriaRes));
    else {
      const message = (await criteriaRes.json().catch(() => ({}))).error ?? "Could not load feedback criteria";
      setError(message);
      toast.error(message);
    }
    if (ratingRes.ok) setRatings(await readList<RatingRow>(ratingRes));
    else setRatings([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const currentRole = json?.data?.role;
        const allowed = getNavForRole(currentRole).some((item) => item.href === "/performance/feedback");
        if (!allowed) router.replace("/dashboard");
        else {
          setRole(currentRole);
          void load(currentRole);
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const feedbackGroups = useMemo(() => ({
    self: ratings.filter((row) => row.feedback_type === "self"),
    manager: ratings.filter((row) => row.feedback_type === "manager"),
    reviewable: ratings.filter((row) => row.status === "submitted" || row.status === "requested"),
  }), [ratings]);

  async function saveRating() {
    if (!form.criteria_id || !form.rating) {
      toast.error("Criteria and rating are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/performance/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: form.employee_id || null,
        ratings: [{ criteria_id: form.criteria_id, rating: Number(form.rating), comments: form.comments || null }],
        feedback_type: form.feedback_type,
        comments: form.comments || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not save feedback rating";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Feedback rating saved");
    setForm({ employee_id: "", criteria_id: "", rating: "3", feedback_type: "self", comments: "" });
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Feedback</h1>
          <p className="mt-1 text-sm text-gray-500">Collect self-feedback, manager feedback and review performance ratings.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {role === "employee" && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Employee feedback view is scoped to your self-feedback and received feedback.</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Criteria</p><p className="mt-1 text-2xl font-bold text-gray-900">{criteria.length}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Self-feedback</p><p className="mt-1 text-2xl font-bold text-gray-900">{feedbackGroups.self.length}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Manager feedback</p><p className="mt-1 text-2xl font-bold text-gray-900">{feedbackGroups.manager.length}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Review queue</p><p className="mt-1 text-2xl font-bold text-gray-900">{feedbackGroups.reviewable.length}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Self-feedback and manager-feedback</h2>
          <div className="mt-3 grid gap-3">
            <input value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} placeholder="Employee ID for manager feedback" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <select value={form.criteria_id} onChange={(event) => setForm({ ...form, criteria_id: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select criteria</option>
              {criteria.map((row) => <option key={row.id} value={row.id}>{row.name ?? "Criteria"}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={form.feedback_type} onChange={(event) => setForm({ ...form, feedback_type: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                <option value="self">Self-feedback</option>
                <option value="manager">Manager feedback</option>
                <option value="peer">Peer feedback</option>
              </select>
              <input type="number" min="1" max="5" value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <textarea value={form.comments} onChange={(event) => setForm({ ...form, comments: event.target.value })} placeholder="Comments" className="min-h-24 rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving} onClick={() => void saveRating()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Save size={14} /> Save rating
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Feedback criteria table</h2><p className="text-xs text-gray-500">{criteria.length} criteria loaded</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Criteria</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Max rating</th><th className="px-4 py-3">State</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {criteria.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No feedback criteria found.</td></tr> : criteria.map((row) => (
                    <tr key={row.id}><td className="px-4 py-3 font-medium text-gray-900">{row.name ?? "Criteria"}</td><td className="px-4 py-3 text-gray-600">{row.description ?? "-"}</td><td className="px-4 py-3 text-gray-900">{row.max_rating ?? 5}</td><td className="px-4 py-3 text-gray-600">{row.is_active === false ? "inactive" : "active"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Feedback rating table</h2><p className="text-xs text-gray-500">{ratings.length} ratings loaded</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Reviewer</th><th className="px-4 py-3">Criteria</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Comments</th><th className="px-4 py-3">Review controls</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : ratings.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No feedback ratings found.</td></tr> : ratings.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.employee_name ?? "Employee"}</td>
                      <td className="px-4 py-3 text-gray-600">{row.reviewer_name ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{row.criteria_name ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-900">{row.rating ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{row.comments ?? "-"}</td>
                      <td className="px-4 py-3"><button className="inline-flex items-center gap-1 rounded border border-green-300 px-2 py-1 text-xs text-green-700"><Check size={12} /> Review</button> <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
