"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type RecruitmentMetric = {
  key?: string;
  label?: string;
  value?: number | string | null;
  detail?: string | null;
  status?: string | null;
};

type RecruitmentActivity = {
  id?: string;
  title?: string | null;
  name?: string | null;
  type?: string | null;
  status?: string | null;
  owner_name?: string | null;
  due_date?: string | null;
  updated_at?: string | null;
};

type HandoffRow = {
  id?: string;
  candidate_name?: string | null;
  applicant_name?: string | null;
  job_title?: string | null;
  opening_title?: string | null;
  status?: string | null;
  onboarding_status?: string | null;
  target_joining_date?: string | null;
  created_at?: string | null;
};

type RecruitmentPayload = {
  metrics?: RecruitmentMetric[];
  summary?: Record<string, number | string | null>;
  activities?: RecruitmentActivity[];
  openings?: RecruitmentActivity[];
  applicants?: RecruitmentActivity[];
  interviews?: RecruitmentActivity[];
  offers?: RecruitmentActivity[];
};

const DEFAULT_METRICS: RecruitmentMetric[] = [
  { key: "openings", label: "Openings / Jobs", detail: "Active job openings and requisitions" },
  { key: "applicants", label: "Applicants / Candidates", detail: "Applicants currently in pipeline" },
  { key: "interviews", label: "Interviews / Feedback", detail: "Scheduled and pending interview work" },
  { key: "offers", label: "Offers / Appointment Letters", detail: "Offers and appointment letters in progress" },
  { key: "handoffs", label: "Onboarding Handoffs", detail: "Candidate-to-employee handoff records" },
];

const ATS_LINKS = [
  { href: "/jobs", label: "Openings / Jobs", detail: "Open existing ATS job openings" },
  { href: "/candidates", label: "Applicants / Candidates", detail: "Open existing ATS candidate board" },
  { href: "/hod-portal", label: "Requisitions / HOD Portal", detail: "Open staffing request workspace" },
  { href: "/jds", label: "JDs & Forms", detail: "Open job descriptions and forms" },
];

function statusClass(status?: string | null) {
  if (status === "approved" || status === "active" || status === "completed" || status === "joined") return "bg-green-100 text-green-700";
  if (status === "pending" || status === "draft" || status === "scheduled" || status === "in_progress") return "bg-amber-100 text-amber-700";
  if (status === "rejected" || status === "blocked" || status === "withdrawn") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function formatValue(value?: number | string | null) {
  if (typeof value === "number") return new Intl.NumberFormat().format(value);
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
}

async function readOverview(res: Response): Promise<RecruitmentPayload> {
  const json = await res.json().catch(() => ({}));
  return (json.data ?? json.recruitment ?? json.overview ?? {}) as RecruitmentPayload;
}

async function readHandoffs(res: Response): Promise<HandoffRow[]> {
  const json = await res.json().catch(() => ({}));
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.data?.handoffs)) return json.data.handoffs;
  if (Array.isArray(json.handoffs)) return json.handoffs;
  return [];
}

export default function RecruitmentPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<RecruitmentPayload>({});
  const [handoffs, setHandoffs] = useState<HandoffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const [overviewRes, handoffsRes] = await Promise.all([
      fetch("/api/hrms/recruitment"),
      fetch("/api/hrms/recruitment/handoffs"),
    ]);

    if (overviewRes.ok) setOverview(await readOverview(overviewRes));
    else {
      const message = (await overviewRes.json().catch(() => ({}))).error ?? "Could not load recruitment overview";
      setError(message);
      toast.error(message);
    }

    if (handoffsRes.ok) setHandoffs(await readHandoffs(handoffsRes));
    else setHandoffs([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/recruitment");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const metrics = useMemo(() => {
    if (overview.metrics && overview.metrics.length > 0) return overview.metrics;
    return DEFAULT_METRICS.map((metric) => ({ ...metric, value: overview.summary?.[metric.key ?? ""] }));
  }, [overview]);

  const activity = [
    ...(overview.openings ?? []).map((row) => ({ ...row, type: row.type ?? "Opening / Job" })),
    ...(overview.applicants ?? []).map((row) => ({ ...row, type: row.type ?? "Applicant / Candidate" })),
    ...(overview.interviews ?? []).map((row) => ({ ...row, type: row.type ?? "Interview / Feedback" })),
    ...(overview.offers ?? []).map((row) => ({ ...row, type: row.type ?? "Offer / Appointment" })),
    ...(overview.activities ?? []),
  ];

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recruitment</h1>
          <p className="mt-1 text-sm text-gray-500">HRMS view of openings, applicants, interviews, offers, appointment letters and onboarding handoffs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/recruitment/appointments" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Appointments <ArrowRight size={14} />
          </Link>
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric, index) => (
          <div key={metric.key ?? metric.label ?? String(index)} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">{metric.label ?? metric.key ?? "Metric"}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{formatValue(metric.value)}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(metric.status)}`}>{metric.status ?? "ready"}</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">{metric.detail ?? "Recruitment metric"}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Recruitment activity</h2>
              <p className="text-xs text-gray-500">{activity.length} records loaded</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr><th className="px-4 py-3">Record</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                  ) : activity.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No recruitment activity found.</td></tr>
                  ) : activity.slice(0, 12).map((row, index) => (
                    <tr key={row.id ?? String(index)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{row.title ?? row.name ?? "Recruitment record"}</p>
                        <p className="text-xs text-gray-500">{row.due_date ?? row.updated_at ?? "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.type ?? "Recruitment"}</td>
                      <td className="px-4 py-3 text-gray-600">{row.owner_name ?? "-"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "open"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Candidate-to-employee handoffs</h2>
              <p className="text-xs text-gray-500">{handoffs.length} handoffs loaded</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Opening</th><th className="px-4 py-3">Joining target</th><th className="px-4 py-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {handoffs.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No onboarding handoffs found.</td></tr>
                  ) : handoffs.slice(0, 10).map((row, index) => (
                    <tr key={row.id ?? String(index)}>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.applicant_name ?? row.candidate_name ?? "Applicant"}</td>
                      <td className="px-4 py-3 text-gray-600">{row.opening_title ?? row.job_title ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{row.target_joining_date ?? row.created_at ?? "-"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.onboarding_status ?? row.status)}`}>{row.onboarding_status ?? row.status ?? "pending"}</span></td>
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
              <h2 className="text-sm font-bold text-gray-900">Existing ATS workspaces</h2>
              <p className="text-xs text-gray-500">Detailed recruiting work stays in the current ATS screens.</p>
            </div>
            <div className="divide-y divide-gray-100">
              {ATS_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">{link.label}</span>
                    <span className="text-xs text-gray-500">{link.detail}</span>
                  </span>
                  <ArrowRight size={16} className="text-gray-400" />
                </Link>
              ))}
            </div>
          </div>

          <Link href="/recruitment/appointments" className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50">
            <span>
              <span className="block text-sm font-semibold text-gray-900">Offers / Appointment Letters</span>
              <span className="text-xs text-gray-500">Open appointment templates and issued letters</span>
            </span>
            <ArrowRight size={16} className="text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
