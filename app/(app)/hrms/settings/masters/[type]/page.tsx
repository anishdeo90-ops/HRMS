"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { masterBySlug } from "@/lib/hrms/masters";
import { EMPTY } from "@/lib/hrms/format";
import type { BusinessUnit, LookupItem } from "@/lib/hrms/types";

type Option = { id: string; name: string; parent_id?: string };
type Options = {
  business_units?: Option[];
  departments?: Option[];
  employees?: Option[];
};

const BACKEND_TYPES = new Set([
  "branch",
  "business-unit",
  "department",
  "sub-department",
  "designation",
  "employment-type",
  "function-role",
  "announcement-category",
  "expense-type",
]);

/**
 * One screen for every flat organisation master.
 *
 * The eleven masters under `Settings → Organization Structure` differ only in
 * their label, whether they carry a code, and what they hang off — so they share
 * this page rather than eleven copies that drift apart.
 */
export default function MasterPage() {
  const params = useParams<{ type: string }>();
  const selectedMaster = masterBySlug(params.type);
  if (!selectedMaster) {
    notFound();
    return null;
  }
  const master = selectedMaster!;

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<LookupItem | null>(null);
  const [rows, setRows] = useState<LookupItem[]>(master.items);
  const [options, setOptions] = useState<Options>({});
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [parentId, setParentId] = useState("");
  const [headId, setHeadId] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const backendEnabled = BACKEND_TYPES.has(params.type);

  useEffect(() => {
    let alive = true;
    if (!backendEnabled) {
      setRows(master.items);
      return;
    }
    Promise.all([
      fetch(`/api/hrms/masters/${params.type}`).then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Unable to load master rows");
        return json.data ?? [];
      }),
      fetch("/api/hrms/options").then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Unable to load HRMS options");
        return json.data ?? {};
      }),
    ])
      .then(([masterRows, optionRows]) => {
        if (!alive) return;
        setRows(masterRows);
        setOptions(optionRows);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load master rows"));
    return () => {
      alive = false;
    };
  }, [backendEnabled, master.items, params.type]);

  const parentOptions = useMemo(() => {
    if (params.type === "department") return options.business_units ?? [];
    if (params.type === "sub-department") return (options.departments ?? []).filter((d) => !d.parent_id);
    return master.parentOptions ?? [];
  }, [master.parentOptions, options.business_units, options.departments, params.type]);

  function openForm(item?: LookupItem) {
    setEditing(item ?? null);
    setName(item?.name ?? "");
    setCode(item?.code ?? "");
    setParentId(item?.parent_id ?? "");
    setHeadId((item as BusinessUnit | undefined)?.head_employee_id ?? "");
    setDescription(item?.description ?? "");
    setActive(item?.is_active ?? true);
    setAddOpen(true);
  }

  async function saveMaster() {
    if (!backendEnabled) {
      toast.error(`${master.label} is not wired to the backend yet`);
      return;
    }
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hrms/masters/${params.type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          name,
          code,
          parent_id: parentId,
          head_employee_id: headId,
          description,
          is_active: active,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `${master.label} save failed`);
      setRows((prev) => {
        const next = json.data as LookupItem;
        return prev.some((row) => row.id === next.id)
          ? prev.map((row) => (row.id === next.id ? next : row))
          : [...prev, next];
      });
      toast.success(`${master.label} saved`);
      setAddOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${master.label} save failed`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: LookupItem) {
    if (!backendEnabled) {
      toast.error(`${master.label} status is not wired to the backend yet`);
      return;
    }
    const nextActive = !item.is_active;
    const res = await fetch(`/api/hrms/masters/${params.type}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_active: nextActive }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Status update failed");
      return;
    }
    setRows((prev) => prev.map((row) => (row.id === item.id ? json.data : row)));
    toast.success(`${item.name} ${nextActive ? "reactivated" : "deactivated"}`);
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((i) => {
      if (!showInactive && !i.is_active) return false;
      if (!q) return true;
      return [i.name, i.code, i.parent_name].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, showInactive]);

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
          <Button variant="ghost" onClick={() => openForm(i)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            onClick={() => toggleActive(i)}
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
          <Button icon={Plus} variant="primary" onClick={() => openForm()}>
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
          rows={filteredRows}
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
        title={`${editing ? "Edit" : "Add"} ${master.label}`}
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!name.trim() || saving}
              onClick={saveMaster}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Name" required span={!master.hasCode}>
            <Input placeholder={`${master.label} name`} value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          {master.hasCode && (
            <FormField label="Code" hint="Short identifier used in exports and reports">
              <Input placeholder="e.g. MUM" value={code} onChange={(e) => setCode(e.target.value)} />
            </FormField>
          )}
          {master.parentLabel && (
            <FormField label={master.parentLabel} required span>
              <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">Select</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
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
              <Select value={headId} onChange={(e) => setHeadId(e.target.value)}>
                <option value="">Select</option>
                {(options.employees ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </Select>
            </FormField>
          )}
          {master.hasDescription && (
            <FormField label="Description" span>
              <Textarea placeholder="What this is used for" value={description} onChange={(e) => setDescription(e.target.value)} />
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
