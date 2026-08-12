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
  SubTabs,
  type Column,
} from "@/components/hrms/ui";
import {
  DEMO_APPRAISALS,
  DEMO_EDUCATION,
  DEMO_EMPLOYEE_DOCUMENTS,
  DEMO_EXPERIENCE,
  DEMO_FAMILY,
  DEMO_GOALS,
  DEMO_MY_ASSETS,
  DEMO_RANKING,
  DEMO_SEPARATIONS,
  DEMO_TICKETS,
} from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, fmtLacs, fmtMoney, fmtPercent, initials } from "@/lib/hrms/format";
import { employeeTone, priorityTone, requestTone, titleCase } from "@/lib/hrms/status";
import type { Asset, Employee, EmployeeDocument, Ticket } from "@/lib/hrms/types";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/hrms/employees/${params.id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Unable to load employee");
        if (alive) setEmployee(json.data);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load employee"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [params.id]);

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

  const separation = DEMO_SEPARATIONS.find((s) => s.employee_id === employee.id);
  const tickets = DEMO_TICKETS.filter((t) => t.raised_by_id === employee.id);
  const goals = DEMO_GOALS.filter((g) => g.employee_id === employee.id);
  const appraisals = DEMO_APPRAISALS.filter((a) => a.employee_id === employee.id);
  const ranking = DEMO_RANKING.find((r) => r.employee_id === employee.id);

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
              {DEMO_EDUCATION.length === 0 ? (
                <EmptyState title="No education records" />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {DEMO_EDUCATION.map((e) => (
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
              {DEMO_EXPERIENCE.length === 0 ? (
                <EmptyState title="No prior experience recorded" />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {DEMO_EXPERIENCE.map((x) => (
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
                {DEMO_FAMILY.map((f) => (
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
            rows={DEMO_EMPLOYEE_DOCUMENTS}
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
            rows={DEMO_MY_ASSETS}
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
    </div>
  );
}
