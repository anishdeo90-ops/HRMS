"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, FileUp, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

type Lookup = { id: string; name: string; code?: string; employee_code?: string; department_id?: string };
type OrgData = {
  companies: Lookup[];
  branches: Lookup[];
  departments: Lookup[];
  grades: Lookup[];
  employment_types: Lookup[];
  manager_options: Lookup[];
};
type EmployeeRow = {
  id: string;
  employee_code: string;
  name: string;
  company_id: string;
  branch_id?: string;
  department_id?: string;
  grade_id?: string;
  employment_type_id?: string;
  reporting_manager_id?: string;
  employment_status: string;
  joining_date: string;
  work_email?: string;
  mobile?: string;
  is_active: boolean;
  company?: Lookup;
  department?: Lookup;
};
type DocumentRow = {
  id: string;
  file_name: string;
  document_type: string;
  visibility: string;
  signed_url?: string;
};

const emptyForm = {
  employee_code: "",
  name: "",
  company_id: "",
  branch_id: "",
  department_id: "",
  grade_id: "",
  employment_type_id: "",
  reporting_manager_id: "",
  employment_status: "draft",
  joining_date: "",
  work_email: "",
  mobile: "",
};

export default function PeopleEmployeesPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [org, setOrg] = useState<OrgData>({ companies: [], branches: [], departments: [], grades: [], employment_types: [], manager_options: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [selected, setSelected] = useState<EmployeeRow | null>(null);
  const [candidateId, setCandidateId] = useState("");
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState("identity");
  const [docVisibility, setDocVisibility] = useState("hr_only");

  async function load() {
    setLoading(true);
    const [employeeRes, orgRes] = await Promise.all([
      fetch("/api/hrms/employees"),
      fetch("/api/hrms/organization"),
    ]);
    if (employeeRes.ok) setRows((await employeeRes.json()).data ?? []);
    if (orgRes.ok) setOrg((await orgRes.json()).data ?? org);
    setLoading(false);
  }

  async function loadDocs(row: EmployeeRow) {
    setSelected(row);
    const res = await fetch(`/api/hrms/employees/${row.id}/documents`);
    if (res.ok) setDocs((await res.json()).data ?? []);
    else setDocs([]);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.employee_code, row.name, row.work_email, row.mobile].some((value) => value?.toLowerCase().includes(needle))
    );
  }, [rows, query]);

  async function createRow() {
    if (!form.employee_code || !form.name || !form.company_id || !form.joining_date) {
      toast.error("Code, name, company and start date are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Save failed");
      return;
    }
    toast.success("Record added");
    setAdding(false);
    setForm(emptyForm);
    await load();
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch(`/api/hrms/employees/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Update failed");
      return;
    }
    toast.success("Record updated");
    setEditing(null);
    await load();
  }

  async function convertCandidate() {
    if (!candidateId.trim()) {
      toast.error("Candidate ID required");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/hrms/employees/from-candidate/${candidateId.trim()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Conversion failed");
      return;
    }
    toast.success("Candidate converted");
    setCandidateId("");
    setForm(emptyForm);
    await load();
  }

  async function uploadDoc() {
    if (!selected || !docFile) return;
    const data = new FormData();
    data.append("file", docFile);
    data.append("category", docCategory);
    data.append("visibility", docVisibility);
    const res = await fetch(`/api/hrms/employees/${selected.id}/documents`, { method: "POST", body: data });
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Upload failed");
      return;
    }
    toast.success("Document uploaded");
    setDocFile(null);
    await loadDocs(selected);
  }

  async function deleteDoc(id: string) {
    if (!selected) return;
    const res = await fetch(`/api/hrms/employees/${selected.id}/documents?document_id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Document removed");
      await loadDocs(selected);
    }
  }

  const renderSelect = (value: string | undefined, onChange: (value: string) => void, options: Lookup[], placeholder: string) => (
    <select value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.employee_code ? `${option.employee_code} - ${option.name}` : option.name}</option>)}
    </select>
  );

  const activeEdit = editing ?? form;
  const setActiveEdit = (patch: Partial<typeof emptyForm>) => editing ? setEditing({ ...editing, ...patch }) : setForm({ ...form, ...patch });

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">People Records</h1>
          <p className="mt-1 text-sm text-gray-500">Manage staff master data, candidate conversion and private documents.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, code, email" className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"><RefreshCw size={14} /> Refresh</button>
          <button onClick={() => { setAdding(true); setEditing(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"><Plus size={14} /> Add</button>
        </div>
      </div>

      {(adding || editing) && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input value={activeEdit.employee_code} disabled={Boolean(editing)} onChange={(event) => setActiveEdit({ employee_code: event.target.value })} placeholder="Code" className="rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100" />
            <input value={activeEdit.name} onChange={(event) => setActiveEdit({ name: event.target.value })} placeholder="Name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="date" value={activeEdit.joining_date} onChange={(event) => setActiveEdit({ joining_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <select value={activeEdit.employment_status} onChange={(event) => setActiveEdit({ employment_status: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
              {["draft", "active", "inactive", "exited"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            {renderSelect(activeEdit.company_id, (value) => setActiveEdit({ company_id: value }), org.companies, "Company")}
            {renderSelect(activeEdit.branch_id, (value) => setActiveEdit({ branch_id: value }), org.branches, "Branch")}
            {renderSelect(activeEdit.department_id, (value) => setActiveEdit({ department_id: value }), org.departments, "Department")}
            {renderSelect(activeEdit.grade_id, (value) => setActiveEdit({ grade_id: value }), org.grades, "Grade")}
            {renderSelect(activeEdit.employment_type_id, (value) => setActiveEdit({ employment_type_id: value }), org.employment_types, "Type")}
            {renderSelect(activeEdit.reporting_manager_id, (value) => setActiveEdit({ reporting_manager_id: value }), org.manager_options, "Manager")}
            <input value={activeEdit.work_email ?? ""} onChange={(event) => setActiveEdit({ work_email: event.target.value })} placeholder="Work email" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={activeEdit.mobile ?? ""} onChange={(event) => setActiveEdit({ mobile: event.target.value })} placeholder="Mobile" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
          {!editing && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
              <input value={candidateId} onChange={(event) => setCandidateId(event.target.value)} placeholder="Joined candidate ID" className="w-72 rounded border border-gray-300 px-3 py-2 text-sm" />
              <button disabled={saving} onClick={convertCandidate} className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50">Convert candidate</button>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button disabled={saving} onClick={editing ? saveEdit : createRow} className="inline-flex items-center gap-1.5 rounded bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"><Check size={14} /> Save</button>
            <button onClick={() => { setAdding(false); setEditing(null); setForm(emptyForm); }} className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No records found.</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.id} className={`border-t ${selected?.id === row.id ? "bg-brand-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.employee_code}</td>
                  <td className="px-4 py-3 text-gray-900">{row.name}</td>
                  <td className="px-4 py-3 text-gray-500">{row.company?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-500">{row.department?.name ?? "-"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{row.employment_status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/people/employees/${row.id}`} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">Detail</Link>
                      <button onClick={() => { setEditing(row); setAdding(false); }} className="p-1.5 text-gray-400 hover:text-brand-600" title="Edit"><Pencil size={15} /></button>
                      <button onClick={() => void loadDocs(row)} className="p-1.5 text-gray-400 hover:text-brand-600" title="Documents"><FileUp size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Documents</h2>
          <p className="mt-1 text-xs text-gray-500">{selected ? selected.name : "Select a row to manage files."}</p>
          {selected && (
            <div className="mt-4 space-y-3">
              <div className="space-y-2 rounded border border-gray-100 bg-gray-50 p-3">
                <input type="file" onChange={(event) => setDocFile(event.target.files?.[0] ?? null)} className="w-full text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={docCategory} onChange={(event) => setDocCategory(event.target.value)} className="rounded border border-gray-300 px-2 py-1.5 text-xs">
                    {["identity", "education", "experience", "tax", "contract", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select value={docVisibility} onChange={(event) => setDocVisibility(event.target.value)} className="rounded border border-gray-300 px-2 py-1.5 text-xs">
                    {["hr_only", "employee", "manager"].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <button disabled={!docFile} onClick={uploadDoc} className="w-full rounded bg-brand-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">Upload</button>
              </div>
              <div className="space-y-2">
                {docs.length === 0 ? <p className="py-4 text-center text-xs text-gray-400">No documents yet.</p> : docs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 rounded border border-gray-100 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <a href={doc.signed_url ?? "#"} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-gray-900 hover:text-brand-600">{doc.file_name}</a>
                      <p className="text-xs text-gray-400">{doc.document_type} · {doc.visibility}</p>
                    </div>
                    <button onClick={() => void deleteDoc(doc.id)} className="p-1.5 text-gray-400 hover:text-red-600" title="Remove"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
