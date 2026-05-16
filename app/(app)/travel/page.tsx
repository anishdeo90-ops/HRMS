"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, RefreshCw, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { getVisibleFinanceRoutes } from "@/lib/hrms/route-access";

type TravelRow = { id: string; destination?: string | null; purpose?: string | null; status?: string | null; start_date?: string | null; end_date?: string | null; estimated_amount?: number | null; employee?: PersonRef | null };
type PersonRef = { name?: string | null; employee_code?: string | null };
type ItineraryRow = { travel_date: string; from_location: string; to_location: string; mode: string; estimated_amount: string; notes: string };
type Action = "approve" | "reject" | "cancel" | "completed";

const emptyItinerary: ItineraryRow = { travel_date: "", from_location: "", to_location: "", mode: "flight", estimated_amount: "", notes: "" };

function money(value?: number | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function personLabel(person?: PersonRef | null) {
  if (!person) return "Current person";
  return person.employee_code ? `${person.employee_code} - ${person.name ?? "Person"}` : person.name ?? "Person";
}

function statusClass(status?: string | null) {
  if (status === "approved" || status === "completed") return "bg-green-100 text-green-700";
  if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "submitted") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function TravelRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<TravelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("submitted");
  const [comment, setComment] = useState("");
  const [form, setForm] = useState({ destination: "", purpose: "", start_date: "", end_date: "", estimated_amount: "", notes: "" });
  const [itinerary, setItinerary] = useState<ItineraryRow[]>([{ ...emptyItinerary }]);

  async function load(nextStatus = status) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (nextStatus !== "all") params.set("status", nextStatus);
    const res = await fetch(`/api/hrms/travel/requests?${params.toString()}`);
    if (res.ok) setRequests(await readList<TravelRow>(res));
    else {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not load travel requests";
      setError(message);
      toast.error(message);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const allowed = getVisibleFinanceRoutes(json?.data).some((route) => route.href === "/travel");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const itineraryTotal = useMemo(() => itinerary.reduce((sum, row) => sum + Number(row.estimated_amount || 0), 0), [itinerary]);

  function updateItinerary(index: number, patch: Partial<ItineraryRow>) {
    setItinerary((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  async function submitTravel() {
    if (!form.destination.trim() || !form.purpose.trim() || !form.start_date || !form.end_date) {
      toast.error("Destination, purpose and dates are required");
      return;
    }
    setSaving("create");
    const res = await fetch("/api/hrms/travel/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        estimated_amount: Number(form.estimated_amount || itineraryTotal || 0),
        status: "submitted",
        itinerary: itinerary.map((row) => ({ ...row, estimated_amount: Number(row.estimated_amount || 0) })),
      }),
    });
    setSaving("");
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Travel request failed";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Travel request submitted");
    setForm({ destination: "", purpose: "", start_date: "", end_date: "", estimated_amount: "", notes: "" });
    setItinerary([{ ...emptyItinerary }]);
    await load();
  }

  async function decide(row: TravelRow, action: Action) {
    setSaving(`${row.id}:${action}`);
    const res = await fetch(`/api/hrms/travel/requests/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, decision_notes: comment.trim() || null }),
    });
    setSaving("");
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Decision failed";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success(action === "completed" ? "Marked completed" : `${action} saved`);
    setComment("");
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Travel Requests</h1>
          <p className="mt-1 text-sm text-gray-500">Plan trips, estimate itinerary costs and manage approval status.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">New travel request</h2>
          <div className="mt-3 grid gap-3">
            <input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} placeholder="Destination" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} placeholder="Purpose" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <input type="number" min="0" value={form.estimated_amount} onChange={(event) => setForm({ ...form, estimated_amount: event.target.value })} placeholder={`Estimated amount or ${money(itineraryTotal)}`} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" className="h-20 resize-none rounded border border-gray-300 px-3 py-2 text-sm" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-gray-500">Itinerary</p>
                <button onClick={() => setItinerary([...itinerary, { ...emptyItinerary }])} className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"><Plus size={12} /> Add</button>
              </div>
              {itinerary.map((row, index) => (
                <div key={index} className="grid gap-2 rounded border border-gray-200 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={row.travel_date} onChange={(event) => updateItinerary(index, { travel_date: event.target.value })} className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                    <select value={row.mode} onChange={(event) => updateItinerary(index, { mode: event.target.value })} className="rounded border border-gray-300 px-2 py-1.5 text-sm">
                      <option value="flight">Flight</option>
                      <option value="train">Train</option>
                      <option value="car">Car</option>
                      <option value="hotel">Hotel</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input value={row.from_location} onChange={(event) => updateItinerary(index, { from_location: event.target.value })} placeholder="From" className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                    <input value={row.to_location} onChange={(event) => updateItinerary(index, { to_location: event.target.value })} placeholder="To" className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                    <input type="number" min="0" value={row.estimated_amount} onChange={(event) => updateItinerary(index, { estimated_amount: event.target.value })} placeholder="Cost" className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                  </div>
                </div>
              ))}
            </div>
            <button disabled={saving === "create"} onClick={() => void submitTravel()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Send size={14} /> Submit travel
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Approval status</h2>
              <p className="text-xs text-gray-500">{requests.length} travel requests loaded</p>
            </div>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                void load(event.target.value);
              }}
              className="w-fit rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="all">All statuses</option>
            </select>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No travel requests found.</div>
            ) : requests.map((row) => (
              <div key={row.id} className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_330px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-gray-900">{row.destination ?? "Travel request"}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span>
                    <span className="text-xs text-gray-400">{row.start_date ?? "-"} to {row.end_date ?? "-"}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{personLabel(row.employee)} - {money(row.estimated_amount)}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{row.purpose ?? "No purpose provided."}</p>
                </div>
                <div className="space-y-2">
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Decision comment" className="h-16 w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm" />
                  <div className="flex flex-wrap justify-end gap-2">
                    <button onClick={() => void decide(row, "approve")} className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-2 text-sm text-white"><Check size={14} /> Approve</button>
                    <button onClick={() => void decide(row, "reject")} className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-2 text-sm text-white"><X size={14} /> Reject</button>
                    <button onClick={() => void decide(row, "cancel")} className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700">Cancel</button>
                    <button onClick={() => void decide(row, "completed")} className="rounded border border-green-300 px-3 py-2 text-sm text-green-700">Complete</button>
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
