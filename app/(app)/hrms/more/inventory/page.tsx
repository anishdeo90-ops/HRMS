"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Laptop, Plus } from "lucide-react";
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
  StatCard,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_ASSETS, DEMO_EMPLOYEES } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, todayISO } from "@/lib/hrms/format";
import { titleCase } from "@/lib/hrms/status";
import type { Asset } from "@/lib/hrms/types";

/**
 * `docs/hrms/15-more-module.md §4`.
 *
 * The inventory behind the employee record's Assets tab, and the source the
 * de-allocation cron reads when someone's last working day passes.
 */

const ASSET_TONE: Record<Asset["status"], string> = {
  in_stock: "bg-green-100 text-green-700",
  allocated: "bg-brand-100 text-brand-700",
  in_repair: "bg-amber-100 text-amber-800",
  retired: "bg-gray-100 text-gray-500",
};

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [allocateFor, setAllocateFor] = useState<Asset | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(DEMO_ASSETS.map((a) => a.category))),
    []
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_ASSETS.filter((a) => {
      if (category && a.category !== category) return false;
      if (status && a.status !== status) return false;
      if (!q) return true;
      return [a.asset_code, a.make, a.model, a.serial_number, a.allocated_to].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, category, status]);

  const stats = useMemo(
    () => ({
      total: DEMO_ASSETS.length,
      allocated: DEMO_ASSETS.filter((a) => a.status === "allocated").length,
      inStock: DEMO_ASSETS.filter((a) => a.status === "in_stock").length,
      inRepair: DEMO_ASSETS.filter((a) => a.status === "in_repair").length,
    }),
    []
  );

  const columns: Column<Asset>[] = [
    { key: "code", header: "Asset Code", render: (a) => <span className="font-medium text-gray-900">{a.asset_code}</span> },
    { key: "category", header: "Category", render: (a) => a.category },
    { key: "make", header: "Make", render: (a) => a.make ?? EMPTY },
    { key: "model", header: "Model", render: (a) => a.model ?? EMPTY },
    { key: "serial", header: "Serial Number", render: (a) => a.serial_number ?? EMPTY },
    { key: "purchase", header: "Purchase Date", render: (a) => fmtDate(a.purchase_date) },
    { key: "allocated_to", header: "Allocated To", render: (a) => a.allocated_to ?? EMPTY },
    { key: "allocated_on", header: "Allocated On", render: (a) => fmtDate(a.allocated_on) },
    {
      key: "status",
      header: "Status",
      render: (a) => <Badge tone={ASSET_TONE[a.status]}>{titleCase(a.status)}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (a) =>
        a.status === "in_stock" ? (
          <Button variant="primary" onClick={() => setAllocateFor(a)}>
            Allocate
          </Button>
        ) : a.status === "allocated" ? (
          <Button variant="ghost" onClick={() => toast.success(`${a.asset_code} returned to stock`)}>
            De-allocate
          </Button>
        ) : (
          <span className="text-gray-300">{EMPTY}</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Assets" value={stats.total} icon={Laptop} />
        <StatCard label="Allocated" value={stats.allocated} tint="bg-brand-50 text-brand-600" />
        <StatCard label="In Stock" value={stats.inStock} tint="bg-green-50 text-green-600" />
        <StatCard label="In Repair" value={stats.inRepair} tint="bg-amber-50 text-amber-600" />
      </div>

      <Card
        title="Inventory"
        subtitle="Allocations show on the employee record's Assets tab"
        bodyClassName="p-4"
        actions={
          <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
            Add Asset
          </Button>
        }
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search code, make, model, serial or holder"
          onReset={() => {
            setSearch("");
            setCategory("");
            setStatus("");
          }}
          onExport={() => {}}
        >
          <SelectFilter
            label="All Categories"
            value={category}
            onChange={setCategory}
            options={categories.map((c) => ({ value: c, label: c }))}
          />
          <SelectFilter
            label="All Statuses"
            value={status}
            onChange={setStatus}
            options={Object.keys(ASSET_TONE).map((s) => ({ value: s, label: titleCase(s) }))}
          />
        </Toolbar>

        <DataTable columns={columns} rows={rows} getKey={(a) => a.id} empty="No assets recorded" dense />
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Asset"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Asset added to inventory");
                setAddOpen(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Asset Code" hint="Auto-generated">
            <Input placeholder="Auto-generated" disabled />
          </FormField>
          <FormField label="Category" required>
            <Select defaultValue="">
              <option value="">Select</option>
              {["Laptop", "Desktop", "Monitor", "Mobile", "Access Card", "Furniture", "Other"].map(
                (c) => (
                  <option key={c}>{c}</option>
                )
              )}
            </Select>
          </FormField>
          <FormField label="Make" required>
            <Input placeholder="e.g. Dell" />
          </FormField>
          <FormField label="Model" required>
            <Input placeholder="e.g. Latitude 5440" />
          </FormField>
          <FormField label="Serial Number" required>
            <Input placeholder="Device serial" />
          </FormField>
          <FormField label="Purchase Date">
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
        </FormGrid>
      </Modal>

      <Modal
        open={!!allocateFor}
        onClose={() => setAllocateFor(null)}
        title="Allocate Asset"
        subtitle={allocateFor ? `${allocateFor.asset_code} — ${allocateFor.make} ${allocateFor.model}` : ""}
        footer={
          <>
            <Button onClick={() => setAllocateFor(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success(`${allocateFor?.asset_code} allocated`);
                setAllocateFor(null);
              }}
            >
              Allocate
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Allocate To" required>
            <Select defaultValue="">
              <option value="">Select an employee</option>
              {DEMO_EMPLOYEES.filter((e) => e.status !== "separated").map((e) => (
                <option key={e.id}>
                  {e.employee_code} — {e.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Allocation Date" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="Condition on Issue" span>
            <Select defaultValue="good">
              {["new", "good", "fair", "poor"].map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </Select>
          </FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
