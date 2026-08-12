"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Paperclip } from "lucide-react";
import {
  Button,
  Card,
  FormField,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/hrms/ui";
import {
  DEMO_LEAVE_TYPES,
  DEMO_ME,
  DEMO_MY_ATTENDANCE,
  DEMO_MY_LEAVE_BALANCES,
} from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, fmtDays, fmtLimit, todayISO } from "@/lib/hrms/format";

/**
 * `docs/hrms/04-me.md §3`.
 *
 * Two resolved decisions from the capture:
 *  - `Leave` is the leave-type master (Casual / Sick / Earned); `Leave Type` is
 *    the duration (Full Day / First Half / Second Half). The reference's two
 *    selects were ambiguous and inverting them would invert two tables.
 *  - `To Date` is derived from `From Date` + `No. of Days`, skipping weekends
 *    unless `Include Weekends = Yes`. It is never typed.
 */

const DURATIONS = [
  { value: "full_day", label: "Full Day", days: 1 },
  { value: "first_half", label: "First Half", days: 0.5 },
  { value: "second_half", label: "Second Half", days: 0.5 },
];

function addWorkingDays(fromISO: string, count: number, includeWeekends: boolean): string {
  if (!fromISO || count < 1) return "";
  const d = new Date(fromISO);
  let remaining = Math.ceil(count) - 1;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    if (includeWeekends || !weekend) remaining -= 1;
  }
  return d.toISOString().slice(0, 10);
}

export default function AddLeavePage() {
  const router = useRouter();
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [duration, setDuration] = useState("full_day");
  const [days, setDays] = useState("1");
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [fromDate, setFromDate] = useState(todayISO());
  const [reason, setReason] = useState("");

  const selectedType = DEMO_LEAVE_TYPES.find((t) => t.id === leaveTypeId);
  const numericDays = Number(days) || 0;

  const toDate = useMemo(
    () => addWorkingDays(fromDate, numericDays, includeWeekends),
    [fromDate, numericDays, includeWeekends]
  );

  /** Penalties surface on the form, because they change the decision (§3). */
  const penalties = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return DEMO_MY_ATTENDANCE.filter(
      (r) => r.work_date.startsWith(month) && r.penalty_reason
    );
  }, []);

  const balance = DEMO_MY_LEAVE_BALANCES.find((b) => b.leave_type_id === leaveTypeId);
  const exceedsBalance = !!balance && numericDays > balance.balance;

  const valid =
    !!leaveTypeId && numericDays > 0 && !!fromDate && reason.trim().length > 0 && !exceedsBalance;

  function submit() {
    toast.success("Leave application submitted for approval");
    router.push("/hrms/me/leaves");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Column 1 */}
      <Card title="Application">
        <div className="space-y-4">
          <FormField label="Application Date">
            <Input type="date" value={todayISO()} disabled />
          </FormField>

          <FormField label="Leave" required hint="The leave category this is drawn from">
            <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
              <option value="">Select a leave</option>
              {DEMO_LEAVE_TYPES.filter((t) => t.is_active).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="No. of Days" required>
            <Input
              type="number"
              min={0.5}
              step={0.5}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </FormField>

          <div>
            <Label required>Include Weekends</Label>
            <div className="flex gap-4 pt-1">
              {[
                { label: "Yes", value: true },
                { label: "No", value: false },
              ].map((opt) => (
                <label key={opt.label} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="include_weekends"
                    checked={includeWeekends === opt.value}
                    onChange={() => setIncludeWeekends(opt.value)}
                    className="text-brand-600"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <FormField label="Reason" required>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Give the approver enough context to decide"
            />
          </FormField>
        </div>
      </Card>

      {/* Column 2 */}
      <Card title="Dates & Approver">
        <div className="space-y-4">
          <FormField label="Reporting Manager">
            <Input value={DEMO_ME.reporting_manager ?? ""} placeholder={EMPTY} disabled />
          </FormField>

          <FormField label="From Date" required>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </FormField>

          <FormField
            label="To Date"
            hint="Derived from the start date and duration — weekends skipped unless included"
          >
            <Input type="date" value={toDate} disabled />
          </FormField>

          <FormField label="Leave Type" required hint="How much of each day the leave covers">
            <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
              {DURATIONS.map((d) => (
                <option
                  key={d.value}
                  value={d.value}
                  disabled={d.value !== "full_day" && selectedType ? !selectedType.allows_half_day : false}
                >
                  {d.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Document"
            hint={
              selectedType?.requires_document
                ? "Required for this leave type"
                : "Optional for this leave type"
            }
          >
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
              <Paperclip size={14} />
              Choose a file
            </div>
          </FormField>
        </div>
      </Card>

      {/* Column 3 — read-only context */}
      <div className="space-y-5">
        <Card title="Leave Balance" subtitle="Live from the ledger, not a nightly snapshot" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2 text-left font-semibold">Leave</th>
                <th className="px-5 py-2 text-right font-semibold">Balance</th>
                <th className="px-5 py-2 text-right font-semibold">Quota</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_MY_LEAVE_BALANCES.map((b) => {
                const type = DEMO_LEAVE_TYPES.find((t) => t.id === b.leave_type_id);
                return (
                  <tr
                    key={b.leave_type_id}
                    className={`border-t border-gray-100 ${b.leave_type_id === leaveTypeId ? "bg-brand-50" : ""}`}
                  >
                    <td className="px-5 py-2 text-gray-700">{b.leave_type}</td>
                    <td className="px-5 py-2 text-right font-semibold text-gray-900">{b.balance}</td>
                    <td className="px-5 py-2 text-right text-xs text-gray-500">
                      {fmtLimit(type?.annual_quota_days ?? null, "days")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Penalty Violations (This Month)" bodyClassName="p-0">
          {penalties.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-gray-500">
              No penalty violations this month.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {penalties.map((p) => (
                <li key={p.id} className="flex items-start gap-2.5 px-5 py-3">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fmtDate(p.work_date)}</p>
                    <p className="text-xs text-gray-500">{p.penalty_reason}</p>
                    <p className="mt-0.5 text-xs text-amber-700">
                      Payable fraction {p.payable_fraction}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {exceedsBalance && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-700">
              {fmtDays(numericDays)} exceeds your {balance?.leave_type} balance of {balance?.balance}.
              Reduce the request or apply for Loss of Pay.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={() => {
              setLeaveTypeId("");
              setDays("1");
              setFromDate(todayISO());
              setReason("");
              setIncludeWeekends(false);
            }}
          >
            Reset
          </Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
