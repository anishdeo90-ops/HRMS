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
import { EMPTY, fmtDate, todayISO } from "@/lib/hrms/format";
import { titleCase } from "@/lib/hrms/status";
import type { Asset, Employee } from "@/lib/hrms/types";
import { useApiData } from "@/lib/hrms/use-api-data";

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
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const assets = useApiData<Asset[]>("/api/hrms/assets", []);
  const employees = useApiData<Employee[]>("/api/hrms/employees", []);

  const categories = useMemo(
    () => Array.from(new Set(assets.map((a) => a.category))),
    [assets]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (category && a.category !== category) return false;
      if (status && a.status !== status) return false;
      if (!q) return true;
      return [a.asset_code, a.make, a.model, a.serial_number, a.allocated_to].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [assets, search, category, status]);

  const stats = useMemo(
    () => ({
      total: assets.length,
      allocated: assets.filter((a) => a.status === "allocated").length,
      inStock: assets.filter((a) => a.status === "in_stock").length,
      inRepair: assets.filter((a) => a.status === "in_repair").length,
    }),
    [assets]
  );

  async function addAsset() {
    const res = await fetch("/api/hrms/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_code: `AST-${Date.now().toString().slice(-6)}`, category: "Laptop", make: "Unspecified", status: "in_stock" }),
    });
    if (!res.ok) return toast.error("Could not add asset");
    toast.success("Asset added to inventory");
    setAddOpen(false);
  }

  async function allocate() {
    if (!allocateFor || !selectedEmployee) return toast.error("Select an employee");
    const res = await fetch("/api/hrms/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "allocate", asset_id: allocateFor.id, employee_id: selectedEmployee, allocated_on: todayISO() }),
    });
    if (!res.ok) return toast.error("Could not allocate asset");
    toast.success(`${allocateFor.asset_code} allocated`);
    setAllocateFor(null);
  }

  async function returnAsset(asset: Asset) {
    const res = await fetch("/api/hrms/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_id: asset.id }),
    });
    if (!res.ok) return toast.error("Could not return asset");
    toast.success(`${asset.asset_code} returned to stock`);
  }

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
          <Button variant="ghost" onClick={() => returnAsset(a)}>
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
              onClick={addAsset}
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
              onClick={allocate}
            >
              Allocate
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Allocate To" required>
            <Select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
              <option value="">Select an employee</option>
              {employees.filter((e) => e.status !== "separated").map((e) => (
                <option key={e.id} value={e.id}>
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
