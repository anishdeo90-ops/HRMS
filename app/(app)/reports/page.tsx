"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, Play, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type ReportRow = {
  id?: string;
  key?: string;
  report_key?: string;
  name?: string | null;
  title?: string | null;
  category?: string | null;
  domain?: string | null;
  description?: string | null;
  supports_export?: boolean | null;
  export_formats?: string[] | null;
  status?: string | null;
};

type ReportResult = {
  columns?: string[];
  rows?: Record<string, unknown>[];
  generated_at?: string | null;
  export_url?: string | null;
};

type AutomationRule = {
  id?: string;
  name?: string | null;
  rule_name?: string | null;
  trigger_key?: string | null;
  status?: string | null;
  is_active?: boolean | null;
};

const REPORT_GROUPS = ["People", "Time", "Leave", "Finance", "Payroll", "Performance", "Lifecycle", "Recruitment", "Events"];

function reportId(report: ReportRow) {
  return report.report_key ?? report.key ?? report.id ?? report.name ?? "report";
}

function reportTitle(report: ReportRow) {
  return report.title ?? report.name ?? report.report_key ?? report.key ?? "HRMS report";
}

function normalizeGroup(report: ReportRow) {
  const value = report.category ?? report.domain ?? "People";
  return REPORT_GROUPS.find((group) => group.toLowerCase() === value.toLowerCase()) ?? "People";
}

async function readReports(res: Response): Promise<ReportRow[]> {
  const json = await res.json().catch(() => ({}));
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.data?.reports)) return json.data.reports;
  if (Array.isArray(json.reports)) return json.reports;
  return [];
}

async function readAutomation(res: Response): Promise<AutomationRule[]> {
  const json = await res.json().catch(() => ({}));
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.data?.rules)) return json.data.rules;
  if (Array.isArray(json.rules)) return json.rules;
  return [];
}

async function readResult(res: Response): Promise<ReportResult> {
  const json = await res.json().catch(() => ({}));
  return (json.data?.result ?? json.data ?? json.result ?? {}) as ReportResult;
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [activeReport, setActiveReport] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [format, setFormat] = useState("csv");
  const [result, setResult] = useState<ReportResult>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const [reportRes, automationRes] = await Promise.all([
      fetch("/api/hrms/reports"),
      fetch("/api/hrms/automation"),
    ]);

    if (reportRes.ok) {
      const list = await readReports(reportRes);
      setReports(list);
      setActiveReport((current) => current || (list[0] ? reportId(list[0]) : ""));
    } else {
      const message = (await reportRes.json().catch(() => ({}))).error ?? "Could not load HRMS report catalog";
      setError(message);
      toast.error(message);
    }

    if (automationRes.ok) setAutomationRules(await readAutomation(automationRes));
    else setAutomationRules([]);
    setLoading(false);
  }

  async function runReport(exportRequested = false) {
    if (!activeReport) return;
    setRunning(true);
    setError("");
    const res = await fetch("/api/hrms/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_key: activeReport, filters: { date_from: dateFrom || null, date_to: dateTo || null }, export: exportRequested ? { format } : null }),
    });

    if (res.ok) {
      setResult(await readResult(res));
      toast.success(exportRequested ? "Export request submitted" : "Report generated");
    } else {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not run report";
      setError(message);
      toast.error(message);
    }
    setRunning(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/reports");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const groupedReports = useMemo(() => {
    const groups = new Map<string, ReportRow[]>();
    for (const group of REPORT_GROUPS) groups.set(group, []);
    for (const report of reports) groups.get(normalizeGroup(report))?.push(report);
    return Array.from(groups.entries());
  }, [reports]);

  const selectedReport = reports.find((report) => reportId(report) === activeReport);
  const resultColumns = result.columns ?? (result.rows?.[0] ? Object.keys(result.rows[0]) : []);
  const activeAutomation = automationRules.filter((rule) => rule.is_active !== false && rule.status !== "disabled");

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">HRMS Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Run operational reports across people, time, leave, finance, payroll, performance, lifecycle, recruitment and events.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/reports/dashboards" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Dashboards <ArrowRight size={14} />
          </Link>
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Report catalog</h2>
              <p className="text-xs text-gray-500">{reports.length} reports loaded</p>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
              ) : reports.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No HRMS reports found.</div>
              ) : groupedReports.map(([group, rows]) => rows.length > 0 && (
                <div key={group} className="px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase text-gray-500">{group}</h3>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {rows.map((report) => {
                      const id = reportId(report);
                      const selected = id === activeReport;
                      return (
                        <button
                          key={id}
                          onClick={() => setActiveReport(id)}
                          className={`rounded-lg border px-3 py-3 text-left text-sm ${selected ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                        >
                          <span className="block font-semibold text-gray-900">{reportTitle(report)}</span>
                          <span className="mt-1 block text-xs text-gray-500">{report.description ?? `${group} operational report`}</span>
                          {report.supports_export && <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Export enabled</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Report output</h2>
              <p className="text-xs text-gray-500">{selectedReport ? reportTitle(selectedReport) : "Select a report to run"}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>{resultColumns.length === 0 ? <th className="px-4 py-3">Output</th> : resultColumns.map((column) => <th key={column} className="px-4 py-3">{column.replace(/_/g, " ")}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {running ? (
                    <tr><td colSpan={Math.max(resultColumns.length, 1)} className="px-4 py-8 text-center text-gray-400">Running report...</td></tr>
                  ) : !result.rows || result.rows.length === 0 ? (
                    <tr><td colSpan={Math.max(resultColumns.length, 1)} className="px-4 py-8 text-center text-gray-400">No report rows to display.</td></tr>
                  ) : result.rows.slice(0, 20).map((row, index) => (
                    <tr key={String(row.id ?? index)}>
                      {resultColumns.map((column) => <td key={column} className="px-4 py-3 text-gray-700">{String(row[column] ?? "-")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Runner filters</h2>
              <p className="text-xs text-gray-500">Compact filters for the selected report</p>
            </div>
            <div className="space-y-3 p-4">
              <label className="block text-sm font-medium text-gray-700">
                Report
                <select value={activeReport} onChange={(event) => setActiveReport(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Select report</option>
                  {reports.map((report) => <option key={reportId(report)} value={reportId(report)}>{reportTitle(report)}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  From
                  <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  To
                  <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Export format
                <select value={format} onChange={(event) => setFormat(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="csv">CSV</option>
                  <option value="xlsx">XLSX</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button disabled={!activeReport || running} onClick={() => void runReport(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                  <Play size={14} /> Run report
                </button>
                <button disabled={!activeReport || running} onClick={() => void runReport(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400">
                  <Download size={14} /> Export
                </button>
              </div>
              {result.generated_at && <p className="text-xs text-gray-500">Generated at {result.generated_at}</p>}
              {result.export_url && <a href={result.export_url} className="text-sm font-medium text-blue-600 hover:text-blue-700">Open generated export</a>}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Automation rule visibility</h2>
              <p className="text-xs text-gray-500">{activeAutomation.length} active rules visible</p>
            </div>
            <div className="divide-y divide-gray-100">
              {activeAutomation.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No automation rules visible.</div>
              ) : activeAutomation.slice(0, 6).map((rule, index) => (
                <div key={rule.id ?? String(index)} className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{rule.name ?? rule.rule_name ?? "Automation rule"}</p>
                  <p className="text-xs text-gray-500">{rule.trigger_key ?? rule.status ?? "Trigger pending"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
