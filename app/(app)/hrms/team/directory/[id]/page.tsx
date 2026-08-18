"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Handshake,
  IdCard,
  Pencil,
  UserCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  FieldGrid,
  FormField,
  FormGrid,
  Input,
  Modal,
  Select,
  SubTabs,
  type Column,
} from "@/components/hrms/ui";
import { useHrmsData } from "@/lib/hrms/client-api";
import { EMPTY, fmtDate, fmtLacs, fmtMoney, fmtPercent, initials } from "@/lib/hrms/format";
import { employeeTone, priorityTone, requestTone, titleCase } from "@/lib/hrms/status";
import type {
  Appraisal,
  Asset,
  Employee,
  EmployeeDocument,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeFamilyMember,
  Goal,
  RankingEntry,
  Separation,
  Ticket,
} from "@/lib/hrms/types";

type TabKey =
  | "personal"
  | "employment"
  | "documents"
  | "contact"
  | "banking"
  | "additional"
  | "overview"
  | "assets"
  | "separation"
  | "tickets";
type LookupOption = { id: string; name: string };
type Options = {
  branches?: LookupOption[];
  departments?: LookupOption[];
  designations?: LookupOption[];
  employment_types?: LookupOption[];
  shifts?: LookupOption[];
  employees?: LookupOption[];
};
type EditForm = {
  name: string;
  email: string;
  mobile: string;
  status: string;
  date_of_joining: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  marital_status: string;
  personal_email: string;
  current_address: string;
  permanent_address: string;
  branch_id: string;
  department_id: string;
  designation_id: string;
  employment_type_id: string;
  reporting_manager_id: string;
  shift_id: string;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "personal", label: "Personal Details" },
  { key: "employment", label: "Employment Details" },
  { key: "documents", label: "Documents" },
  { key: "contact", label: "Contact Details" },
  { key: "banking", label: "Banking Details" },
  { key: "additional", label: "Additional Info" },
  { key: "overview", label: "Overview" },
  { key: "assets", label: "Assets" },
  { key: "separation", label: "Separation" },
  { key: "tickets", label: "Tickets" },
];

const DOC_TONE: Record<EmployeeDocument["status"], string> = {
  verified: "bg-green-100 text-green-700",
  uploaded: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
};

/** `docs/hrms/05-employee-record.md` — the spine every other module FKs to. */
export default function EmployeeRecordPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>("personal");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [options, setOptions] = useState<Options>({});
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm>({
    name: "",
    email: "",
    mobile: "",
    status: "active",
    date_of_joining: "",
    date_of_birth: "",
    gender: "",
    blood_group: "",
    marital_status: "",
    personal_email: "",
    current_address: "",
    permanent_address: "",
    branch_id: "",
    department_id: "",
    designation_id: "",
    employment_type_id: "",
    reporting_manager_id: "",
    shift_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [assets] = useHrmsData<Asset[]>("/api/hrms/assets", []);
  const [ticketData] = useHrmsData<{ tickets: Ticket[] } | Ticket[]>("/api/hrms/tickets", { tickets: [] });
  const [separationData] = useHrmsData<{ separations: Separation[] } | Separation[]>("/api/hrms/separations", { separations: [] });
  const [goalsAll] = useHrmsData<Goal[]>("/api/hrms/performance/goals", []);
  const [appraisalsAll] = useHrmsData<Appraisal[]>("/api/hrms/performance/appraisals", []);
  const [rankingAll] = useHrmsData<RankingEntry[]>("/api/hrms/performance/ranking", []);
  const documents: EmployeeDocument[] = [];
  const education: EmployeeEducation[] = [];
  const experience: EmployeeExperience[] = [];
  const family: EmployeeFamilyMember[] = [];

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/hrms/employees/${params.id}`),
      fetch("/api/hrms/options"),
    ])
      .then(async (res) => {
        const [employeeRes, optionRes] = res;
        const employeeJson = await employeeRes.json();
        const optionJson = await optionRes.json();
        if (!employeeRes.ok) throw new Error(employeeJson.error ?? "Unable to load employee");
        if (!optionRes.ok) throw new Error(optionJson.error ?? "Unable to load HRMS options");
        if (alive) {
          setEmployee(employeeJson.data);
          setOptions(optionJson.data ?? {});
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load employee"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [params.id]);

  function idFor(items: LookupOption[] | undefined, name?: string) {
    return items?.find((item) => item.name === name)?.id ?? "";
  }

  function openEditor() {
    if (!employee) return;
    setForm({
      name: employee.name ?? "",
      email: employee.email ?? "",
      mobile: employee.mobile ?? "",
      status: employee.status ?? "active",
      date_of_joining: employee.date_of_joining ?? "",
      date_of_birth: employee.date_of_birth ?? "",
      gender: employee.gender ?? "",
      blood_group: employee.blood_group ?? "",
      marital_status: employee.marital_status ?? "",
      personal_email: employee.personal_email ?? "",
      current_address: employee.current_address ?? "",
      permanent_address: employee.permanent_address ?? "",
      branch_id: idFor(options.branches, employee.branch),
      department_id: idFor(options.departments, employee.department),
      designation_id: idFor(options.designations, employee.designation),
      employment_type_id: idFor(options.employment_types, employee.employment_type),
      reporting_manager_id: employee.reporting_manager_id ?? "",
      shift_id: idFor(options.shifts, employee.shift_name),
    });
    setEditOpen(true);
  }

  async function saveEmployee() {
    setSaving(true);
    try {
      const res = await fetch(`/api/hrms/employees/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to save employee");
      setEmployee(json.data);
      setEditOpen(false);
      toast.success("Employee updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save employee");
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((next) => ({ ...next, [key]: value }));
  }

  if (loading) {
    return <Card title="Employee Record"><EmptyState title="Loading employee..." /></Card>;
  }

  if (!employee) {
    return <Card title="Employee Record"><EmptyState title="Employee not found" /></Card>;
  }

  /**
   * Profile completion is a real feature, not decoration (§3) — it is what makes
   * HR chase the gaps. Counted over the fields the record actually needs.
   */
  const tracked: (string | number | undefined)[] = [
    employee.date_of_birth, employee.gender, employee.blood_group, employee.marital_status,
    employee.personal_email, employee.mobile, employee.current_address, employee.permanent_address,
    employee.designation, employee.department, employee.branch, employee.employment_type,
    employee.reporting_manager, employee.date_of_joining, employee.shift_name,
    employee.emergency_contact_name, employee.emergency_contact_number,
    employee.pan, employee.aadhaar_last4, employee.bank_name, employee.bank_account_last4,
    employee.ifsc, employee.uan, employee.ctc_annual_paise,
  ];
  const filled = tracked.filter((v) => v != null && v !== "").length;
  const completion = Math.round((filled / tracked.length) * 100);

  const separations = Array.isArray(separationData) ? separationData : separationData.separations ?? [];
  const separation = separations.find((s) => s.employee_id === employee.id);
  const ticketsAll = Array.isArray(ticketData) ? ticketData : ticketData.tickets ?? [];
  const tickets = ticketsAll.filter((t) => t.raised_by_id === employee.id);
  const goals = goalsAll.filter((g) => g.employee_id === employee.id);
  const appraisals = appraisalsAll.filter((a) => a.employee_id === employee.id);
  const ranking = rankingAll.find((r) => r.employee_id === employee.id);
  const employeeAssets = assets.filter((a) => a.allocated_to === employee.name);

  const docColumns: Column<EmployeeDocument>[] = [
    { key: "type", header: "Document", render: (d) => <span className="font-medium text-gray-900">{d.document_type}</span> },
    {
      key: "mandatory",
      header: "Mandatory",
      align: "center",
      render: (d) => (d.is_mandatory ? <Badge tone="bg-brand-50 text-brand-600">Required</Badge> : EMPTY),
    },
    { key: "file", header: "File", render: (d) => d.file_name ?? EMPTY },
    { key: "uploaded", header: "Uploaded", render: (d) => fmtDate(d.uploaded_at) },
    { key: "expires", header: "Expires", render: (d) => fmtDate(d.expires_at) },
    {
      key: "status",
      header: "Status",
      render: (d) => <Badge tone={DOC_TONE[d.status]}>{titleCase(d.status)}</Badge>,
    },
    { key: "remarks", header: "Remarks", render: (d) => d.remarks ?? EMPTY },
  ];

  const assetColumns: Column<Asset>[] = [
    { key: "code", header: "Asset Code", render: (a) => <span className="font-medium text-gray-900">{a.asset_code}</span> },
    { key: "category", header: "Category", render: (a) => a.category },
    { key: "make", header: "Make / Model", render: (a) => `${a.make ?? EMPTY} ${a.model ?? ""}`.trim() },
    { key: "serial", header: "Serial Number", render: (a) => a.serial_number ?? EMPTY },
    { key: "allocated", header: "Allocated On", render: (a) => fmtDate(a.allocated_on) },
    {
      key: "status",
      header: "Status",
      render: (a) => <Badge tone="bg-green-100 text-green-700">{titleCase(a.status)}</Badge>,
    },
  ];

  const ticketColumns: Column<Ticket>[] = [
    { key: "code", header: "Ticket", render: (t) => <span className="font-medium text-gray-900">{t.ticket_code}</span> },
    { key: "subject", header: "Subject", render: (t) => t.subject },
    { key: "category", header: "Category", render: (t) => t.category },
    {
      key: "priority",
      header: "Priority",
      render: (t) => <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>,
    },
    { key: "created", header: "Raised On", render: (t) => fmtDate(t.created_at) },
    { key: "resolved", header: "Resolved On", render: (t) => fmtDate(t.resolved_at) },
    { key: "status", header: "Status", render: (t) => <Badge>{titleCase(t.status)}</Badge> },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/hrms/team/directory"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600"
      >
        <ArrowLeft size={14} /> Back to directory
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start gap-5">
          <span className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl bg-brand-100 text-lg font-bold text-brand-700">
            {initials(employee.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{employee.name}</h2>
              <Badge tone={employeeTone(employee.status)}>{titleCase(employee.status)}</Badge>
            </div>
            <p className="text-sm text-gray-500">{employee.email}</p>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <BriefcaseBusiness size={13} className="text-gray-400" />
                {employee.designation ?? EMPTY}
              </span>
              <span className="flex items-center gap-1.5">
                <IdCard size={13} className="text-gray-400" />
                {employee.employee_code}
              </span>
              <span className="flex items-center gap-1.5">
                <UserCircle size={13} className="text-gray-400" />
                {employee.reporting_manager ?? EMPTY}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} className="text-gray-400" />
                {fmtDate(employee.date_of_joining)}
              </span>
              {employee.source_candidate_id && (
                <span className="flex items-center gap-1.5 text-brand-600" title="Converted from an ATS candidate">
                  <Handshake size={13} />
                  ATS candidate {employee.source_candidate_id}
                </span>
              )}
            </dl>
          </div>
          <Button icon={Pencil} onClick={openEditor}>Edit Employee</Button>
          <div className="flex flex-col items-center gap-1">
            <div
              className="grid h-16 w-16 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#ff2d87 ${completion * 3.6}deg, #f1f5f9 0deg)`,
              }}
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-bold text-gray-900">
                {completion}%
              </span>
            </div>
            <p className="text-[11px] font-medium text-gray-500">Profile Completion</p>
          </div>
        </div>
      </div>

      <SubTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "personal" && (
        <div className="space-y-5">
          <Card title="Basic Information">
            <FieldGrid>
              <Field label="Full Name" value={employee.name} />
              <Field label="Date of Birth" value={fmtDate(employee.date_of_birth)} />
              <Field label="Gender" value={employee.gender} />
              <Field label="Blood Group" value={employee.blood_group} />
              <Field label="Marital Status" value={employee.marital_status} />
              <Field label="Nationality" value={employee.nationality} />
              <Field label="Personal Email" value={employee.personal_email} />
              <Field label="Mobile" value={employee.mobile} />
            </FieldGrid>
          </Card>

          <Card title="Addresses">
            <FieldGrid columns={2}>
              <Field label="Current Address" value={employee.current_address} />
              <Field label="Permanent Address" value={employee.permanent_address} />
            </FieldGrid>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Education" bodyClassName="p-0">
              {education.length === 0 ? (
                <EmptyState title="No education records" />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {education.map((e) => (
                    <li key={e.id} className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {e.qualification}
                        {e.specialization ? ` — ${e.specialization}` : ""}
                      </p>
                      <p className="text-xs text-gray-500">{e.institute}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {e.year_of_passing ?? EMPTY} · {e.percentage != null ? `${e.percentage}%` : EMPTY}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Prior Experience" bodyClassName="p-0">
              {experience.length === 0 ? (
                <EmptyState title="No prior experience recorded" />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {experience.map((x) => (
                    <li key={x.id} className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{x.designation}</p>
                      <p className="text-xs text-gray-500">{x.company}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {fmtDate(x.from_date)} — {fmtDate(x.to_date)} · {fmtLacs(x.last_ctc_paise)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Family & Dependents" bodyClassName="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-2 text-left font-semibold">Name</th>
                  <th className="px-5 py-2 text-left font-semibold">Relation</th>
                  <th className="px-5 py-2 text-left font-semibold">Date of Birth</th>
                  <th className="px-5 py-2 text-left font-semibold">Contact</th>
                  <th className="px-5 py-2 text-center font-semibold">Dependent</th>
                </tr>
              </thead>
              <tbody>
                {family.map((f) => (
                  <tr key={f.id} className="border-t border-gray-100">
                    <td className="px-5 py-2 font-medium text-gray-900">{f.name}</td>
                    <td className="px-5 py-2 text-gray-600">{f.relation}</td>
                    <td className="px-5 py-2 text-gray-600">{fmtDate(f.date_of_birth)}</td>
                    <td className="px-5 py-2 text-gray-600">{f.contact_number ?? EMPTY}</td>
                    <td className="px-5 py-2 text-center">
                      {f.is_dependent ? <Badge tone="bg-green-100 text-green-700">Yes</Badge> : EMPTY}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === "employment" && (
        <div className="space-y-5">
          <Card
            title="Employment Information"
            subtitle="Effective-dated in the schema — this shows the current assignment"
          >
            <FieldGrid>
              <Field label="Employee Code" value={employee.employee_code} />
              <Field label="Designation" value={employee.designation} />
              <Field label="Department" value={employee.department} />
              <Field label="Sub-Department" value={employee.sub_department} />
              <Field label="Business Unit" value={employee.business_unit} />
              <Field label="Branch" value={employee.branch} />
              <Field label="Employment Type" value={employee.employment_type} />
              <Field label="Function Role" value={employee.function_role} />
              <Field label="Reporting Manager" value={employee.reporting_manager} />
              <Field label="Date of Joining" value={fmtDate(employee.date_of_joining)} />
              <Field label="Confirmation Date" value={fmtDate(employee.confirmation_date)} />
              <Field label="Probation End Date" value={fmtDate(employee.probation_end_date)} />
            </FieldGrid>
          </Card>

          <Card title="Attendance Configuration">
            <FieldGrid>
              <Field label="Shift" value={employee.shift_name} />
              <Field label="Work Location" value={employee.work_location} />
              <Field
                label="Attendance Mode"
                value={employee.attendance_mode ? titleCase(employee.attendance_mode) : undefined}
              />
            </FieldGrid>
          </Card>

          <Card title="Compensation">
            <FieldGrid>
              <Field label="Annual CTC" value={fmtLacs(employee.ctc_annual_paise)} />
              <Field label="Monthly CTC" value={fmtMoney(employee.ctc_annual_paise ? Math.round(employee.ctc_annual_paise / 12) : undefined)} />
              <Field label="Payroll Enrolled" value={<Badge tone="bg-green-100 text-green-700">Yes</Badge>} />
            </FieldGrid>
          </Card>

          {employee.source_candidate_id && (
            <Card title="Provenance" subtitle="Written at conversion, so the hire stays traceable">
              <FieldGrid>
                <Field label="Source" value="ATS candidate" />
                <Field label="Candidate ID" value={employee.source_candidate_id} />
                <Field label="Converted On" value={fmtDate(employee.date_of_joining)} />
              </FieldGrid>
            </Card>
          )}
        </div>
      )}

      {tab === "documents" && (
        <Card
          title="Documents"
          subtitle="Checklist seeded from the onboarding form master"
          bodyClassName="p-4"
          actions={<Button icon={FileText}>Generate Letter</Button>}
        >
          <DataTable
            columns={docColumns}
            rows={documents}
            getKey={(d) => d.id}
            empty="No documents on file"
            dense
          />
        </Card>
      )}

      {tab === "contact" && (
        <Card title="Emergency Contact">
          <FieldGrid>
            <Field label="Contact Name" value={employee.emergency_contact_name} />
            <Field label="Relationship" value={employee.emergency_contact_relation} />
            <Field label="Contact Number" value={employee.emergency_contact_number} />
            <Field label="Work Email" value={employee.email} />
            <Field label="Personal Email" value={employee.personal_email} />
            <Field label="Mobile" value={employee.mobile} />
          </FieldGrid>
        </Card>
      )}

      {tab === "banking" && (
        <div className="space-y-5">
          <Card title="Identity Proofs" subtitle="Field-level access controlled and read-logged">
            <FieldGrid>
              <Field label="PAN" value={employee.pan} />
              <Field label="Aadhaar" value={employee.aadhaar_last4 ? `XXXX XXXX ${employee.aadhaar_last4}` : undefined} />
            </FieldGrid>
          </Card>
          <Card title="Bank Account">
            <FieldGrid>
              <Field label="Bank Name" value={employee.bank_name} />
              <Field label="Account Number" value={employee.bank_account_last4 ? `XXXXXX${employee.bank_account_last4}` : undefined} />
              <Field label="IFSC" value={employee.ifsc} />
            </FieldGrid>
          </Card>
        </div>
      )}

      {tab === "additional" && (
        <Card title="Statutory" subtitle="PF, UAN and ESI — the payroll inputs">
          <FieldGrid>
            <Field label="UAN" value={employee.uan} />
            <Field label="ESIC Number" value={employee.esic_number} />
            <Field label="PF Applicable" value={employee.uan ? "Yes" : undefined} />
            <Field label="ESI Applicable" value={employee.esic_number ? "Yes" : undefined} />
          </FieldGrid>
        </Card>
      )}

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current Rank</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {ranking ? ranking.rank : EMPTY}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Score</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {ranking ? ranking.total_score : EMPTY}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Active Goals</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{goals.length || EMPTY}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Appraisals</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{appraisals.length || EMPTY}</p>
            </div>
          </div>

          <Card title="Goals" bodyClassName="p-0">
            {goals.length === 0 ? (
              <EmptyState title="No goals assigned" />
            ) : (
              <ul className="divide-y divide-gray-100">
                {goals.map((g) => (
                  <li key={g.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{g.title}</p>
                        <p className="text-xs text-gray-500">
                          {g.cycle_name} · weightage {fmtPercent(g.weightage)} · due {fmtDate(g.due_date)}
                        </p>
                      </div>
                      <Badge tone={requestTone(g.status)}>{titleCase(g.status)}</Badge>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${g.progress_percent}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Appraisal History" bodyClassName="p-0">
            {appraisals.length === 0 ? (
              <EmptyState title="No appraisals yet" />
            ) : (
              <ul className="divide-y divide-gray-100">
                {appraisals.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.cycle_name}</p>
                      <p className="text-xs text-gray-500">{a.template_name ?? EMPTY}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        Self {a.self_score ?? EMPTY} · Manager {a.manager_score ?? EMPTY}
                      </span>
                      <Badge>{titleCase(a.status)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "assets" && (
        <Card title="Allocated Assets" bodyClassName="p-4">
          <DataTable
            columns={assetColumns}
            rows={employeeAssets}
            getKey={(a) => a.id}
            empty="No assets allocated"
            dense
          />
        </Card>
      )}

      {tab === "separation" && (
        <Card title="Separation">
          {!separation ? (
            <EmptyState
              title="No separation record"
              hint="This employee is active. Raising a resignation creates a separation request in the same approval engine."
              action={<Button variant="primary">Initiate Separation</Button>}
            />
          ) : (
            <div className="space-y-5">
              <FieldGrid>
                <Field label="Separation Type" value={titleCase(separation.separation_type)} />
                <Field label="Resignation Date" value={fmtDate(separation.resignation_date)} />
                <Field label="Notice Period" value={`${separation.notice_days} days`} />
                <Field label="Last Working Date" value={fmtDate(separation.last_working_date)} />
                <Field label="Status" value={<Badge tone={requestTone(separation.status)}>{separation.status}</Badge>} />
                <Field
                  label="Exit Interview"
                  value={separation.exit_interview_done ? "Completed" : "Pending"}
                />
              </FieldGrid>
              <Field label="Reason" value={separation.reason} />
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Clearance Pending
                </p>
                {separation.clearance_pending && separation.clearance_pending.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {separation.clearance_pending.map((c) => (
                      <Badge key={c} tone="bg-amber-100 text-amber-800">
                        {c}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Badge tone="bg-green-100 text-green-700">All clear</Badge>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === "tickets" && (
        <Card title="Tickets Raised" bodyClassName="p-4">
          <DataTable
            columns={ticketColumns}
            rows={tickets}
            getKey={(t) => t.id}
            empty="No tickets raised by this employee"
            dense
          />
        </Card>
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Employee"
        width="max-w-4xl"
        footer={<><Button onClick={() => setEditOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveEmployee} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}
      >
        <FormGrid columns={3}>
          <FormField label="Full Name" required><Input value={form.name} onChange={(e) => setField("name", e.target.value)} /></FormField>
          <FormField label="Work Email" required><Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} /></FormField>
          <FormField label="Mobile"><Input value={form.mobile} onChange={(e) => setField("mobile", e.target.value)} /></FormField>
          <FormField label="Status"><Select value={form.status} onChange={(e) => setField("status", e.target.value)}><option value="active">Active</option><option value="probation">Probation</option><option value="notice">Notice</option><option value="on_leave">On Leave</option><option value="separated">Separated</option></Select></FormField>
          <FormField label="Date of Joining"><Input type="date" value={form.date_of_joining} onChange={(e) => setField("date_of_joining", e.target.value)} /></FormField>
          <FormField label="Date of Birth"><Input type="date" value={form.date_of_birth} onChange={(e) => setField("date_of_birth", e.target.value)} /></FormField>
          <FormField label="Designation"><Select value={form.designation_id} onChange={(e) => setField("designation_id", e.target.value)}><option value="">None</option>{(options.designations ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormField>
          <FormField label="Department"><Select value={form.department_id} onChange={(e) => setField("department_id", e.target.value)}><option value="">None</option>{(options.departments ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormField>
          <FormField label="Branch"><Select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)}><option value="">None</option>{(options.branches ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormField>
          <FormField label="Employment Type"><Select value={form.employment_type_id} onChange={(e) => setField("employment_type_id", e.target.value)}><option value="">None</option>{(options.employment_types ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormField>
          <FormField label="Reporting Manager"><Select value={form.reporting_manager_id} onChange={(e) => setField("reporting_manager_id", e.target.value)}><option value="">None</option>{(options.employees ?? []).filter((item) => item.id !== employee.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormField>
          <FormField label="Shift"><Select value={form.shift_id} onChange={(e) => setField("shift_id", e.target.value)}><option value="">None</option>{(options.shifts ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormField>
          <FormField label="Gender"><Input value={form.gender} onChange={(e) => setField("gender", e.target.value)} /></FormField>
          <FormField label="Blood Group"><Input value={form.blood_group} onChange={(e) => setField("blood_group", e.target.value)} /></FormField>
          <FormField label="Marital Status"><Input value={form.marital_status} onChange={(e) => setField("marital_status", e.target.value)} /></FormField>
          <FormField label="Personal Email"><Input type="email" value={form.personal_email} onChange={(e) => setField("personal_email", e.target.value)} /></FormField>
          <FormField label="Current Address"><Input value={form.current_address} onChange={(e) => setField("current_address", e.target.value)} /></FormField>
          <FormField label="Permanent Address"><Input value={form.permanent_address} onChange={(e) => setField("permanent_address", e.target.value)} /></FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
