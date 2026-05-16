"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, CalendarDays, FileText, ReceiptText, UserRound, WalletCards } from "lucide-react";

type SummaryCard = {
  key: string;
  label: string;
  value: string | number;
  href: string;
  tone: string;
};

type SummaryData = {
  employee?: {
    name?: string;
    employee_code?: string;
    work_email?: string;
    mobile?: string;
    employment_status?: string;
    joining_date?: string;
    department?: { name?: string };
    branch?: { name?: string };
    grade?: { name?: string };
    reporting_manager?: { name?: string };
  };
  cards: SummaryCard[];
  links: { label: string; href: string }[];
};

const ICONS = {
  profile: UserRound,
  attendance: CalendarDays,
  leave: FileText,
  expenses: WalletCards,
  salary_slips: ReceiptText,
  notifications: Bell,
};

const TONES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  rose: "bg-rose-100 text-rose-700",
};

export default function SelfServicePage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/hrms/self-service/summary")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        setData(json.data ?? null);
      })
      .catch(() => setError("Unable to load self-service summary"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Self Service</h1>
          <p className="text-sm text-gray-500 mt-1">Your HR profile, requests, payroll, and alerts.</p>
        </div>
        <Link href="/self-service/notifications" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          <Bell size={16} />
          Notifications
        </Link>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-900 text-white">
              <UserRound size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-gray-900">{loading ? "Loading..." : data?.employee?.name ?? "Profile"}</h2>
              <p className="text-xs text-gray-500">{data?.employee?.employee_code ?? "Self-service profile"}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-400">Department</dt>
              <dd className="font-medium text-gray-800">{data?.employee?.department?.name ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Branch</dt>
              <dd className="font-medium text-gray-800">{data?.employee?.branch?.name ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Manager</dt>
              <dd className="font-medium text-gray-800">{data?.employee?.reporting_manager?.name ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Status</dt>
              <dd className="font-medium capitalize text-gray-800">{data?.employee?.employment_status ?? "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.cards ?? []).map((card) => {
            const Icon = ICONS[card.key as keyof typeof ICONS] ?? FileText;
            return (
              <Link key={card.key} href={card.href} className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${TONES[card.tone] ?? TONES.slate}`}>
                  <Icon size={18} />
                </div>
                <p className="mt-4 text-2xl font-bold text-gray-900">{loading ? "..." : card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800">Quick Links</h2>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-5">
          {(data?.links ?? []).map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
