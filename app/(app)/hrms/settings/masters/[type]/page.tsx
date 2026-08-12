"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, Plus } from "lucide-react";
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
  Textarea,
  Toggle,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_EMPLOYEES } from "@/lib/hrms/demo-data";
import { masterBySlug } from "@/lib/hrms/masters";
import { EMPTY } from "@/lib/hrms/format";
import type { BusinessUnit, LookupItem } from "@/lib/hrms/types";

/**
 * One screen for every flat organisation master.
 *
 * The eleven masters under `Settings → Organization Structure` differ only in
 * their label, whether they carry a code, and what they hang off — so they share
 * this page rather than eleven copies that drift apart.
 */
export default function MasterPage() {
  const params = useParams<{ type: string }>();
  const master = masterBySlug(params.type);
  if (!master) notFound();

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [active, setActive] = useState(true);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return master.items.filter((i) => {
      if (!showInactive && !i.is_active) return false;
      if (!q) return true;
      return [i.name, i.code, i.parent_name].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [master, search, showInactive]);

  const columns: Column<LookupItem>[] = [
    {
      key: "name",
      header: master.label,
      render: (i) => (
        <span className={i.is_active ? "font-medium text-gray-900" : "text-gray-400 line-through"}>
          {i.name}
        </span>
      ),
    },
    ...(master.hasCode
      ? [{ key: "code", header: "Code", render: (i: LookupItem) => i.code ?? EMPTY } as Column<LookupItem>]
      : []),
    ...(master.parentLabel
      ? [
          {
            key: "parent",
            header: master.parentLabel,
            render: (i: LookupItem) => i.parent_name ?? EMPTY,
          } as Column<LookupItem>,
        ]
      : []),
    ...(master.hasHead
      ? [
          {
            key: "head",
            header: "Head",
            render: (i: LookupItem) => (i as BusinessUnit).head_name ?? EMPTY,
          } as Column<LookupItem>,
        ]
      : []),
    ...(master.hasDescription
      ? [
          {
            key: "description",
            header: "Description",
            render: (i: LookupItem) => i.description ?? EMPTY,
          } as Column<LookupItem>,
        ]
      : []),
    {
      key: "employees",
      header: "Employees",
      align: "right",
      // `—` rather than 0, so "not counted" and "nobody" stay distinguishable.
      render: (i) => (i.employee_count ? i.employee_count : EMPTY),
    },
    {
      key: "status",
      header: "Status",
      render: (i) => (
        <Badge tone={i.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
          {i.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (i) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" onClick={() => toast.success(`${i.name} opened`)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              toast.success(`${i.name} ${i.is_active ? "deactivated" : "reactivated"}`)
            }
          >
            {i.is_active ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Link
        href="/hrms/settings"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600"
      >
        <ArrowLeft size={14} /> Back to settings
      </Link>

      <Card
        title={master.plural}
        subtitle={master.description}
        bodyClassName="p-4"
        actions={
          <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
            Add {master.label}
          </Button>
        }
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder={`Search ${master.plural.toLowerCase()}`}
          onReset={() => {
            setSearch("");
            setShowInactive(true);
          }}
          onExport={() => {}}
        >
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <Toggle checked={showInactive} onChange={setShowInactive} label="Show inactive" />
            Show inactive
          </label>
        </Toolbar>

        <DataTable
          columns={columns}
          rows={rows}
          getKey={(i) => i.id}
          empty={`No ${master.plural.toLowerCase()} defined`}
          dense
        />

        <p className="mt-3 text-xs text-gray-500">
          Rows are deactivated rather than deleted — historic records still point at them, and a
          deleted master turns every old row into a dangling reference.
        </p>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`Add ${master.label}`}
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success(`${master.label} added`);
                setAddOpen(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Name" required span={!master.hasCode}>
            <Input placeholder={`${master.label} name`} />
          </FormField>
          {master.hasCode && (
            <FormField label="Code" hint="Short identifier used in exports and reports">
              <Input placeholder="e.g. MUM" />
            </FormField>
          )}
          {master.parentLabel && (
            <FormField label={master.parentLabel} required span>
              <Select defaultValue="">
                <option value="">Select</option>
                {(master.parentOptions ?? []).map((p) => (
                  <option key={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>
          )}
          {master.hasHead && (
            <FormField
              label="Head"
              span
              hint="Approvals routed to the business head resolve to this person"
            >
              <Select defaultValue="">
                <option value="">Select</option>
                {DEMO_EMPLOYEES.filter((e) => e.status !== "separated").map((e) => (
                  <option key={e.id}>{e.name}</option>
                ))}
              </Select>
            </FormField>
          )}
          {master.hasDescription && (
            <FormField label="Description" span>
              <Textarea placeholder="What this is used for" />
            </FormField>
          )}
          <FormField label="Active" span>
            <div className="pt-1">
              <Toggle checked={active} onChange={setActive} label="Active" />
            </div>
          </FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
