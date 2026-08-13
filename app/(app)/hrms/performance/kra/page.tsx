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
  SubTabs,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { saveHrmsData, useHrmsData } from "@/lib/hrms/client-api";
import { EMPTY, fmtDate, fmtPercent } from "@/lib/hrms/format";
import type { Kra } from "@/lib/hrms/types";

/**
 * `docs/hrms/13-performance-review.md §3` — My KRAs and the KRA Master.
 *
 * KRAs hang off the designation, so the master is the definition and "My KRAs"
 * is the assignment. `KRA Code` is auto-generated like every other code in the
 * product.
 */
export default function KraPage() {
  const [view, setView] = useState<"mine" | "master">("mine");
  const [search, setSearch] = useState("");
  const [designation, setDesignation] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [kras, reload] = useHrmsData<Kra[]>("/api/hrms/performance/kra", []);
  const [options] = useHrmsData<{ designations: { id: string; name: string }[] }>("/api/hrms/options", { designations: [] });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kras.filter((k) => {
      if (designation && k.designation !== designation) return false;
      if (!q) return true;
      return [k.kpi_name, k.kra_code, k.measurement].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [kras, view, search, designation]);

  const totalWeightage = rows.reduce((s, k) => s + k.weightage, 0);

  const columns: Column<Kra>[] = [
    { key: "code", header: "KRA Code", render: (k) => <span className="font-medium text-gray-900">{k.kra_code}</span> },
    { key: "kpi", header: "KPI Name", render: (k) => k.kpi_name },
    { key: "measurement", header: "Measurement", render: (k) => k.measurement },
    { key: "weightage", header: "Weightage", align: "right", render: (k) => fmtPercent(k.weightage) },
    {
      key: "score",
      header: "Score",
      align: "center",
      // `—` when unrated, never a 0 that reads as a bad score.
      render: (k) =>
        k.score == null ? (
          <span className="text-gray-300">{EMPTY}</span>
        ) : (
          <Badge tone={k.score >= 4 ? "bg-green-100 text-green-700" : k.score >= 3 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}>
            {k.score} / 5
          </Badge>
        ),
    },
    ...(view === "master"
      ? [{ key: "designation", header: "Designation", render: (k: Kra) => k.designation ?? EMPTY } as Column<Kra>]
      : []),
    { key: "assigned", header: "Assigned Date", render: (k) => fmtDate(k.assigned_date) },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (k) => (
        <Button variant="ghost" disabled>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="KRA"
      subtitle={`Weightage across these ${rows.length === 1 ? "KRA" : "KRAs"} totals ${fmtPercent(totalWeightage)}`}
      bodyClassName="p-4"
      actions={
        view === "master" ? (
          <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
            Add KRA
          </Button>
        ) : undefined
      }
    >
      <SubTabs
        tabs={[
          { key: "mine", label: "My KRAs", count: kras.length },
          { key: "master", label: "KRA Master", count: kras.length },
        ]}
        value={view}
        onChange={setView}
      />

      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search KPI or code"
        onReset={() => {
          setSearch("");
          setDesignation("");
        }}
        onExport={() => {}}
      >
        {view === "master" && (
          <select
            aria-label="Designation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700"
          >
            <option value="">All designations</option>
            {options.designations.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </Toolbar>

      {totalWeightage !== 100 && rows.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Weightage totals {fmtPercent(totalWeightage)}, not 100%. Scores will not normalise
          correctly until this balances.
        </div>
      )}

      <DataTable columns={columns} rows={rows} getKey={(k) => k.id} empty="No KRAs defined" dense />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add KRA"
        subtitle="Defined against a designation, then assigned to everyone holding it"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                await saveHrmsData("/api/hrms/performance/kra", {
                  kpi_name: "New KPI",
                  measurement: "Rating",
                  weightage: 20,
                  designation: options.designations[0]?.name,
                });
                await reload();
                toast.success("KRA added");
                setAddOpen(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="KRA Code" hint="Auto-generated">
            <Input placeholder="Auto-generated" disabled />
          </FormField>
          <FormField label="Designation" required>
            <Select defaultValue="">
              <option value="">Select</option>
              {options.designations.map((d) => (
                <option key={d.id}>{d.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="KPI Name" required span>
            <Input placeholder="e.g. Offer-to-join ratio" />
          </FormField>
          <FormField label="Measurement" required hint="How the KPI is counted">
            <Input placeholder="e.g. Percentage" />
          </FormField>
          <FormField label="Weightage %" required>
            <Input type="number" min={1} max={100} defaultValue={20} />
          </FormField>
        </FormGrid>
      </Modal>
    </Card>
  );
}
