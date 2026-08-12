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
  Select,
  Toggle,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_DOCUMENT_TYPES, DEMO_ONBOARDING_FORMS } from "@/lib/hrms/demo-data";
import type { OnboardingFormMaster } from "@/lib/hrms/types";

/**
 * `docs/hrms/14-onboarding.md §2.2`.
 *
 * This is where the document checklist is actually configured — a per-document
 * toggle against a form, which is then chosen at initiation. It answers the
 * question left open since batch 8: the Document Master is the catalogue, this
 * is the checklist.
 */
export default function OnboardingFormMasterPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DEMO_DOCUMENT_TYPES.map((d) => [d.id, d.is_mandatory]))
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_ONBOARDING_FORMS.filter(
      (f) => !q || [f.form_name, f.applies_to].some((x) => x.toLowerCase().includes(q))
    );
  }, [search]);

  const selectedCount = Object.values(enabled).filter(Boolean).length;

  const columns: Column<OnboardingFormMaster>[] = [
    { key: "name", header: "Form Name", render: (f) => <span className="font-medium text-gray-900">{f.form_name}</span> },
    { key: "applies", header: "Applies To", render: (f) => f.applies_to },
    { key: "sections", header: "Sections", align: "right", render: (f) => f.sections },
    { key: "docs", header: "Documents Required", align: "right", render: (f) => f.documents_required },
    {
      key: "active",
      header: "Status",
      render: (f) => (
        <Badge tone={f.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
          {f.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (f) => (
        <Button variant="ghost" onClick={() => toast.success(`${f.form_name} opened`)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Onboarding Form Master"
      subtitle="Each form carries its own document checklist, picked at initiation"
      bodyClassName="p-4"
      actions={
        <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
          Create Form
        </Button>
      }
    >
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search form name"
        onReset={() => setSearch("")}
        onExport={() => {}}
      />

      <DataTable columns={columns} rows={rows} getKey={(f) => f.id} empty="No onboarding forms" dense />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Create Onboarding Form"
        subtitle={`${selectedCount} of ${DEMO_DOCUMENT_TYPES.length} documents selected`}
        width="max-w-3xl"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Onboarding form created");
                setAddOpen(false);
              }}
            >
              Save Form
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Form Name" required>
            <Input placeholder="e.g. Field Staff Onboarding" />
          </FormField>
          <FormField label="Applies To" required>
            <Select defaultValue="">
              <option value="">Select</option>
              <option>Permanent · Corporate</option>
              <option>Contract · Facility Services</option>
              <option>Intern</option>
              <option>Consultant</option>
            </Select>
          </FormField>
        </FormGrid>

        <div className="mt-6">
          <h3 className="mb-1 text-sm font-semibold text-gray-800">Document Checklist</h3>
          <p className="mb-3 text-xs text-gray-500">
            Toggle which documents this form asks a candidate to upload.
          </p>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {DEMO_DOCUMENT_TYPES.filter((d) => d.is_active).map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">{d.name}</p>
                  <p className="text-xs text-gray-500">
                    {d.category}
                    {d.requires_expiry ? " · expiry tracked" : ""}
                  </p>
                </div>
                {d.is_mandatory && <Badge tone="bg-brand-50 text-brand-600">Usually required</Badge>}
                <Toggle
                  checked={!!enabled[d.id]}
                  onChange={(v) => setEnabled((prev) => ({ ...prev, [d.id]: v }))}
                  label={d.name}
                />
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </Card>
  );
}
