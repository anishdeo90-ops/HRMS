"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type AppointmentTemplate = {
  id?: string;
  name?: string | null;
  template_name?: string | null;
  status?: string | null;
  language?: string | null;
  updated_at?: string | null;
};

type AppointmentLetter = {
  id?: string;
  candidate_id?: string | null;
  candidate_name?: string | null;
  applicant_name?: string | null;
  job_title?: string | null;
  offer_id?: string | null;
  candidate_offer_id?: string | null;
  status?: string | null;
  issued_at?: string | null;
  sent_at?: string | null;
  accepted_at?: string | null;
};

type AppointmentsPayload = {
  templates?: AppointmentTemplate[];
  issued_letters?: AppointmentLetter[];
  letters?: AppointmentLetter[];
};

function statusClass(status?: string | null) {
  if (status === "accepted" || status === "active" || status === "confirmed") return "bg-green-100 text-green-700";
  if (status === "draft" || status === "pending" || status === "sent") return "bg-amber-100 text-amber-700";
  if (status === "withdrawn" || status === "expired" || status === "rejected") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

async function readAppointments(res: Response): Promise<AppointmentsPayload> {
  const json = await res.json().catch(() => ({}));
  if (Array.isArray(json.data)) return { issued_letters: json.data };
  return (json.data ?? json.appointments ?? {}) as AppointmentsPayload;
}

function candidateOfferHref(letter: AppointmentLetter) {
  const candidateId = letter.candidate_id;
  const offerId = letter.candidate_offer_id ?? letter.offer_id;
  if (candidateId && offerId) return `/candidates/${candidateId}/offers/${offerId}`;
  if (candidateId) return `/candidates?candidate_id=${candidateId}`;
  return "/candidates";
}

export default function RecruitmentAppointmentsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AppointmentTemplate[]>([]);
  const [letters, setLetters] = useState<AppointmentLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/hrms/recruitment/appointments");

    if (res.ok) {
      const payload = await readAppointments(res);
      setTemplates(payload.templates ?? []);
      setLetters(payload.issued_letters ?? payload.letters ?? []);
    } else {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not load appointment letters";
      setError(message);
      toast.error(message);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/recruitment/appointments");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Appointment Letters</h1>
          <p className="mt-1 text-sm text-gray-500">Track appointment letter templates, issued letters and links back to existing candidate offer records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/recruitment" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Recruitment <ArrowRight size={14} />
          </Link>
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Appointment letter templates</h2>
            <p className="text-xs text-gray-500">{templates.length} templates loaded</p>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No appointment letter templates found.</div>
            ) : templates.map((template, index) => (
              <div key={template.id ?? String(index)} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-gray-900">{template.template_name ?? template.name ?? "Appointment template"}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(template.status)}`}>{template.status ?? "active"}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{template.language ?? "Default"} - Updated {template.updated_at ?? "-"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Issued appointment-letter status</h2>
            <p className="text-xs text-gray-500">{letters.length} issued letters loaded</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Opening</th><th className="px-4 py-3">Issued</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">ATS offer</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : letters.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No issued appointment letters found.</td></tr>
                ) : letters.slice(0, 20).map((letter, index) => (
                  <tr key={letter.id ?? String(index)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{letter.applicant_name ?? letter.candidate_name ?? "Applicant"}</td>
                    <td className="px-4 py-3 text-gray-600">{letter.job_title ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{letter.issued_at ?? letter.sent_at ?? "-"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(letter.status)}`}>{letter.status ?? "draft"}</span></td>
                    <td className="px-4 py-3">
                      <Link href={candidateOfferHref(letter)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                        Candidate offer <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
