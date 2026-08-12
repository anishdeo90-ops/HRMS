"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  FieldGrid,
  FormField,
  FormGrid,
  Input,
  Modal,
  Select,
  StatCard,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import {
  DEMO_ONBOARDING_CASES,
  DEMO_ONBOARDING_FORMS,
  DEMO_SHIFTS,
} from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, fmtLacs } from "@/lib/hrms/format";
import { CASE_TONE, titleCase } from "@/lib/hrms/status";
import type { OnboardingCase } from "@/lib/hrms/types";

/**
 * `docs/hrms/14-onboarding.md §5`.
 *
 * Initiation is what turns an approved offer into a document checklist and a
 * pending employee record. Which checklist depends on the onboarding form
 * master picked here — that is where the per-document toggles live (§2.2).
 */
export default function OnboardingInitiationPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<OnboardingCase | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_ONBOARDING_CASES.filter((c) => {
      if (!["approved", "offer_sent", "documents_pending"].includes(c.status)) return false;
      if (!q) return true;
      return [c.candidate_name, c.case_code].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [search]);

  const columns: Column<OnboardingCase>[] = [
    { key: "code", header: "Case Code", render: (c) => <span className="font-medium text-gray-900">{c.case_code}</span> },
    { key: "candidate", header: "Candidate", render: (c) => c.candidate_name },
    { key: "designation", header: "Designation", render: (c) => c.designation ?? EMPTY },
    { key: "branch", header: "Branch", render: (c) => c.branch ?? EMPTY },
    { key: "salary", header: "Offered Salary", align: "right", render: (c) => fmtLacs(c.offered_annual_salary_paise) },
    { key: "doj", header: "Proposed DOJ", render: (c) => fmtDate(c.proposed_doj) },
    {
      key: "docs",
      header: "Documents",
      align: "center",
      render: (c) => `${c.documents_received ?? 0} / ${c.documents_required ?? 0}`,
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <Badge tone={CASE_TONE[c.status]}>{titleCase(c.status)}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <Button variant="primary" icon={Send} onClick={() => setOpen(c)}>
          Initiate
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Ready to Initiate" value={rows.filter((c) => c.status === "approved").length} tint="bg-brand-50 text-brand-600" />
        <StatCard label="Offer Sent" value={DEMO_ONBOARDING_CASES.filter((c) => c.status === "offer_sent").length} />
        <StatCard
          label="Documents Pending"
          value={DEMO_ONBOARDING_CASES.filter((c) => c.status === "documents_pending").length}
          tint="bg-amber-50 text-amber-600"
        />
      </div>

      <Card
        title="Onboarding Initiation"
        subtitle="Sends the joining kit and seeds the document checklist"
        bodyClassName="p-4"
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search candidate or case code"
          onReset={() => setSearch("")}
          onExport={() => {}}
        />
        <DataTable columns={columns} rows={rows} getKey={(c) => c.id} empty="Nothing ready to initiate" dense />
      </Card>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title="Initiate Onboarding"
        subtitle={open ? `${open.candidate_name} — ${open.case_code}` : ""}
        width="max-w-3xl"
        footer={
          <>
            <Button onClick={() => setOpen(null)}>Cancel</Button>
            <Button
              variant="primary"
              icon={Send}
              onClick={() => {
                toast.success(`Joining kit sent to ${open?.candidate_name}`);
                setOpen(null);
              }}
            >
              Send Joining Kit
            </Button>
          </>
        }
      >
        {open && (
          <div className="space-y-5">
            <FieldGrid columns={2}>
              <Field label="Candidate" value={open.candidate_name} />
              <Field label="Email" value={open.email} />
              <Field label="Designation" value={open.designation} />
              <Field label="Department" value={open.department} />
            </FieldGrid>

            <FormGrid columns={2}>
              <FormField
                label="Onboarding Form"
                required
                hint="Decides which documents are asked for"
              >
                <Select defaultValue="">
                  <option value="">Select</option>
                  {DEMO_ONBOARDING_FORMS.filter((f) => f.is_active).map((f) => (
                    <option key={f.id}>
                      {f.form_name} ({f.documents_required} documents)
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Confirmed Date of Joining" required>
                <Input type="date" defaultValue={open.proposed_doj?.slice(0, 10)} />
              </FormField>
              <FormField label="Default Shift" required>
                <Select defaultValue="">
                  <option value="">Select</option>
                  {DEMO_SHIFTS.filter((s) => s.is_active).map((s) => (
                    <option key={s.id}>{s.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Reporting Manager" required>
                <Select defaultValue="">
                  <option value="">Select</option>
                  <option>Anish Trivedi</option>
                  <option>Kavya Iyer</option>
                  <option>Priya Nair</option>
                  <option>Rohit Deshmukh</option>
                </Select>
              </FormField>
              <FormField label="Buddy" hint="Onboarding mentor for the first month">
                <Select defaultValue="">
                  <option value="">Optional</option>
                  <option>Ananya Ghosh</option>
                  <option>Sameer Khan</option>
                </Select>
              </FormField>
              <FormField label="Employee Code" hint="Leave blank to auto-generate">
                <Input placeholder="Auto-generated" />
              </FormField>
            </FormGrid>

            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Initiating creates the employee record in a pending state, links it back to ATS
              candidate <span className="font-medium text-gray-700">{open.source_candidate_id ?? EMPTY}</span>,
              and seeds the salary structure from the approved offer.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
