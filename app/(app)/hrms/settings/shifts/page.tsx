"use client";

import { useState } from "react";
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
  type Column,
} from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { saveHrmsData, useHrmsData } from "@/lib/hrms/client-api";
import { fmtDuration, fmtLimit } from "@/lib/hrms/format";
import { titleCase } from "@/lib/hrms/status";
import type { Shift } from "@/lib/hrms/types";

/**
 * `docs/hrms/12-advanced-settings-cron-holiday.md §1`.
 *
 * The shift is what the day register resolves against: its week-off
 * configuration decides which days come through as non-working, and its grace
 * and threshold values are what the penalty engine compares punches to.
 *
 * Durations are stored in minutes and formatted at render — the reference mixed
 * `Duration(hr.)` and `Break Duration (min)` on one row.
 */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ShiftsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [weekOffs, setWeekOffs] = useState<string[]>(["Saturday", "Sunday"]);
  const [active, setActive] = useState(true);
  const [mode, setMode] = useState<Shift["attendance_mode"]>("working_hours_only");
  const [shifts, reload] = useHrmsData<Shift[]>("/api/hrms/settings/shifts", []);

  const columns: Column<Shift>[] = [
    { key: "name", header: "Shift", render: (s) => <span className="font-medium text-gray-900">{s.name}</span> },
    { key: "code", header: "Code", render: (s) => s.code },
    { key: "timing", header: "Timing", render: (s) => `${s.start_time} — ${s.end_time}` },
    { key: "hours", header: "Working Hours", align: "right", render: (s) => `${s.working_hours} h` },
    { key: "break", header: "Break", align: "right", render: (s) => fmtDuration(s.break_minutes) },
    {
      key: "grace",
      header: "Grace In / Out",
      render: (s) => `${s.grace_in_minutes}m / ${s.grace_out_minutes}m`,
    },
    {
      key: "half",
      header: "Half Day After",
      align: "right",
      render: (s) => fmtLimit(s.half_day_after_minutes, "min"),
    },
    {
      key: "mode",
      header: "Attendance Mode",
      render: (s) => (
        <Badge
          tone={
            s.attendance_mode === "strict_shift_timing"
              ? "bg-amber-100 text-amber-800"
              : "bg-gray-100 text-gray-600"
          }
        >
          {titleCase(s.attendance_mode)}
        </Badge>
      ),
    },
    {
      key: "weekoff",
      header: "Week Offs",
      render: (s) => s.week_off_days.map((d) => d.slice(0, 3)).join(", "),
    },
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <Badge tone={s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
          {s.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (s) => (
        <Button variant="ghost" disabled>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <SettingsPage
      title="Work Hours & Shifts"
      description="Shift timings, grace periods, week-offs and the thresholds the penalty engine measures against."
      actions={
        <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
          Add Shift
        </Button>
      }
    >
      <div className="space-y-5">
        <Card title="Shifts" bodyClassName="p-4">
          <DataTable columns={columns} rows={shifts} getKey={(s) => s.id} empty="No shifts defined" dense />
          <p className="mt-3 text-xs text-gray-500">
            A night shift crossing midnight stays one row on its business day — punches may fall on
            the next calendar date without splitting the day in two.
          </p>
        </Card>

        <Card title="Penalty Rules" subtitle="What a late arrival or a short day costs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Trigger</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Threshold</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Allowance</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Deduction</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Payable Fraction</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { trigger: "Late in", threshold: "More than 15 min after shift start", allowance: "3 per month", deduction: "Half Day (Attendance)", fraction: "0.5" },
                  { trigger: "Early out", threshold: "More than 15 min before shift end", allowance: "3 per month", deduction: "Half Day (Attendance)", fraction: "0.5" },
                  { trigger: "Short duration", threshold: "Under 4 hours worked", allowance: "None", deduction: "Half Day (Attendance)", fraction: "0.5" },
                  { trigger: "No punch", threshold: "No in-punch recorded", allowance: "None", deduction: "Full Day (Attendance)", fraction: "0" },
                  { trigger: "Excess lates", threshold: "Beyond the monthly allowance", allowance: "—", deduction: "Deduct Leave Balance", fraction: "1" },
                ].map((r) => (
                  <tr key={r.trigger} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{r.trigger}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.threshold}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.allowance}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.deduction}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{r.fraction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            There is no Loss of Pay option here, and that is correct: LOP is what payroll derives
            from a stored payable fraction of 0. Each firing writes an itemised penalty row, so an
            employee can be shown which rule fired and why.
          </p>
        </Card>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Shift"
        width="max-w-3xl"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                await saveHrmsData("/api/hrms/settings/shifts", {
                  name: `Shift ${shifts.length + 1}`,
                  code: `S${shifts.length + 1}`,
                  start_time: "09:30",
                  end_time: "18:30",
                  break_minutes: 60,
                  working_hours: 8,
                  grace_in_minutes: mode === "working_hours_only" ? 0 : 15,
                  grace_out_minutes: mode === "working_hours_only" ? 0 : 15,
                  half_day_after_minutes: 240,
                  attendance_mode: mode,
                  week_off_days: weekOffs,
                  is_active: active,
                });
                await reload();
                toast.success("Shift created");
                setAddOpen(false);
              }}
            >
              Save Shift
            </Button>
          </>
        }
      >
        <FormGrid columns={3}>
          <FormField label="Shift Name" required>
            <Input placeholder="e.g. Morning Shift" />
          </FormField>
          <FormField label="Code" required>
            <Input placeholder="e.g. MOR" maxLength={6} />
          </FormField>
          <FormField label="Attendance Mode" required>
            <Select value={mode} onChange={(e) => setMode(e.target.value as Shift["attendance_mode"])}>
              <option value="working_hours_only">Working Hours Only</option>
              <option value="strict_shift_timing">Strict Shift Timing</option>
            </Select>
          </FormField>
          <FormField label="Start Time" required>
            <Input type="time" defaultValue="09:30" />
          </FormField>
          <FormField label="End Time" required>
            <Input type="time" defaultValue="18:30" />
          </FormField>
          <FormField label="Break" required hint="Minutes">
            <Input type="number" min={0} defaultValue={60} />
          </FormField>
          <FormField label="Grace In" hint="Minutes after start before a late mark" >
            <Input type="number" min={0} defaultValue={15} disabled={mode === "working_hours_only"} />
          </FormField>
          <FormField label="Grace Out" hint="Minutes before end before an early mark">
            <Input type="number" min={0} defaultValue={15} disabled={mode === "working_hours_only"} />
          </FormField>
          <FormField label="Half Day After" hint="Minutes worked below which the day is a half day">
            <Input type="number" min={0} defaultValue={240} />
          </FormField>
        </FormGrid>

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold text-gray-600">Week Off Days</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const on = weekOffs.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setWeekOffs((prev) => (on ? prev.filter((x) => x !== d) : [...prev, d]))
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    on
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField label="Saturday Pattern" hint="Applies only when Saturday is not a full week off">
            <Select defaultValue="All Saturdays Off">
              <option>All Saturdays Off</option>
              <option>1st and 3rd Saturday Off</option>
              <option>2nd and 4th Saturday Off</option>
              <option>All Saturdays Working</option>
            </Select>
          </FormField>
          <FormField label="Extra Hours Calculation" hint="Decides whether a comp-off request is even offered">
            <Select defaultValue="Overtime">
              <option>Overtime</option>
              <option>Compensatory Off</option>
              <option>Not tracked</option>
            </Select>
          </FormField>
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
