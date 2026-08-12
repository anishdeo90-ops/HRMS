"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { FileText, Plus, Upload } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  FormField,
  FormGrid,
  Input,
  Modal,
  Select,
  Toggle,
  type Column,
} from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { DEMO_BRANCHES, DEMO_DEPARTMENTS, DEMO_EMPLOYMENT_TYPES } from "@/lib/hrms/demo-data";
import { fmtDate } from "@/lib/hrms/format";
import { titleCase } from "@/lib/hrms/status";

/**
 * `docs/hrms/07-settings.md §3`.
 *
 * Policies are versioned and scoped, and acknowledgement is tracked — a policy
 * nobody has acknowledged is not a policy, it is a file on a shared drive.
 * Scope resolution is the same resolver used by announcements and appraisals.
 */

interface Policy {
  id: string;
  name: string;
  version: string;
  effective_from: string;
  scope: "organization" | "branch" | "department" | "employment_type";
  scope_name?: string;
  requires_acknowledgement: boolean;
  acknowledged: number;
  applicable: number;
  is_active: boolean;
}

const POLICIES: Policy[] = [
  { id: "p-1", name: "Employee Handbook", version: "v3.2", effective_from: "2026-04-01", scope: "organization", requires_acknowledgement: true, acknowledged: 124, applicable: 138, is_active: true },
  { id: "p-2", name: "Attendance & Punctuality Policy", version: "v2.0", effective_from: "2026-09-01", scope: "organization", requires_acknowledgement: true, acknowledged: 96, applicable: 138, is_active: true },
  { id: "p-3", name: "POSH Policy", version: "v1.4", effective_from: "2025-04-01", scope: "organization", requires_acknowledgement: true, acknowledged: 138, applicable: 138, is_active: true },
  { id: "p-4", name: "Site Safety Protocol", version: "v1.1", effective_from: "2026-01-15", scope: "department", scope_name: "Operations", requires_acknowledgement: true, acknowledged: 40, applicable: 44, is_active: true },
  { id: "p-5", name: "Remote Work Policy", version: "v2.1", effective_from: "2026-06-01", scope: "employment_type", scope_name: "Permanent", requires_acknowledgement: false, acknowledged: 0, applicable: 96, is_active: true },
  { id: "p-6", name: "Travel & Expense Policy", version: "v1.8", effective_from: "2025-10-01", scope: "organization", requires_acknowledgement: false, acknowledged: 0, applicable: 138, is_active: false },
];

export default function PolicySetupPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [scope, setScope] = useState<Policy["scope"]>("organization");
  const [requiresAck, setRequiresAck] = useState(true);

  const scopeOptions =
    scope === "branch"
      ? DEMO_BRANCHES
      : scope === "department"
        ? DEMO_DEPARTMENTS
        : scope === "employment_type"
          ? DEMO_EMPLOYMENT_TYPES
          : [];

  const columns: Column<Policy>[] = [
    {
      key: "name",
      header: "Policy",
      render: (p) => (
        <div className="flex items-center gap-2">
          <FileText size={14} className="flex-shrink-0 text-gray-400" />
          <span className="font-medium text-gray-900">{p.name}</span>
        </div>
      ),
    },
    { key: "version", header: "Version", render: (p) => p.version },
    { key: "effective", header: "Effective From", render: (p) => fmtDate(p.effective_from) },
    {
      key: "scope",
      header: "Applies To",
      render: (p) =>
        p.scope === "organization"
          ? "Whole organisation"
          : `${titleCase(p.scope)} — ${p.scope_name}`,
    },
    {
      key: "ack",
      header: "Acknowledged",
      render: (p) =>
        !p.requires_acknowledgement ? (
          <span className="text-xs text-gray-400">Not required</span>
        ) : (
          <div className="flex w-36 items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${
                  p.acknowledged === p.applicable ? "bg-green-500" : "bg-amber-400"
                }`}
                style={{ width: `${Math.round((p.acknowledged / p.applicable) * 100)}%` }}
              />
            </div>
            <span className="w-14 text-right text-xs text-gray-600">
              {p.acknowledged} / {p.applicable}
            </span>
          </div>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Badge tone={p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
          {p.is_active ? "Active" : "Archived"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (p) => (
        <div className="flex justify-end gap-1">
          {p.requires_acknowledgement && p.acknowledged < p.applicable && (
            <Button variant="ghost" onClick={() => toast.success(`Reminder sent for ${p.name}`)}>
              Remind
            </Button>
          )}
          <Button variant="ghost" onClick={() => toast.success(`${p.name} opened`)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <SettingsPage
      title="Policy Setup"
      description="Versioned policy documents, who they apply to, and who has acknowledged them."
      actions={
        <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
          Add Policy
        </Button>
      }
    >
      <Card title="Policies" bodyClassName="p-4">
        <DataTable columns={columns} rows={POLICIES} getKey={(p) => p.id} empty="No policies published" dense />
        <p className="mt-3 text-xs text-gray-500">
          Publishing a new version resets acknowledgement — otherwise everyone stays &ldquo;signed
          off&rdquo; on a document they never read.
        </p>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Policy"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Policy published");
                setAddOpen(false);
              }}
            >
              Publish
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Policy Name" required>
            <Input placeholder="e.g. Remote Work Policy" />
          </FormField>
          <FormField label="Version" required>
            <Input placeholder="e.g. v1.0" />
          </FormField>
          <FormField label="Effective From" required>
            <Input type="date" />
          </FormField>
          <FormField label="Applies To" required>
            <Select value={scope} onChange={(e) => setScope(e.target.value as Policy["scope"])}>
              <option value="organization">Whole organisation</option>
              <option value="branch">Branch</option>
              <option value="department">Department</option>
              <option value="employment_type">Employment type</option>
            </Select>
          </FormField>
          {scope !== "organization" && (
            <FormField label={titleCase(scope)} required span>
              <Select defaultValue="">
                <option value="">Select</option>
                {scopeOptions.map((o) => (
                  <option key={o.id}>{o.name}</option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField label="Document" required span>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-6 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600"
            >
              <Upload size={15} />
              Upload PDF
            </button>
          </FormField>
          <FormField
            label="Requires acknowledgement"
            span
            hint="Employees are prompted until they acknowledge"
          >
            <div className="pt-1">
              <Toggle checked={requiresAck} onChange={setRequiresAck} label="Requires acknowledgement" />
            </div>
          </FormField>
        </FormGrid>
      </Modal>
    </SettingsPage>
  );
}
