"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CalendarRange, Copy, Info } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  FormField,
  FormGrid,
  Input,
  Modal,
  Select,
  SelectFilter,
  Toolbar,
} from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { DEMO_BRANCHES, DEMO_DEPARTMENTS, DEMO_EMPLOYEES, DEMO_SHIFTS } from "@/lib/hrms/demo-data";
import { fmtDate, initials, todayISO } from "@/lib/hrms/format";
import { cn } from "@/lib/utils";

/**
 * `docs/hrms/09-org-settings.md §1`.
 *
 * Date-level shift assignment. The resolution chain the day register follows is
 * **roster entry → employee default shift → shift week-off configuration**, which
 * is also where an approved week-off swap lands — a swap has to be recorded
 * against a date, and the shift definition is org-level.
 */

const SHIFT_TONE: Record<string, string> = {
  "General Shift": "bg-brand-50 text-brand-700 border-brand-200",
  "Morning Shift": "bg-amber-50 text-amber-800 border-amber-200",
  "Evening Shift": "bg-slate-100 text-slate-700 border-slate-300",
  "Night Shift": "bg-gray-800 text-white border-gray-800",
  WO: "bg-gray-100 text-gray-400 border-gray-200",
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RosterPage() {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const diff = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d.toISOString().slice(0, 10);
  });
  const [branch, setBranch] = useState("");
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const days = useMemo(() => {
    const out: { iso: string; label: string; weekend: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      out.push({
        iso: d.toISOString().slice(0, 10),
        label: `${WEEKDAY_SHORT[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`,
        weekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }
    return out;
  }, [weekStart]);

  const employees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_EMPLOYEES.filter((e) => {
      if (e.status === "separated") return false;
      if (branch && e.branch !== branch) return false;
      if (department && e.department !== department) return false;
      if (!q) return true;
      return [e.name, e.employee_code].some((f) => String(f ?? "").toLowerCase().includes(q));
    });
  }, [search, branch, department]);

  /** Until the roster table exists, cells fall back to the employee's default shift. */
  function shiftFor(employeeIndex: number, dayIndex: number): string {
    const emp = employees[employeeIndex];
    const dflt = emp.shift_name ?? "General Shift";
    const weekend = days[dayIndex].weekend;
    if (dflt === "Night Shift") return dayIndex === 6 ? "WO" : dflt;
    if (dflt === "Morning Shift") return dayIndex === 6 ? "WO" : dflt;
    return weekend ? "WO" : dflt;
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }

  return (
    <SettingsPage
      title="Roster"
      description="Which shift each employee works on each date. Blank cells fall back to their default shift."
      actions={
        <>
          <Button icon={Copy} onClick={() => toast.success("Last week's roster copied forward")}>
            Copy Last Week
          </Button>
          <Button icon={CalendarRange} variant="primary" onClick={() => setBulkOpen(true)}>
            Bulk Assign
          </Button>
        </>
      }
    >
      <Card
        title={`Week of ${fmtDate(weekStart)}`}
        bodyClassName="p-4"
        actions={
          <div className="flex items-center gap-1">
            <Button onClick={() => shiftWeek(-1)}>Prev</Button>
            <Button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
                setWeekStart(d.toISOString().slice(0, 10));
              }}
            >
              This Week
            </Button>
            <Button onClick={() => shiftWeek(1)}>Next</Button>
          </div>
        }
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search employee or code"
          onReset={() => {
            setSearch("");
            setBranch("");
            setDepartment("");
          }}
          onExport={() => {}}
        >
          <SelectFilter
            label="All Branches"
            value={branch}
            onChange={setBranch}
            options={DEMO_BRANCHES.map((b) => ({ value: b.name, label: b.name }))}
          />
          <SelectFilter
            label="All Departments"
            value={department}
            onChange={setDepartment}
            options={DEMO_DEPARTMENTS.map((d) => ({ value: d.name, label: d.name }))}
          />
        </Toolbar>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-2.5 text-left font-semibold">
                  Employee
                </th>
                {days.map((d) => (
                  <th
                    key={d.iso}
                    className={cn(
                      "px-3 py-2.5 text-center font-semibold",
                      d.weekend && "bg-gray-100"
                    )}
                  >
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                    No employees match these filters
                  </td>
                </tr>
              ) : (
                employees.map((e, ei) => (
                  <tr key={e.id} className="border-t border-gray-100">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                          {initials(e.name)}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{e.name}</p>
                          <p className="text-xs text-gray-500">{e.employee_code}</p>
                        </div>
                      </div>
                    </td>
                    {days.map((d, di) => {
                      const shift = shiftFor(ei, di);
                      return (
                        <td key={d.iso} className={cn("px-2 py-2 text-center", d.weekend && "bg-gray-50/70")}>
                          <button
                            type="button"
                            onClick={() => toast.success(`${e.name} — ${fmtDate(d.iso)} reassigned`)}
                            className={cn(
                              "w-full rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80",
                              SHIFT_TONE[shift] ?? "border-gray-200 bg-white text-gray-600"
                            )}
                          >
                            {shift === "WO" ? "Week Off" : shift.replace(" Shift", "")}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Legend</span>
          {Object.keys(SHIFT_TONE).map((s) => (
            <span
              key={s}
              className={cn("rounded-lg border px-2 py-1 text-[11px] font-medium", SHIFT_TONE[s])}
            >
              {s === "WO" ? "Week Off" : s}
            </span>
          ))}
        </div>

        <p className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          An approved week-off swap writes into this roster, which is why date-level assignment
          lives here rather than on the shift definition.
        </p>
      </Card>

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Assign Shift"
        footer={
          <>
            <Button onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Roster updated");
                setBulkOpen(false);
              }}
            >
              Assign
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Shift" required>
            <Select defaultValue="">
              <option value="">Select</option>
              {DEMO_SHIFTS.filter((s) => s.is_active).map((s) => (
                <option key={s.id}>{s.name}</option>
              ))}
              <option>Week Off</option>
            </Select>
          </FormField>
          <FormField label="Apply To" required>
            <Select defaultValue="filtered">
              <option value="filtered">Employees matching current filters</option>
              <option value="branch">A whole branch</option>
              <option value="department">A whole department</option>
            </Select>
          </FormField>
          <FormField label="From Date" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="To Date" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="Overwrite existing entries" span>
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Entries created by an approved week-off swap are never overwritten — they came from a
              decision someone made.
            </div>
          </FormField>
        </FormGrid>
        <p className="mt-4 text-xs text-gray-500">
          {employees.length} {employees.length === 1 ? "employee matches" : "employees match"} the
          current filters.
        </p>
      </Modal>
    </SettingsPage>
  );
}
