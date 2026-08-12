"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Check, Plus, X } from "lucide-react";
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
  Textarea,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_CYCLES, DEMO_EMPLOYEES, DEMO_GOALS, DEMO_ME } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, fmtPercent, todayISO } from "@/lib/hrms/format";
import { requestTone, titleCase } from "@/lib/hrms/status";
import type { Goal } from "@/lib/hrms/types";

/**
 * `docs/hrms/13-performance-review.md §2` — My Goals, Team Goals, Goal Approval.
 *
 * Goal approval is the ninth request type, and it goes through the same engine
 * as leave rather than growing its own workflow.
 */
export default function GoalsPage() {
  const [view, setView] = useState<"mine" | "team" | "approval">("mine");
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_GOALS.filter((g) => {
      if (view === "mine" && g.employee_id !== DEMO_ME.id) return false;
      if (view === "approval" && g.status !== "pending") return false;
      if (cycle && g.cycle_name !== cycle) return false;
      if (!q) return true;
      return [g.title, g.employee_name, g.goal_code].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [view, search, cycle]);

  const columns: Column<Goal>[] = [
    { key: "code", header: "Goal Code", render: (g) => <span className="font-medium text-gray-900">{g.goal_code}</span> },
    {
      key: "title",
      header: "Goal",
      render: (g) => (
        <span className="block max-w-[280px] truncate" title={g.title}>
          {g.title}
        </span>
      ),
    },
    ...(view === "mine"
      ? []
      : [{ key: "employee", header: "Employee", render: (g: Goal) => g.employee_name } as Column<Goal>]),
    { key: "cycle", header: "Cycle", render: (g) => g.cycle_name ?? EMPTY },
    { key: "weightage", header: "Weightage", align: "right", render: (g) => fmtPercent(g.weightage) },
    { key: "target", header: "Target", render: (g) => g.target },
    { key: "achieved", header: "Achieved", render: (g) => g.achieved ?? EMPTY },
    {
      key: "progress",
      header: "Progress",
      render: (g) => (
        <div className="flex w-32 items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${g.progress_percent >= 75 ? "bg-green-500" : g.progress_percent >= 40 ? "bg-brand-500" : "bg-amber-400"}`}
              style={{ width: `${g.progress_percent}%` }}
            />
          </div>
          <span className="w-9 text-right text-xs text-gray-600">{g.progress_percent}%</span>
        </div>
      ),
    },
    { key: "due", header: "Due Date", render: (g) => fmtDate(g.due_date) },
    {
      key: "status",
      header: "Status",
      render: (g) => <Badge tone={requestTone(g.status)}>{titleCase(g.status)}</Badge>,
    },
    ...(view === "approval"
      ? [
          {
            key: "actions",
            header: "Actions",
            align: "right",
            render: (g: Goal) => (
              <div className="flex justify-end gap-1">
                <Button variant="success" icon={Check} onClick={() => toast.success(`${g.goal_code} approved`)}>
                  Approve
                </Button>
                <Button variant="danger" icon={X} onClick={() => toast.success(`${g.goal_code} rejected`)}>
                  Reject
                </Button>
              </div>
            ),
          } as Column<Goal>,
        ]
      : []),
  ];

  return (
    <Card
      title="Goals"
      subtitle="Weightages across a cycle should total 100% per employee"
      bodyClassName="p-4"
      actions={
        <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
          Add Goal
        </Button>
      }
    >
      <SubTabs
        tabs={[
          { key: "mine", label: "My Goals", count: DEMO_GOALS.filter((g) => g.employee_id === DEMO_ME.id).length },
          { key: "team", label: "Team Goals", count: DEMO_GOALS.length },
          { key: "approval", label: "Goal Approval", count: DEMO_GOALS.filter((g) => g.status === "pending").length },
        ]}
        value={view}
        onChange={(v) => {
          setView(v);
          setSelected([]);
        }}
      />

      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search goal or employee"
        onReset={() => {
          setSearch("");
          setCycle("");
        }}
        onExport={() => {}}
      >
        <select
          aria-label="Cycle"
          value={cycle}
          onChange={(e) => setCycle(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700"
        >
          <option value="">All cycles</option>
          {DEMO_CYCLES.map((c) => (
            <option key={c.id} value={c.cycle_name}>
              {c.cycle_name}
            </option>
          ))}
        </select>
      </Toolbar>

      {view === "approval" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="text-xs font-medium text-gray-500">
            {selected.length > 0 ? `${selected.length} selected` : "Select rows to act in bulk"}
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="success"
              icon={Check}
              disabled={selected.length === 0}
              onClick={() => {
                toast.success(`${selected.length} goals approved`);
                setSelected([]);
              }}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              icon={X}
              disabled={selected.length === 0}
              onClick={() => {
                toast.success(`${selected.length} goals rejected`);
                setSelected([]);
              }}
            >
              Reject
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getKey={(g) => g.id}
        selectable={view === "approval"}
        selected={selected}
        onSelectedChange={setSelected}
        empty={view === "approval" ? "No goals waiting for approval" : "No goals set"}
        dense
      />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Goal"
        subtitle="Goes to your reporting manager for approval before it counts"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Goal submitted for approval");
                setAddOpen(false);
              }}
            >
              Submit
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Goal Title" required span>
            <Input placeholder="e.g. Reduce time-to-fill to under 21 days" />
          </FormField>
          <FormField label="Employee" required>
            <Select defaultValue={DEMO_ME.name}>
              {DEMO_EMPLOYEES.filter((e) => e.status !== "separated").map((e) => (
                <option key={e.id}>{e.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Performance Cycle" required>
            <Select defaultValue="">
              <option value="">Select</option>
              {DEMO_CYCLES.filter((c) => c.status === "active").map((c) => (
                <option key={c.id}>{c.cycle_name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Weightage %" required hint="Must total 100% across the cycle">
            <Input type="number" min={1} max={100} defaultValue={25} />
          </FormField>
          <FormField label="Due Date" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="Target" required span hint="Measurable, so progress is not a matter of opinion">
            <Textarea placeholder="e.g. 40 permanent placements closed" />
          </FormField>
        </FormGrid>
      </Modal>
    </Card>
  );
}
