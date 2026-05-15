"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, RefreshCw, X } from "lucide-react";
import toast from "react-hot-toast";

type ResourceKey = "companies" | "branches" | "departments" | "grades" | "employment_types" | "department_approvers";
type OrgRow = Record<string, string | number | boolean | null | undefined> & { id: string; name?: string; code?: string; is_active?: boolean };
type OrgData = Record<ResourceKey, OrgRow[]> & { manager_options: OrgRow[] };

const TABS: { key: ResourceKey; label: string }[] = [
  { key: "companies", label: "Companies" },
  { key: "branches", label: "Branches" },
  { key: "departments", label: "Departments" },
  { key: "grades", label: "Grades" },
  { key: "employment_types", label: "Work Types" },
  { key: "department_approvers", label: "Approvers" },
];

const emptyData: OrgData = {
  companies: [],
  branches: [],
  departments: [],
  grades: [],
  employment_types: [],
  department_approvers: [],
  manager_options: [],
};

function initialForm(resource: ResourceKey) {
  if (resource === "department_approvers") {
    return { department_id: "", approver_employee_id: "", approval_scope: "employee_core", effective_from: new Date().toISOString().slice(0, 10), effective_to: "", is_active: true };
  }
  return { name: "", code: "", company_id: "", branch_id: "", parent_department_id: "", city: "", legal_name: "", sort_order: 0, is_active: true };
}

export default function PeopleOrganizationPage() {
  const [data, setData] = useState<OrgData>(emptyData);
  const [active, setActive] = useState<ResourceKey>("companies");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<OrgRow | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(initialForm("companies"));

  async function load() {
    setLoading(true);
    const res = await fetch("/api/hrms/organization");
    if (res.ok) setData((await res.json()).data ?? emptyData);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    setAdding(false);
    setEditing(null);
    setForm(initialForm(active));
  }, [active]);

  const rows = useMemo(() => data[active] ?? [], [active, data]);

  function labelFor(resource: ResourceKey, id: unknown) {
    const value = typeof id === "string" ? id : "";
    if (!value) return "-";
    const source = resource === "departments" ? data.departments : resource === "companies" ? data.companies : data.manager_options;
    const found = source.find((row) => row.id === value);
    return found?.name ?? found?.employee_code ?? value;
  }

  function patchForm(patch: Partial<OrgRow>) {
    if (editing) setEditing({ ...editing, ...patch });
    else setForm({ ...form, ...patch });
  }

  async function save() {
    const body = editing ? { ...editing, resource: active } : { ...form, resource: active };
    const res = await fetch("/api/hrms/organization", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Save failed");
      return;
    }
    toast.success(editing ? "Updated" : "Added");
    setAdding(false);
    setEditing(null);
    setForm(initialForm(active));
    await load();
  }

  const current = editing ?? form;

  const baseFields = (
    <>
      <input value={String(current.name ?? "")} onChange={(event) => patchForm({ name: event.target.value })} placeholder="Name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input value={String(current.code ?? "")} onChange={(event) => patchForm({ code: event.target.value })} placeholder="Code" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      {active === "companies" && <input value={String(current.legal_name ?? "")} onChange={(event) => patchForm({ legal_name: event.target.value })} placeholder="Legal name" className="rounded border border-gray-300 px-3 py-2 text-sm" />}
      {active === "branches" && <input value={String(current.city ?? "")} onChange={(event) => patchForm({ city: event.target.value })} placeholder="City" className="rounded border border-gray-300 px-3 py-2 text-sm" />}
      {(active === "branches" || active === "departments") && (
        <select value={String(current.company_id ?? "")} onChange={(event) => patchForm({ company_id: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">Company</option>
          {data.companies.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
      )}
      {active === "departments" && (
        <select value={String(current.branch_id ?? "")} onChange={(event) => patchForm({ branch_id: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">Branch</option>
          {data.branches.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
      )}
      {active === "grades" && <input type="number" value={Number(current.sort_order ?? 0)} onChange={(event) => patchForm({ sort_order: Number(event.target.value) })} placeholder="Sort" className="rounded border border-gray-300 px-3 py-2 text-sm" />}
    </>
  );

  const approverFields = (
    <>
      <select value={String(current.department_id ?? "")} onChange={(event) => patchForm({ department_id: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
        <option value="">Department</option>
        {data.departments.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select>
      <select value={String(current.approver_employee_id ?? "")} onChange={(event) => patchForm({ approver_employee_id: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
        <option value="">Approver</option>
        {data.manager_options.map((row) => <option key={row.id} value={row.id}>{row.employee_code ? `${row.employee_code} - ${row.name}` : row.name}</option>)}
      </select>
      <input value={String(current.approval_scope ?? "employee_core")} disabled className="rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm" />
      <input type="date" value={String(current.effective_from ?? "")} onChange={(event) => patchForm({ effective_from: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
      <input type="date" value={String(current.effective_to ?? "")} onChange={(event) => patchForm({ effective_to: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
    </>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">People Organization</h1>
          <p className="mt-1 text-sm text-gray-500">Manage companies, branches, departments, grades, work types and approvers.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActive(tab.key)} className={`rounded-lg px-3 py-2 text-sm font-medium ${active === tab.key ? "bg-brand-600 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{TABS.find((tab) => tab.key === active)?.label}</h2>
            <p className="text-xs text-gray-500">{rows.length} records</p>
          </div>
          <button onClick={() => { setAdding(true); setEditing(null); setForm(initialForm(active)); }} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white"><Plus size={14} /> Add</button>
        </div>

        {(adding || editing) && (
          <div className="border-b border-gray-100 bg-gray-50 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {active === "department_approvers" ? approverFields : baseFields}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={save} className="inline-flex items-center gap-1.5 rounded bg-brand-600 px-4 py-2 text-sm text-white"><Check size={14} /> Save</button>
              <button onClick={() => { setAdding(false); setEditing(null); }} className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"><X size={14} /> Cancel</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Code / Scope</th>
                <th className="px-4 py-3 text-left">Parent</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No records yet.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3 font-medium text-gray-900">{active === "department_approvers" ? labelFor("companies", row.approver_employee_id) : row.name}</td>
                  <td className="px-4 py-3 text-gray-500">{active === "department_approvers" ? row.approval_scope : row.code}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {active === "branches" || active === "departments" ? labelFor("companies", row.company_id) : active === "department_approvers" ? labelFor("departments", row.department_id) : "-"}
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.is_active === false ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}>{row.is_active === false ? "Inactive" : "Active"}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditing(row); setAdding(false); }} className="p-1.5 text-gray-400 hover:text-brand-600" title="Edit"><Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
