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
  SelectFilter,
  Toggle,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import type { DocumentTypeMaster } from "@/lib/hrms/types";
import { useApiData } from "@/lib/hrms/use-api-data";

/**
 * `docs/hrms/14-onboarding.md §2` / `08-masters.md §2`.
 *
 * The catalogue of document types. Which of them a given hire must supply is set
 * per onboarding form, not here — that was the open question closed in §2.2.
 */
export default function DocumentMasterPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [requiresExpiry, setRequiresExpiry] = useState(false);
  const [mandatory, setMandatory] = useState(true);
  const documents = useApiData<DocumentTypeMaster[]>("/api/hrms/onboarding/documents", []);

  async function addDocumentType() {
    const res = await fetch("/api/hrms/onboarding/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Document", category: "General", applies_to: "All", is_mandatory: mandatory, requires_expiry: requiresExpiry }),
    });
    if (!res.ok) return toast.error("Could not add document type");
    toast.success("Document type added");
    setAddOpen(false);
  }

  const categories = useMemo(
    () => Array.from(new Set(documents.map((d) => d.category))),
    [documents]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (category && d.category !== category) return false;
      if (!q) return true;
      return [d.name, d.category, d.applies_to].some((f) => f.toLowerCase().includes(q));
    });
  }, [documents, search, category]);

  const columns: Column<DocumentTypeMaster>[] = [
    { key: "name", header: "Document", render: (d) => <span className="font-medium text-gray-900">{d.name}</span> },
    { key: "category", header: "Category", render: (d) => d.category },
    { key: "applies", header: "Applies To", render: (d) => d.applies_to },
    {
      key: "mandatory",
      header: "Mandatory",
      align: "center",
      render: (d) =>
        d.is_mandatory ? (
          <Badge tone="bg-brand-50 text-brand-600">Required</Badge>
        ) : (
          <Badge tone="bg-gray-100 text-gray-500">Optional</Badge>
        ),
    },
    {
      key: "expiry",
      header: "Tracks Expiry",
      align: "center",
      render: (d) =>
        d.requires_expiry ? (
          <Badge tone="bg-amber-100 text-amber-800">Yes</Badge>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: "active",
      header: "Status",
      render: (d) => (
        <Badge tone={d.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
          {d.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <Card
      title="Document Master"
      subtitle="The catalogue. Which documents a hire must supply is set per onboarding form."
      bodyClassName="p-4"
      actions={
        <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
          Add Document Type
        </Button>
      }
    >
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search document or category"
        onReset={() => {
          setSearch("");
          setCategory("");
        }}
        onExport={() => {}}
      >
        <SelectFilter
          label="All Categories"
          value={category}
          onChange={setCategory}
          options={categories.map((c) => ({ value: c, label: c }))}
        />
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(d) => d.id} empty="No document types" dense />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Document Type"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={addDocumentType}
            >
              Save
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Document Name" required span>
            <Input placeholder="e.g. Police Verification" />
          </FormField>
          <FormField label="Category" required>
            <Select defaultValue="">
              <option value="">Select</option>
              {["Identity", "Banking", "Education", "Employment", "Compliance", "Other"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Applies To" required>
            <Select defaultValue="">
              <option value="">All employees</option>
              <option>Permanent</option>
              <option>Contract</option>
              <option>Intern</option>
              <option>Experienced hires</option>
              <option>Facility Services</option>
            </Select>
          </FormField>
          <FormField label="Mandatory" hint="Blocks joining until verified">
            <div className="pt-1">
              <Toggle checked={mandatory} onChange={setMandatory} label="Mandatory" />
            </div>
          </FormField>
          <FormField label="Tracks Expiry" hint="Feeds the document-expiry alert cron">
            <div className="pt-1">
              <Toggle checked={requiresExpiry} onChange={setRequiresExpiry} label="Tracks expiry" />
            </div>
          </FormField>
        </FormGrid>
      </Modal>
    </Card>
  );
}
