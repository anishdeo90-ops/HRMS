"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, BriefcaseBusiness, CalendarCheck, Coins, FileText, RefreshCw, Send, Settings2 } from "lucide-react";
import toast from "react-hot-toast";
import { getVisibleTimeRoutes } from "@/lib/hrms/route-access";

type TabKey = "overview" | "apply" | "setup" | "ledger" | "compensatory" | "encashments";
type Status = "draft" | "submitted" | "approved" | "rejected" | "cancelled";
type LeaveType = { key: string; label?: string; is_active?: boolean };
type Balance = { leave_type_key: string; leave_period_id?: string | null; allocated: number; ledger_delta: number; balance: number };
type LeaveApplication = {
  id: string;
  leave_type_key: string;
  from_date: string;
  to_date: string;
  total_days: number;
  status: Status;
  reason?: string | null;
  created_at?: string | null;
};
type LedgerEntry = {
  id: string;
  leave_type_key: string;
  entry_type: string;
  days_delta: number;
  balance_after?: number | null;
  posting_date: string;
};
type RequestRow = {
  id: string;
  leave_type_key: string;
  requested_days: number;
  work_date?: string | null;
  status: Status;
  reason?: string | null;
};

const tabs: { key: TabKey; label: string; icon: typeof CalendarCheck }[] = [
  { key: "overview", label: "Balances", icon: CalendarCheck },
  { key: "apply", label: "Applications", icon: FileText },
  { key: "setup", label: "Setup", icon: Settings2 },
  { key: "ledger", label: "Ledger", icon: BookOpen },
  { key: "compensatory", label: "Comp Off", icon: BriefcaseBusiness },
  { key: "encashments", label: "Encashments", icon: Coins },
];

const setupResources = [
  "types",
  "periods",
  "policies",
  "policy_details",
  "policy_assignments",
  "allocations",
  "holidays",
  "holiday_dates",
  "block_lists",
  "block_dates",
] as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function statusClass(status?: string) {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "cancelled") return "bg-gray-100 text-gray-500";
  if (status === "submitted") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function clean(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

export default function LeavePage() {
  const router = useRouter();
  const [active, setActive] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [compensatory, setCompensatory] = useState<RequestRow[]>([]);
  const [encashments, setEncashments] = useState<RequestRow[]>([]);
  const [setupResource, setSetupResource] = useState<(typeof setupResources)[number]>("types");
  const [setupRows, setSetupRows] = useState<Record<string, unknown>[]>([]);
  const [setupForm, setSetupForm] = useState<Record<string, unknown>>({ resource: "types", key: "", label: "", is_active: true });
  const [applicationForm, setApplicationForm] = useState({
    leave_type_key: "",
    from_date: today(),
    to_date: today(),
    half_day: false,
    reason: "",
    status: "submitted" as Status,
  });
  const [compForm, setCompForm] = useState({ leave_type_key: "", work_date: today(), requested_days: 1, reason: "", status: "submitted" as Status });
  const [encashForm, setEncashForm] = useState({ leave_type_key: "", requested_days: 1, reason: "", status: "submitted" as Status });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (employeeId.trim()) params.set("employee_id", employeeId.trim());
    return params.toString();
  }, [employeeId]);

  async function read<T>(res: Response, fallback: T): Promise<T> {
    if (!res.ok) return fallback;
    const json = await res.json().catch(() => ({}));
    return json.data ?? fallback;
  }

  async function loadSetup(resource = setupResource) {
    const res = await fetch(`/api/hrms/leave/setup?resource=${resource}`);
    setSetupRows(await read<Record<string, unknown>[]>(res, []));
  }

  async function load() {
    setLoading(true);
    const suffix = query ? `?${query}` : "";
    const [typeRes, balanceRes, appRes, ledgerRes, compRes, encashRes] = await Promise.all([
      fetch("/api/hrms/leave/setup?resource=types"),
      fetch(`/api/hrms/leave/balances${suffix}`),
      fetch(`/api/hrms/leave/applications${suffix}`),
      fetch(`/api/hrms/leave/ledger${suffix}`),
      fetch(`/api/hrms/leave/compensatory${suffix}`),
      fetch(`/api/hrms/leave/encashments${suffix}`),
    ]);
    setLeaveTypes(await read<LeaveType[]>(typeRes, []));
    setBalances(await read<Balance[]>(balanceRes, []));
    setApplications(await read<LeaveApplication[]>(appRes, []));
    setLedger(await read<LedgerEntry[]>(ledgerRes, []));
    setCompensatory(await read<RequestRow[]>(compRes, []));
    setEncashments(await read<RequestRow[]>(encashRes, []));
    await loadSetup();
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const allowed = getVisibleTimeRoutes(json?.data).some((route) => route.href === "/time/leave");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  async function submitApplication() {
    setSaving(true);
    const body = clean({ ...applicationForm, employee_id: employeeId.trim() || undefined });
    const res = await fetch("/api/hrms/leave/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Leave application failed");
      return;
    }
    toast.success("Leave application submitted");
    setApplicationForm({ ...applicationForm, reason: "" });
    await load();
  }

  async function saveSetup() {
    setSaving(true);
    const res = await fetch("/api/hrms/leave/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clean({ ...setupForm, resource: setupResource })),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Setup save failed");
      return;
    }
    toast.success("Leave setup saved");
    await loadSetup();
  }

  async function submitRequest(kind: "compensatory" | "encashments") {
    setSaving(true);
    const form = kind === "compensatory" ? compForm : encashForm;
    const res = await fetch(`/api/hrms/leave/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clean({ ...form, employee_id: employeeId.trim() || undefined })),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Request failed");
      return;
    }
    toast.success("Request submitted");
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leave</h1>
          <p className="mt-1 text-sm text-gray-500">Manage leave balances, requests, setup records, ledger entries, comp off, and encashments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} placeholder="Employee ID" className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActive(tab.key)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${active === tab.key ? "bg-brand-600 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {active === "overview" && (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {loading ? <Empty text="Loading balances..." /> : balances.length === 0 ? <Empty text="No leave balances found." /> : balances.map((balance) => (
            <div key={`${balance.leave_type_key}:${balance.leave_period_id ?? ""}`} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">{label(balance.leave_type_key)}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{Number(balance.balance).toFixed(1)}</p>
              <p className="mt-1 text-xs text-gray-500">{Number(balance.allocated).toFixed(1)} allocated, {Number(balance.ledger_delta).toFixed(1)} ledger delta</p>
            </div>
          ))}
        </div>
      )}

      {active === "apply" && (
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Panel title="Application">
            <LeaveTypeSelect value={applicationForm.leave_type_key} leaveTypes={leaveTypes} onChange={(value) => setApplicationForm({ ...applicationForm, leave_type_key: value })} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={applicationForm.from_date} onChange={(event) => setApplicationForm({ ...applicationForm, from_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={applicationForm.to_date} onChange={(event) => setApplicationForm({ ...applicationForm, to_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={applicationForm.half_day} onChange={(event) => setApplicationForm({ ...applicationForm, half_day: event.target.checked })} /> Half day</label>
            <textarea value={applicationForm.reason} onChange={(event) => setApplicationForm({ ...applicationForm, reason: event.target.value })} placeholder="Reason" rows={3} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving} onClick={() => void submitApplication()} className="inline-flex items-center justify-center gap-1.5 rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"><Send size={14} /> Submit</button>
          </Panel>
          <Rows title="Application history" rows={applications} loading={loading} />
        </div>
      )}

      {active === "setup" && (
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Panel title="HR setup">
            <select value={setupResource} onChange={(event) => { const value = event.target.value as typeof setupResource; setSetupResource(value); setSetupForm({ resource: value }); void loadSetup(value); }} className="rounded border border-gray-300 px-3 py-2 text-sm">
              {setupResources.map((resource) => <option key={resource} value={resource}>{label(resource)}</option>)}
            </select>
            <input value={String(setupForm.key ?? "")} onChange={(event) => setSetupForm({ ...setupForm, key: event.target.value })} placeholder="Key or code" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={String(setupForm.label ?? setupForm.name ?? "")} onChange={(event) => setSetupForm({ ...setupForm, label: event.target.value, name: event.target.value })} placeholder="Label or name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={String(setupForm.company_id ?? "")} onChange={(event) => setSetupForm({ ...setupForm, company_id: event.target.value })} placeholder="Company ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving} onClick={() => void saveSetup()} className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50">Save setup record</button>
          </Panel>
          <GenericRows title={label(setupResource)} rows={setupRows} loading={loading} />
        </div>
      )}

      {active === "ledger" && <LedgerRows rows={ledger} loading={loading} />}

      {active === "compensatory" && (
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Panel title="Compensatory leave">
            <LeaveTypeSelect value={compForm.leave_type_key} leaveTypes={leaveTypes} onChange={(value) => setCompForm({ ...compForm, leave_type_key: value })} />
            <input type="date" value={compForm.work_date} onChange={(event) => setCompForm({ ...compForm, work_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="number" min={0.5} step={0.5} value={compForm.requested_days} onChange={(event) => setCompForm({ ...compForm, requested_days: Number(event.target.value) })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={compForm.reason} onChange={(event) => setCompForm({ ...compForm, reason: event.target.value })} placeholder="Reason" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving} onClick={() => void submitRequest("compensatory")} className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50">Submit comp off</button>
          </Panel>
          <Rows title="Compensatory history" rows={compensatory} loading={loading} />
        </div>
      )}

      {active === "encashments" && (
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Panel title="Leave encashment">
            <LeaveTypeSelect value={encashForm.leave_type_key} leaveTypes={leaveTypes} onChange={(value) => setEncashForm({ ...encashForm, leave_type_key: value })} />
            <input type="number" min={0.5} step={0.5} value={encashForm.requested_days} onChange={(event) => setEncashForm({ ...encashForm, requested_days: Number(event.target.value) })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={encashForm.reason} onChange={(event) => setEncashForm({ ...encashForm, reason: event.target.value })} placeholder="Reason" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving} onClick={() => void submitRequest("encashments")} className="rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50">Submit encashment</button>
          </Panel>
          <Rows title="Encashment history" rows={encashments} loading={loading} />
        </div>
      )}
    </div>
  );
}

function LeaveTypeSelect({ value, leaveTypes, onChange }: { value: string; leaveTypes: LeaveType[]; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
      <option value="">Leave type</option>
      {leaveTypes.map((type) => <option key={type.key} value={type.key}>{type.label ?? label(type.key)}</option>)}
    </select>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 md:col-span-3 xl:col-span-5">{text}</div>;
}

function Rows({ title, rows, loading }: { title: string; rows: RequestRow[] | LeaveApplication[]; loading: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">{title}</h2></div>
      <div className="divide-y divide-gray-100">
        {loading ? <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div> : rows.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No records yet.</div> : rows.map((row) => (
          <div key={row.id} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px]">
            <div>
              <p className="text-sm font-medium text-gray-900">{label(row.leave_type_key)}</p>
              <p className="text-xs text-gray-500">{"from_date" in row ? `${row.from_date} to ${row.to_date} - ${row.total_days} days` : `${row.requested_days} days${row.work_date ? ` on ${row.work_date}` : ""}`}</p>
              <p className="mt-1 line-clamp-1 text-xs text-gray-400">{row.reason || "No reason provided."}</p>
            </div>
            <span className={`h-fit rounded-full px-2 py-0.5 text-center text-xs font-semibold ${statusClass(row.status)}`}>{label(row.status)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GenericRows({ title, rows, loading }: { title: string; rows: Record<string, unknown>[]; loading: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">{title}</h2></div>
      <div className="divide-y divide-gray-100">
        {loading ? <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div> : rows.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No setup records.</div> : rows.slice(0, 40).map((row, index) => (
          <div key={String(row.id ?? row.key ?? index)} className="px-4 py-3">
            <p className="text-sm font-medium text-gray-900">{String(row.label ?? row.name ?? row.key ?? row.code ?? "Record")}</p>
            <p className="mt-1 line-clamp-1 text-xs text-gray-500">{String(row.id ?? row.key ?? row.code ?? "")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LedgerRows({ rows, loading }: { rows: LedgerEntry[]; loading: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Leave ledger</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Entry</th><th className="px-4 py-3 text-right">Delta</th><th className="px-4 py-3 text-right">Balance</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No ledger entries.</td></tr> : rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3 text-gray-500">{row.posting_date}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{label(row.leave_type_key)}</td>
                <td className="px-4 py-3 text-gray-500">{label(row.entry_type)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{Number(row.days_delta).toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{row.balance_after == null ? "-" : Number(row.balance_after).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
