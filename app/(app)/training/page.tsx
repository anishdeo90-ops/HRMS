"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type ProgramRow = { id: string; name?: string | null; category?: string | null; is_active?: boolean | null; description?: string | null };
type EventRow = { id: string; program_name?: string | null; title?: string | null; starts_at?: string | null; ends_at?: string | null; trainer_name?: string | null; status?: string | null };
type FeedbackRow = { id: string; program_name?: string | null; event_title?: string | null; employee_name?: string | null; rating?: number | null; comments?: string | null; status?: string | null };

function statusClass(status?: string | null) {
  if (status === "completed" || status === "submitted") return "bg-green-100 text-green-700";
  if (status === "scheduled" || status === "registered" || status === "in_progress") return "bg-blue-100 text-blue-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "draft" || status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function TrainingPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ event_id: "", rating: "5", comments: "" });

  async function load(currentRole = role) {
    setLoading(true);
    setError("");
    const scope = currentRole === "employee" ? "?scope=mine" : "";
    const [programRes, eventRes, feedbackRes] = await Promise.all([
      fetch("/api/hrms/training/programs"),
      fetch(`/api/hrms/training/events${scope}`),
      fetch(`/api/hrms/training/feedback${scope}`),
    ]);
    if (programRes.ok) setPrograms(await readList<ProgramRow>(programRes));
    else {
      const message = (await programRes.json().catch(() => ({}))).error ?? "Could not load training programs";
      setError(message);
      toast.error(message);
    }
    if (eventRes.ok) setEvents(await readList<EventRow>(eventRes));
    else setEvents([]);
    if (feedbackRes.ok) setFeedback(await readList<FeedbackRow>(feedbackRes));
    else setFeedback([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const currentRole = json?.data?.role;
        const allowed = getNavForRole(currentRole).some((item) => item.href === "/training");
        if (!allowed) router.replace("/dashboard");
        else {
          setRole(currentRole);
          void load(currentRole);
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const summary = useMemo(() => ({
    activePrograms: programs.filter((row) => row.is_active !== false).length,
    scheduledEvents: events.filter((row) => row.status === "scheduled" || row.status === "registered").length,
    feedbackDue: events.filter((row) => row.status === "completed").length - feedback.length,
  }), [events, feedback.length, programs]);

  async function saveFeedback() {
    if (!form.event_id || !form.rating) {
      toast.error("Training event and rating are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/training/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: form.event_id, rating: Number(form.rating), comments: form.comments || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not save training feedback";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Training feedback saved");
    setForm({ event_id: "", rating: "5", comments: "" });
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Training</h1>
          <p className="mt-1 text-sm text-gray-500">Review training programs, scheduled events, participation and feedback ratings.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
      </div>

      {role === "employee" && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Employee training participation view: events and feedback are scoped to your enrollments.</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Training programs</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.activePrograms}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Training events</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.scheduledEvents}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Feedback due</p><p className="mt-1 text-2xl font-bold text-gray-900">{Math.max(summary.feedbackDue, 0)}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-900">Feedback/rating capture</h2>
            <div className="mt-3 grid gap-3">
              <select value={form.event_id} onChange={(event) => setForm({ ...form, event_id: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                <option value="">Select training event</option>
                {events.map((row) => <option key={row.id} value={row.id}>{row.title ?? row.program_name ?? "Training event"}</option>)}
              </select>
              <input type="number" min="1" max="5" value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <textarea value={form.comments} onChange={(event) => setForm({ ...form, comments: event.target.value })} placeholder="Feedback comments" className="min-h-24 rounded border border-gray-300 px-3 py-2 text-sm" />
              <button disabled={saving} onClick={() => void saveFeedback()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"><Save size={14} /> Save feedback</button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Training program list</h2></div>
            <div className="divide-y divide-gray-100">
              {programs.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No training programs found.</div> : programs.map((row) => (
                <div key={row.id} className="px-4 py-3"><p className="font-medium text-gray-900">{row.name ?? "Program"}</p><p className="text-xs text-gray-500">{row.category ?? "General"} - {row.description ?? "Program description"} - {row.is_active === false ? "inactive" : "active"}</p></div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Training event calendar/table</h2><p className="text-xs text-gray-500">{events.length} events loaded</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Program</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Trainer</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : events.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No training events found.</td></tr> : events.map((row) => (
                    <tr key={row.id}><td className="px-4 py-3 font-medium text-gray-900">{row.title ?? "Training event"}</td><td className="px-4 py-3 text-gray-600">{row.program_name ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.starts_at ?? "-"} to {row.ends_at ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.trainer_name ?? "-"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "scheduled"}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Employee training participation view</h2><p className="text-xs text-gray-500">{feedback.length} feedback records loaded</p></div>
            <div className="divide-y divide-gray-100">
              {feedback.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No training feedback found.</div> : feedback.map((row) => (
                <div key={row.id} className="px-4 py-3"><div className="flex items-center justify-between gap-3"><p className="font-medium text-gray-900">{row.employee_name ?? "Employee"} - {row.event_title ?? row.program_name ?? "Training"}</p><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "submitted"}</span></div><p className="mt-1 text-xs text-gray-500">Rating {row.rating ?? "-"} - {row.comments ?? "No comments"}</p></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
