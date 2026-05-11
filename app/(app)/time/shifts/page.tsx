"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, RefreshCw, X } from "lucide-react";
import toast from "react-hot-toast";
import { canManageShifts } from "@/lib/hrms/attendance-authorization";
import { getVisibleTimeRoutes } from "@/lib/hrms/route-access";

type ResourceKey = "shift_types" | "locations" | "assignments" | "roster";
type TabKey = ResourceKey | "requests" | "overtime";
type NamedRef = { name?: string; code?: string; employee_code?: string };
type ShiftType = { id: string; code?: string; name?: string; start_time?: string; end_time?: string; grace_minutes?: number; break_minutes?: number; is_night_shift?: boolean; is_active?: boolean };
type Location = { id: string; code?: string; name?: string; company_id?: string; branch_id?: string; is_active?: boolean; company?: NamedRef; branch?: NamedRef };
type Assignment = { id: string; employee_id?: string; shift_type_id?: string; location_id?: string; effective_from?: string; effective_to?: string; is_active?: boolean; employee?: NamedRef; shift_type?: NamedRef; location?: NamedRef };
type RosterEntry = { id: string; employee_id?: string; shift_type_id?: string; location_id?: string; roster_date?: string; status?: string; employee?: NamedRef; shift_type?: NamedRef; location?: NamedRef };
type ShiftRequest = { id: string; employee_id?: string; requested_date?: string; reason?: string; status?: string; approver_comment?: string; employee?: NamedRef; current_shift_type?: NamedRef; requested_shift_type?: NamedRef; approver?: NamedRef };
type OvertimeRecord = { id: string; employee_id?: string; attendance_day_id?: string; overtime_date?: string; start_time?: string; end_time?: string; overtime_minutes?: number; reason?: string; status?: string; approver_comment?: string; employee?: NamedRef; attendance_day?: { attendance_date?: string; status?: string }; approver?: NamedRef };

const tabs: { key: TabKey; label: string }[] = [
  { key: "shift_types", label: "Types" },
  { key: "locations", label: "Locations" },
  { key: "assignments", label: "Assignments" },
  { key: "roster", label: "Roster" },
  { key: "requests", label: "Requests" },
  { key: "overtime", label: "Overtime" },
];

const resourceLabels: Record<ResourceKey, string> = {
  shift_types: "Shift Types",
  locations: "Locations",
  assignments: "Assignments",
  roster: "Roster Entries",
};

const initialForms = {
  shift_types: { code: "", name: "", start_time: "09:00", end_time: "18:00", grace_minutes: 0, break_minutes: 0, is_night_shift: false, is_active: true },
  locations: { code: "", name: "", company_id: "", branch_id: "", is_active: true },
  assignments: { employee_id: "", shift_type_id: "", location_id: "", effective_from: "", effective_to: "", is_active: true },
  roster: { employee_id: "", shift_type_id: "", location_id: "", roster_date: "", status: "scheduled" },
  requests: { employee_id: "", current_shift_type_id: "", requested_shift_type_id: "", requested_date: "", reason: "" },
  overtime: { employee_id: "", attendance_day_id: "", overtime_date: "", start_time: "", end_time: "", overtime_minutes: 0, reason: "" },
};

function nameOf(ref?: NamedRef | null) {
  if (!ref) return "-";
  if (ref.employee_code && ref.name) return `${ref.employee_code} - ${ref.name}`;
  return ref.name ?? ref.code ?? "-";
}

function statusClass(status?: string) {
  if (status === "approved" || status === "scheduled") return "bg-green-100 text-green-700";
  if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "submitted") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

function dateTimeLocal(value: string) {
  if (!value) return "";
  return value.length === 16 ? value : value.slice(0, 16);
}

function cleanPayload(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === "" ? null : value]));
}

export default function TimeShiftsPage() {
  const router = useRouter();
  const [active, setActive] = useState<TabKey>("shift_types");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [canManageShiftSetup, setCanManageShiftSetup] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState("");
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [overtime, setOvertime] = useState<OvertimeRecord[]>([]);
  const [forms, setForms] = useState<Record<TabKey, Record<string, unknown>>>(initialForms);

  async function load() {
    setLoading(true);
    const [typeRes, locationRes, assignmentRes, rosterRes, requestRes, overtimeRes] = await Promise.all([
      fetch("/api/hrms/shifts?resource=shift_types"),
      fetch("/api/hrms/shifts?resource=locations"),
      fetch("/api/hrms/shifts?resource=assignments"),
      fetch("/api/hrms/shifts?resource=roster"),
      fetch("/api/hrms/shifts/requests"),
      fetch("/api/hrms/overtime"),
    ]);
    if (typeRes.ok) setShiftTypes((await typeRes.json()).data ?? []);
    if (locationRes.ok) setLocations((await locationRes.json()).data ?? []);
    if (assignmentRes.ok) setAssignments((await assignmentRes.json()).data ?? []);
    if (rosterRes.ok) setRoster((await rosterRes.json()).data ?? []);
    if (requestRes.ok) setRequests((await requestRes.json()).data ?? []);
    if (overtimeRes.ok) setOvertime((await overtimeRes.json()).data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const allowed = getVisibleTimeRoutes(json?.data).some((route) => route.href === "/time/shifts");
        if (!allowed) {
          router.replace("/dashboard");
          return;
        }
        const canManage = canManageShifts({
          role: json?.data?.role,
          is_active: json?.data?.is_active,
          permissions: json?.data?.permissions ?? [],
        });
        setCanManageShiftSetup(canManage);
        if (!canManage) setActive("requests");
        void load();
      })
      .catch(() => {
        setCanManageShiftSetup(false);
        router.replace("/dashboard");
      });
  }, [router]);

  useEffect(() => {
    setAdding(false);
    setEditing(null);
  }, [active]);

  function patchForm(tab: TabKey, patch: Record<string, unknown>) {
    if (editing) setEditing({ ...editing, ...patch });
    else setForms((current) => ({ ...current, [tab]: { ...current[tab], ...patch } }));
  }

  function resetForm(tab: TabKey) {
    setForms((current) => ({ ...current, [tab]: { ...initialForms[tab] } }));
    setAdding(false);
    setEditing(null);
  }

  async function saveResource(resource: ResourceKey) {
    const current = cleanPayload(editing ?? forms[resource]);
    setSaving(true);
    const res = await fetch("/api/hrms/shifts", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...current, resource }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Save failed");
      return;
    }
    toast.success(editing ? "Updated" : "Added");
    resetForm(resource);
    await load();
  }

  async function submitRequest() {
    const current = forms.requests;
    if (!current.employee_id || !current.requested_shift_type_id || !current.requested_date) {
      toast.error("Person, requested shift and date are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/shifts/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleanPayload(current)),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Request failed");
      return;
    }
    toast.success("Shift request submitted");
    resetForm("requests");
    await load();
  }

  async function submitOvertime() {
    const current = forms.overtime;
    if (!current.employee_id || !current.overtime_date || (!current.overtime_minutes && (!current.start_time || !current.end_time))) {
      toast.error("Person, date and either minutes or start/end time are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/overtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleanPayload(current)),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Overtime failed");
      return;
    }
    toast.success("Overtime submitted");
    resetForm("overtime");
    await load();
  }

  async function decide(kind: "requests" | "overtime", id: string, action: "approve" | "reject") {
    const res = await fetch(kind === "requests" ? `/api/hrms/shifts/requests/${id}` : `/api/hrms/overtime/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Review failed");
      return;
    }
    toast.success(action === "approve" ? "Approved" : "Rejected");
    await load();
  }

  const filteredAssignments = useMemo(() => filterRows(assignments, query), [assignments, query]);
  const filteredRoster = useMemo(() => filterRows(roster, query), [roster, query]);
  const filteredRequests = useMemo(() => filterRows(requests, query), [requests, query]);
  const filteredOvertime = useMemo(() => filterRows(overtime, query), [overtime, query]);

  const current = editing ?? forms[active];
  const isResource = active === "shift_types" || active === "locations" || active === "assignments" || active === "roster";
  const visibleTabs = canManageShiftSetup ? tabs : tabs.filter((tab) => tab.key === "requests" || tab.key === "overtime");

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Time Shifts</h1>
          <p className="mt-1 text-sm text-gray-500">Manage shifts, rosters, requests and attendance-only overtime.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lists" className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((tab) => (
          <button key={tab.key} onClick={() => setActive(tab.key)} className={`rounded-lg px-3 py-2 text-sm font-medium ${active === tab.key ? "bg-brand-600 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{isResource ? resourceLabels[active] : active === "requests" ? "Shift Requests" : "Overtime"}</h2>
            <p className="text-xs text-gray-500">{active === "overtime" ? "Attendance records only; payroll calculations are handled elsewhere." : "Governed attendance scheduling records."}</p>
          </div>
          {isResource && canManageShiftSetup && (
            <button onClick={() => { setAdding(true); setEditing(null); }} className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white"><Plus size={14} /> Add</button>
          )}
        </div>

        {isResource && canManageShiftSetup && (adding || editing) && (
          <ResourceForm
            resource={active}
            current={current}
            shiftTypes={shiftTypes}
            locations={locations}
            patch={(patch) => patchForm(active, patch)}
            saving={saving}
            onSave={() => void saveResource(active)}
            onCancel={() => resetForm(active)}
          />
        )}

        {active === "requests" && (
          <RequestPanel current={forms.requests} shiftTypes={shiftTypes} patch={(patch) => patchForm("requests", patch)} saving={saving} onSubmit={() => void submitRequest()} rows={filteredRequests} loading={loading} onDecide={decide} />
        )}
        {active === "overtime" && (
          <OvertimePanel current={forms.overtime} patch={(patch) => patchForm("overtime", patch)} saving={saving} onSubmit={() => void submitOvertime()} rows={filteredOvertime} loading={loading} onDecide={decide} />
        )}
        {active === "shift_types" && canManageShiftSetup && <ShiftTypesTable rows={shiftTypes} loading={loading} onEdit={(row) => setEditing(row)} />}
        {active === "locations" && canManageShiftSetup && <LocationsTable rows={locations} loading={loading} onEdit={(row) => setEditing(row)} />}
        {active === "assignments" && canManageShiftSetup && <AssignmentsTable rows={filteredAssignments} loading={loading} onEdit={(row) => setEditing(row)} />}
        {active === "roster" && canManageShiftSetup && <RosterTable rows={filteredRoster} loading={loading} onEdit={(row) => setEditing(row)} />}
      </div>
    </div>
  );
}

function filterRows<T>(rows: T[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
}

function ResourceForm({ resource, current, shiftTypes, locations, patch, saving, onSave, onCancel }: {
  resource: ResourceKey;
  current: Record<string, unknown>;
  shiftTypes: ShiftType[];
  locations: Location[];
  patch: (patch: Record<string, unknown>) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="border-b border-gray-100 bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {resource === "shift_types" && (
          <>
            <input value={String(current.code ?? "")} onChange={(event) => patch({ code: event.target.value })} placeholder="Code" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={String(current.name ?? "")} onChange={(event) => patch({ name: event.target.value })} placeholder="Name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="time" value={String(current.start_time ?? "")} onChange={(event) => patch({ start_time: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="time" value={String(current.end_time ?? "")} onChange={(event) => patch({ end_time: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="number" value={Number(current.grace_minutes ?? 0)} onChange={(event) => patch({ grace_minutes: Number(event.target.value) })} placeholder="Grace minutes" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="number" value={Number(current.break_minutes ?? 0)} onChange={(event) => patch({ break_minutes: Number(event.target.value) })} placeholder="Break minutes" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(current.is_night_shift)} onChange={(event) => patch({ is_night_shift: event.target.checked })} /> Night shift</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={current.is_active !== false} onChange={(event) => patch({ is_active: event.target.checked })} /> Active</label>
          </>
        )}
        {resource === "locations" && (
          <>
            <input value={String(current.code ?? "")} onChange={(event) => patch({ code: event.target.value })} placeholder="Code" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={String(current.name ?? "")} onChange={(event) => patch({ name: event.target.value })} placeholder="Name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={String(current.company_id ?? "")} onChange={(event) => patch({ company_id: event.target.value })} placeholder="Company ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={String(current.branch_id ?? "")} onChange={(event) => patch({ branch_id: event.target.value })} placeholder="Branch ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={current.is_active !== false} onChange={(event) => patch({ is_active: event.target.checked })} /> Active</label>
          </>
        )}
        {(resource === "assignments" || resource === "roster") && (
          <>
            <input value={String(current.employee_id ?? "")} onChange={(event) => patch({ employee_id: event.target.value })} placeholder="Person ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <ShiftSelect value={String(current.shift_type_id ?? "")} shifts={shiftTypes} onChange={(value) => patch({ shift_type_id: value })} />
            <LocationSelect value={String(current.location_id ?? "")} locations={locations} onChange={(value) => patch({ location_id: value })} />
            {resource === "assignments" ? (
              <>
                <input type="date" value={String(current.effective_from ?? "")} onChange={(event) => patch({ effective_from: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
                <input type="date" value={String(current.effective_to ?? "")} onChange={(event) => patch({ effective_to: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={current.is_active !== false} onChange={(event) => patch({ is_active: event.target.checked })} /> Active</label>
              </>
            ) : (
              <>
                <input type="date" value={String(current.roster_date ?? "")} onChange={(event) => patch({ roster_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
                <select value={String(current.status ?? "scheduled")} onChange={(event) => patch({ status: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                  <option value="scheduled">scheduled</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </>
            )}
          </>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button disabled={saving} onClick={onSave} className="inline-flex items-center gap-1.5 rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"><Check size={14} /> Save</button>
        <button onClick={onCancel} className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"><X size={14} /> Cancel</button>
      </div>
    </div>
  );
}

function ShiftSelect({ value, shifts, onChange }: { value: string; shifts: ShiftType[]; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
      <option value="">Shift type</option>
      {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.code ? `${shift.code} - ${shift.name}` : shift.name}</option>)}
    </select>
  );
}

function LocationSelect({ value, locations, onChange }: { value: string; locations: Location[]; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
      <option value="">Location</option>
      {locations.map((location) => <option key={location.id} value={location.id}>{location.code ? `${location.code} - ${location.name}` : location.name}</option>)}
    </select>
  );
}

function ShiftTypesTable({ rows, loading, onEdit }: { rows: ShiftType[]; loading: boolean; onEdit: (row: ShiftType) => void }) {
  return <Table headers={["Code", "Name", "Hours", "Rules", "Status", "Actions"]} loading={loading} empty={rows.length === 0} colSpan={6}>{rows.map((row) => (
    <tr key={row.id} className="border-t">
      <td className="px-4 py-3 font-medium text-gray-900">{row.code}</td>
      <td className="px-4 py-3 text-gray-900">{row.name}</td>
      <td className="px-4 py-3 text-gray-500">{row.start_time} - {row.end_time}</td>
      <td className="px-4 py-3 text-gray-500">{row.grace_minutes ?? 0} grace / {row.break_minutes ?? 0} break</td>
      <td className="px-4 py-3"><Badge label={row.is_active === false ? "Inactive" : "Active"} active={row.is_active !== false} /></td>
      <td className="px-4 py-3 text-right"><EditButton onClick={() => onEdit(row)} /></td>
    </tr>
  ))}</Table>;
}

function LocationsTable({ rows, loading, onEdit }: { rows: Location[]; loading: boolean; onEdit: (row: Location) => void }) {
  return <Table headers={["Code", "Name", "Company", "Branch", "Status", "Actions"]} loading={loading} empty={rows.length === 0} colSpan={6}>{rows.map((row) => (
    <tr key={row.id} className="border-t">
      <td className="px-4 py-3 font-medium text-gray-900">{row.code}</td>
      <td className="px-4 py-3 text-gray-900">{row.name}</td>
      <td className="px-4 py-3 text-gray-500">{nameOf(row.company)}</td>
      <td className="px-4 py-3 text-gray-500">{nameOf(row.branch)}</td>
      <td className="px-4 py-3"><Badge label={row.is_active === false ? "Inactive" : "Active"} active={row.is_active !== false} /></td>
      <td className="px-4 py-3 text-right"><EditButton onClick={() => onEdit(row)} /></td>
    </tr>
  ))}</Table>;
}

function AssignmentsTable({ rows, loading, onEdit }: { rows: Assignment[]; loading: boolean; onEdit: (row: Assignment) => void }) {
  return <Table headers={["Person", "Shift", "Location", "Window", "Status", "Actions"]} loading={loading} empty={rows.length === 0} colSpan={6}>{rows.map((row) => (
    <tr key={row.id} className="border-t">
      <td className="px-4 py-3 font-medium text-gray-900">{nameOf(row.employee)}</td>
      <td className="px-4 py-3 text-gray-500">{nameOf(row.shift_type)}</td>
      <td className="px-4 py-3 text-gray-500">{nameOf(row.location)}</td>
      <td className="px-4 py-3 text-gray-500">{row.effective_from} - {row.effective_to || "open"}</td>
      <td className="px-4 py-3"><Badge label={row.is_active === false ? "Inactive" : "Active"} active={row.is_active !== false} /></td>
      <td className="px-4 py-3 text-right"><EditButton onClick={() => onEdit(row)} /></td>
    </tr>
  ))}</Table>;
}

function RosterTable({ rows, loading, onEdit }: { rows: RosterEntry[]; loading: boolean; onEdit: (row: RosterEntry) => void }) {
  return <Table headers={["Date", "Person", "Shift", "Location", "Status", "Actions"]} loading={loading} empty={rows.length === 0} colSpan={6}>{rows.map((row) => (
    <tr key={row.id} className="border-t">
      <td className="px-4 py-3 font-medium text-gray-900">{row.roster_date}</td>
      <td className="px-4 py-3 text-gray-500">{nameOf(row.employee)}</td>
      <td className="px-4 py-3 text-gray-500">{nameOf(row.shift_type)}</td>
      <td className="px-4 py-3 text-gray-500">{nameOf(row.location)}</td>
      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "scheduled"}</span></td>
      <td className="px-4 py-3 text-right"><EditButton onClick={() => onEdit(row)} /></td>
    </tr>
  ))}</Table>;
}

function RequestPanel({ current, shiftTypes, patch, saving, onSubmit, rows, loading, onDecide }: {
  current: Record<string, unknown>;
  shiftTypes: ShiftType[];
  patch: (patch: Record<string, unknown>) => void;
  saving: boolean;
  onSubmit: () => void;
  rows: ShiftRequest[];
  loading: boolean;
  onDecide: (kind: "requests" | "overtime", id: string, action: "approve" | "reject") => void;
}) {
  return (
    <>
      <div className="border-b border-gray-100 bg-gray-50 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input value={String(current.employee_id ?? "")} onChange={(event) => patch({ employee_id: event.target.value })} placeholder="Person ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <ShiftSelect value={String(current.current_shift_type_id ?? "")} shifts={shiftTypes} onChange={(value) => patch({ current_shift_type_id: value })} />
          <ShiftSelect value={String(current.requested_shift_type_id ?? "")} shifts={shiftTypes} onChange={(value) => patch({ requested_shift_type_id: value })} />
          <input type="date" value={String(current.requested_date ?? "")} onChange={(event) => patch({ requested_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input value={String(current.reason ?? "")} onChange={(event) => patch({ reason: event.target.value })} placeholder="Reason" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button disabled={saving} onClick={onSubmit} className="mt-3 inline-flex items-center gap-1.5 rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"><Plus size={14} /> Submit request</button>
      </div>
      <Table headers={["Person", "Date", "Current", "Requested", "Status", "Review"]} loading={loading} empty={rows.length === 0} colSpan={6}>{rows.map((row) => (
        <tr key={row.id} className="border-t">
          <td className="px-4 py-3 font-medium text-gray-900">{nameOf(row.employee)}</td>
          <td className="px-4 py-3 text-gray-500">{row.requested_date}</td>
          <td className="px-4 py-3 text-gray-500">{nameOf(row.current_shift_type)}</td>
          <td className="px-4 py-3 text-gray-500">{nameOf(row.requested_shift_type)}</td>
          <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status}</span></td>
          <td className="px-4 py-3 text-right"><ReviewButtons disabled={row.status !== "submitted"} onApprove={() => onDecide("requests", row.id, "approve")} onReject={() => onDecide("requests", row.id, "reject")} /></td>
        </tr>
      ))}</Table>
    </>
  );
}

function OvertimePanel({ current, patch, saving, onSubmit, rows, loading, onDecide }: {
  current: Record<string, unknown>;
  patch: (patch: Record<string, unknown>) => void;
  saving: boolean;
  onSubmit: () => void;
  rows: OvertimeRecord[];
  loading: boolean;
  onDecide: (kind: "requests" | "overtime", id: string, action: "approve" | "reject") => void;
}) {
  return (
    <>
      <div className="border-b border-gray-100 bg-gray-50 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <input value={String(current.employee_id ?? "")} onChange={(event) => patch({ employee_id: event.target.value })} placeholder="Person ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input value={String(current.attendance_day_id ?? "")} onChange={(event) => patch({ attendance_day_id: event.target.value })} placeholder="Attendance day ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input type="date" value={String(current.overtime_date ?? "")} onChange={(event) => patch({ overtime_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input type="datetime-local" value={dateTimeLocal(String(current.start_time ?? ""))} onChange={(event) => patch({ start_time: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input type="datetime-local" value={dateTimeLocal(String(current.end_time ?? ""))} onChange={(event) => patch({ end_time: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input type="number" value={Number(current.overtime_minutes ?? 0)} onChange={(event) => patch({ overtime_minutes: Number(event.target.value) })} placeholder="Minutes" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input value={String(current.reason ?? "")} onChange={(event) => patch({ reason: event.target.value })} placeholder="Reason" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button disabled={saving} onClick={onSubmit} className="mt-3 inline-flex items-center gap-1.5 rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"><Plus size={14} /> Submit overtime</button>
      </div>
      <Table headers={["Person", "Date", "Minutes", "Attendance", "Status", "Review"]} loading={loading} empty={rows.length === 0} colSpan={6}>{rows.map((row) => (
        <tr key={row.id} className="border-t">
          <td className="px-4 py-3 font-medium text-gray-900">{nameOf(row.employee)}</td>
          <td className="px-4 py-3 text-gray-500">{row.overtime_date}</td>
          <td className="px-4 py-3 text-gray-500">{row.overtime_minutes ?? 0}</td>
          <td className="px-4 py-3 text-gray-500">{row.attendance_day?.attendance_date ?? row.attendance_day_id ?? "-"}</td>
          <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status}</span></td>
          <td className="px-4 py-3 text-right"><ReviewButtons disabled={row.status !== "submitted"} onApprove={() => onDecide("overtime", row.id, "approve")} onReject={() => onDecide("overtime", row.id, "reject")} /></td>
        </tr>
      ))}</Table>
    </>
  );
}

function Table({ headers, loading, empty, colSpan, children }: { headers: string[]; loading: boolean; empty: boolean; colSpan: number; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>{headers.map((header) => <th key={header} className={`px-4 py-3 ${header === "Actions" || header === "Review" ? "text-right" : "text-left"}`}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {loading ? <tr><td colSpan={colSpan} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : empty ? <tr><td colSpan={colSpan} className="px-4 py-8 text-center text-gray-400">No records yet.</td></tr> : children}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ label, active }: { label: string; active: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{label}</span>;
}

function EditButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="p-1.5 text-gray-400 hover:text-brand-600" title="Edit"><Pencil size={15} /></button>;
}

function ReviewButtons({ disabled, onApprove, onReject }: { disabled: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <button disabled={disabled} onClick={onApprove} className="inline-flex items-center gap-1 rounded border border-green-200 px-2 py-1 text-xs font-medium text-green-700 disabled:opacity-40"><Check size={13} /> Approve</button>
      <button disabled={disabled} onClick={onReject} className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 disabled:opacity-40"><X size={13} /> Reject</button>
    </div>
  );
}
