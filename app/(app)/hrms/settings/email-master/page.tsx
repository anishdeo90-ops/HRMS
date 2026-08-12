"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  FormField,
  FormGrid,
  Input,
  Modal,
  Textarea,
  Toggle,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { DEMO_EMAIL_TEMPLATES } from "@/lib/hrms/demo-data";
import type { EmailTemplateMaster } from "@/lib/hrms/types";

/**
 * `docs/hrms/08-masters.md §1`.
 *
 * Templates are bound to an **event key**, not picked by a human at send time —
 * that is what makes notifications reproducible and testable.
 */

const MERGE_FIELDS = [
  "{{employee_name}}",
  "{{employee_code}}",
  "{{manager_name}}",
  "{{request_code}}",
  "{{from_date}}",
  "{{to_date}}",
  "{{company_name}}",
];

export default function EmailMasterPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [active, setActive] = useState(true);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_EMAIL_TEMPLATES.filter(
      (t) => !q || [t.name, t.event_key, t.subject].some((f) => f.toLowerCase().includes(q))
    );
  }, [search]);

  const columns: Column<EmailTemplateMaster>[] = [
    { key: "name", header: "Template", render: (t) => <span className="font-medium text-gray-900">{t.name}</span> },
    {
      key: "event",
      header: "Event",
      render: (t) => <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{t.event_key}</code>,
    },
    { key: "subject", header: "Subject", render: (t) => t.subject },
    {
      key: "status",
      header: "Status",
      render: (t) => (
        <Badge tone={t.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
          {t.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (t) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" onClick={() => toast.success(`Test email sent for ${t.name}`)}>
            Send Test
          </Button>
          <Button variant="ghost" onClick={() => toast.success(`${t.name} opened`)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <SettingsPage
      title="Email Master"
      description="Templates fired by system events. Each is bound to an event key rather than chosen by hand."
      actions={
        <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
          Add Template
        </Button>
      }
    >
      <Card title="Templates" bodyClassName="p-4">
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search template, event or subject"
          onReset={() => setSearch("")}
          onExport={() => {}}
        />
        <DataTable columns={columns} rows={rows} getKey={(t) => t.id} empty="No email templates" dense />
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Email Template"
        width="max-w-3xl"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Template saved");
                setAddOpen(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Template Name" required>
            <Input placeholder="e.g. Probation confirmation" />
          </FormField>
          <FormField label="Event Key" required hint="The system event that fires this template">
            <Input placeholder="e.g. employee.confirmed" />
          </FormField>
          <FormField label="Subject" required span>
            <Input placeholder="e.g. Congratulations {{employee_name}}, you are confirmed" />
          </FormField>
          <FormField label="Body" required span>
            <Textarea rows={8} placeholder="The email body. Merge fields are substituted at send time." />
          </FormField>
        </FormGrid>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-gray-600">Available merge fields</p>
          <div className="flex flex-wrap gap-1.5">
            {MERGE_FIELDS.map((f) => (
              <code
                key={f}
                className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700"
              >
                {f}
              </code>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <FormField label="Active">
            <div className="pt-1">
              <Toggle checked={active} onChange={setActive} label="Active" />
            </div>
          </FormField>
        </div>
      </Modal>
    </SettingsPage>
  );
}
