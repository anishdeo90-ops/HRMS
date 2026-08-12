"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BriefcaseBusiness,
  CakeSlice,
  CalendarDays,
  FileText,
  PartyPopper,
  Plus,
  TrendingDown,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, StatCard } from "@/components/hrms/ui";
import { useHrmsProfile } from "@/components/hrms/hrms-context";
import {
  DEMO_ANNOUNCEMENTS,
  DEMO_DASHBOARD,
  DEMO_EMPLOYEES,
  DEMO_HOLIDAYS,
  DEMO_ME,
  DEMO_ONBOARDING_CASES,
} from "@/lib/hrms/demo-data";
import { EMPTY, fmtAggregate, fmtDate, fmtLacs, fmtText } from "@/lib/hrms/format";
import { CHART, TINT } from "@/lib/hrms/theme";

const BRAND = CHART.primary;
const CONTRAST = CHART.secondary;
const ACCENT = CHART.tertiary;
const GRAY = CHART.muted;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HrmsDashboardPage() {
  const profile = useHrmsProfile();
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [department, setDepartment] = useState("");

  const d = DEMO_DASHBOARD;

  /**
   * Aggregates that have no denominator render `—`, never `0`. The reference
   * showed "Average Age: 0 Years" against a headcount of 6 — a wrong answer
   * dressed up as a real one (`01-dashboard.md §3`).
   */
  const aggregates = useMemo(() => {
    const withDob = DEMO_EMPLOYEES.filter((e) => e.date_of_birth);
    const withDoj = DEMO_EMPLOYEES.filter((e) => e.date_of_joining);
    const years = (iso: string) =>
      (Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 3600 * 1000);

    const avg = (xs: number[]) =>
      xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;

    return {
      averageAge: avg(withDob.map((e) => years(e.date_of_birth!))),
      averageTenure: avg(withDoj.map((e) => years(e.date_of_joining!))),
      // No prior-experience rows in the demo set — so this is genuinely unknown.
      averageExperience: null as number | null,
    };
  }, []);

  const genderRatio = useMemo(() => {
    const counts = { Female: 0, Male: 0, Unspecified: 0 };
    for (const e of DEMO_EMPLOYEES) {
      if (e.gender === "Female") counts.Female += 1;
      else if (e.gender === "Male") counts.Male += 1;
      // A row with no gender gets its own slice rather than being dropped.
      else counts.Unspecified += 1;
    }
    return [
      { name: "Female", value: counts.Female, fill: BRAND },
      { name: "Male", value: counts.Male, fill: CONTRAST },
      { name: "Unspecified", value: counts.Unspecified, fill: GRAY },
    ].filter((s) => s.value > 0);
  }, []);

  const hiringTrend = useMemo(
    () =>
      ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"].map(
        (month, i) => ({
          month,
          "New Hire": [1, 0, 2, 1, 3, 2, 1, 4, 2, 3, 5, 2][i],
          Exits: [0, 1, 0, 0, 1, 1, 2, 0, 1, 0, 1, 1][i],
        })
      ),
    []
  );

  const upcomingHolidays = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return DEMO_HOLIDAYS.filter((h) => h.is_active && h.holiday_date >= today)
      .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
      .slice(0, 4);
  }, []);

  const upcomingJoinees = useMemo(
    () =>
      DEMO_ONBOARDING_CASES.filter(
        (c) => c.proposed_doj && !c.actual_doj && c.status !== "offer_declined" && c.status !== "rejected"
      )
        .sort((a, b) => (a.proposed_doj ?? "").localeCompare(b.proposed_doj ?? ""))
        .slice(0, 4),
    []
  );

  const departments = useMemo(
    () => Array.from(new Set(DEMO_EMPLOYEES.map((e) => e.department).filter(Boolean))) as string[],
    []
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        {/* Greeting banner */}
        <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-ink via-[#2a1220] to-brand-600 px-6 py-5 text-white">
          <div className="relative z-10">
            <h2 className="text-lg font-bold">
              {greeting()}, {profile.name}
            </h2>
            <p className="mt-0.5 text-sm text-brand-100">{profile.email}</p>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness size={14} className="text-brand-300" />
                <span>{fmtText(DEMO_ME.designation)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-brand-300" />
                <span>{fmtText(DEMO_ME.employee_code)}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserPlus size={14} className="text-brand-300" />
                <span>{fmtText(DEMO_ME.reporting_manager)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-brand-300" />
                <span>{fmtDate(DEMO_ME.date_of_joining)}</span>
              </div>
            </dl>
          </div>
          <Users
            size={150}
            className="pointer-events-none absolute -right-6 -top-6 text-white/10"
            aria-hidden="true"
          />
        </section>

        {/* Action row */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/hrms/calendar">
            <Button icon={CalendarDays}>Team Calendar</Button>
          </Link>
          <Link href="/hrms/team/reports">
            <Button icon={FileText}>Reports</Button>
          </Link>
          <Link href="/hrms/team/directory">
            <Button icon={Plus} variant="primary">
              Add Employee
            </Button>
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total Employees"
            value={d.headcount}
            hint={`+${d.headcount_change} vs last quarter`}
            icon={Users}
            href="/hrms/team/directory"
          />
          <StatCard
            label="Average Experience"
            value={fmtAggregate(aggregates.averageExperience, " yrs")}
            hint="Prior plus current experience"
            icon={BriefcaseBusiness}
            tint={TINT.neutral}
          />
          <StatCard
            label="Average Age"
            value={fmtAggregate(aggregates.averageAge, " yrs")}
            hint="From date of birth"
            icon={CakeSlice}
            tint={TINT.neutral}
          />
          <StatCard
            label="Average Tenure"
            value={fmtAggregate(aggregates.averageTenure, " yrs")}
            hint="Years at company"
            icon={CalendarDays}
            tint={TINT.neutral}
          />
          <StatCard
            label="Attrition Rate"
            value={`${d.attrition_percent}%`}
            hint="Exits ÷ headcount, rolling 12 months"
            icon={TrendingDown}
            tint={TINT.bad}
          />
          <StatCard
            label="Pending Approvals"
            value={d.pending_approvals}
            hint="Across every request type"
            icon={FileText}
            tint={TINT.brand}
            href="/hrms/team/approvals"
          />
        </div>

        {/* Employee statistics */}
        <Card
          title="Employee Statistics"
          subtitle="New hires against exits, rolling 12 months"
          actions={
            <div className="flex items-center gap-2">
              <select
                aria-label="Department filter"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
              >
                <option value="">All Departments</option>
                {departments.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
              <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
                {(["bar", "line"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setChartType(t)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                      chartType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={hiringTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke={CHART.axis} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={CHART.axis} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="New Hire" fill={BRAND} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Exits" fill={CONTRAST} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={hiringTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke={CHART.axis} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={CHART.axis} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="New Hire" stroke={BRAND} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Exits" stroke={CONTRAST} strokeWidth={2} dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Widget grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Today's Team Insights" subtitle={fmtDate(new Date())}>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Available", value: d.present_today + d.on_leave_today },
                { label: "Present", value: d.present_today },
                { label: "Absent", value: d.absent_today },
                { label: "Leave", value: d.on_leave_today },
                { label: "WFH", value: 4 },
                { label: "On Duty", value: 2 },
              ].map((m) => (
                <div key={m.label} className="rounded-lg bg-gray-50 px-3 py-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {m.label}
                  </dt>
                  <dd className="mt-0.5 text-lg font-bold text-gray-900">{m.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Gender Ratio" subtitle="All branches">
            <div className="flex items-center gap-4">
              <div className="h-36 w-36 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderRatio}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={38}
                      outerRadius={62}
                      paddingAngle={2}
                    >
                      {genderRatio.map((s) => (
                        <Cell key={s.name} fill={s.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 text-sm">
                {genderRatio.map((s) => (
                  <li key={s.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.fill }} />
                    <span className="text-gray-600">{s.name}</span>
                    <span className="font-semibold text-gray-900">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card
            title="Upcoming Holidays"
            actions={
              <Link href="/hrms/settings/holidays" className="text-xs font-medium text-brand-600 hover:underline">
                View all
              </Link>
            }
            bodyClassName="p-0"
          >
            {upcomingHolidays.length === 0 ? (
              <EmptyState title="No upcoming holidays" icon={CalendarDays} />
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcomingHolidays.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{h.name}</p>
                      <p className="text-xs text-gray-500">{h.applies_to}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-semibold text-gray-600">
                      {fmtDate(h.holiday_date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming Birthdays" bodyClassName="p-0">
            {d.birthdays.length === 0 ? (
              <EmptyState title="No upcoming birthdays" icon={CakeSlice} />
            ) : (
              <ul className="divide-y divide-gray-100">
                {d.birthdays.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.department}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-semibold text-gray-600">
                      {fmtDate(b.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming Work Anniversaries" bodyClassName="p-0">
            {d.anniversaries.length === 0 ? (
              <EmptyState title="No upcoming work anniversaries" icon={PartyPopper} />
            ) : (
              <ul className="divide-y divide-gray-100">
                {d.anniversaries.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-500">
                        {a.years} {a.years === 1 ? "year" : "years"}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-semibold text-gray-600">
                      {fmtDate(a.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Upcoming New Joinees"
            subtitle="Accepted ATS offers with a future joining date"
            bodyClassName="p-0"
          >
            {upcomingJoinees.length === 0 ? (
              <EmptyState title="No new joinees scheduled" icon={UserPlus} />
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcomingJoinees.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{c.candidate_name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {fmtText(c.designation)} · {fmtText(c.branch)}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-semibold text-gray-600">
                      {fmtDate(c.proposed_doj)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Job Opening"
            subtitle="Read from the ATS requisitions"
            actions={
              <Link href="/hrms/more/job-openings" className="text-xs font-medium text-brand-600 hover:underline">
                View all
              </Link>
            }
          >
            <p className="text-3xl font-bold text-gray-900">{d.open_positions}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">New This Week</dt>
                <dd className="font-semibold text-gray-900">{d.new_this_week}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">On Hold</dt>
                <dd className="font-semibold text-gray-900">{d.on_hold}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Highest Budget</dt>
                <dd className="font-semibold text-gray-900">{fmtLacs(1800000000)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Current Strength</dt>
                <dd className="font-semibold text-gray-900">{d.headcount}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Headcount by Department">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.headcount_by_department} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke={CHART.axis} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11 }}
                    stroke={CHART.axis}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" fill={ACCENT} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Right rail — announcements */}
      <aside className="space-y-4">
        <Card
          title="Announcements"
          actions={
            <Link href="/hrms/more/announcements" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          }
          bodyClassName="p-0"
        >
          {DEMO_ANNOUNCEMENTS.length === 0 ? (
            <EmptyState title="No announcements" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {DEMO_ANNOUNCEMENTS.slice(0, 5).map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    {a.is_pinned && <Badge tone="bg-brand-50 text-brand-600">Pinned</Badge>}
                  </div>
                  {a.body && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{a.body}</p>}
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    {a.category} · {fmtDate(a.published_at)}
                    {a.expires_at ? ` · until ${fmtDate(a.expires_at)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Needs Attention">
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center justify-between">
              <Link href="/hrms/team/approvals" className="text-gray-600 hover:text-brand-600">
                Approvals pending
              </Link>
              <span className="font-semibold text-gray-900">{d.pending_approvals}</span>
            </li>
            <li className="flex items-center justify-between">
              <Link href="/hrms/onboarding/documents-approval" className="text-gray-600 hover:text-brand-600">
                Documents to verify
              </Link>
              <span className="font-semibold text-gray-900">{d.documents_pending}</span>
            </li>
            <li className="flex items-center justify-between">
              <Link href="/hrms/team/directory" className="text-gray-600 hover:text-brand-600">
                Probation ending soon
              </Link>
              <span className="font-semibold text-gray-900">{d.probation_ending}</span>
            </li>
            <li className="flex items-center justify-between">
              <Link href="/hrms/team/separation" className="text-gray-600 hover:text-brand-600">
                Exits in notice period
              </Link>
              <span className="font-semibold text-gray-900">2</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-gray-600">Mood analytics</span>
              <span className="text-xs text-gray-400">{EMPTY}</span>
            </li>
          </ul>
        </Card>
      </aside>
    </div>
  );
}
