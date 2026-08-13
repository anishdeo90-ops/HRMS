"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button, Card, FormField, Input, Label, Select, Textarea } from "@/components/hrms/ui";
import { hrmsMutation, useHrmsApi } from "@/lib/hrms/api-client";
import { EMPTY, fmtDays, fmtLimit, todayISO } from "@/lib/hrms/format";
import type { LeaveBalance, LeaveType, Employee } from "@/lib/hrms/types";

const DURATIONS = [
  { value: "full_day", label: "Full Day" },
  { value: "first_half", label: "First Half" },
  { value: "second_half", label: "Second Half" },
];

function addWorkingDays(fromISO: string, count: number, includeWeekends: boolean) {
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
  const { data } = useHrmsApi<{ employee: Employee | null; leave_balances: LeaveBalance[]; leave_types: LeaveType[] }>(
    "/api/hrms/leaves",
    { employee: null, leave_balances: [], leave_types: [] }
  );

  const numericDays = Number(days) || 0;
  const toDate = useMemo(() => addWorkingDays(fromDate, numericDays, includeWeekends), [fromDate, numericDays, includeWeekends]);
  const balance = data.leave_balances.find((b) => b.leave_type_id === leaveTypeId);
  const leaveTypes = data.leave_types;
  const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);
  const valid = !!leaveTypeId && numericDays > 0 && !!fromDate && reason.trim().length > 0 && !(balance && numericDays > balance.balance);

  async function submit() {
    await hrmsMutation("/api/hrms/leaves", "POST", {
      leave_type_id: leaveTypeId,
      from_date: fromDate,
      to_date: toDate,
      days: numericDays,
      day_portion: duration,
      include_weekends: includeWeekends,
      reason,
    });
    toast.success("Leave application submitted");
    router.push("/hrms/me/leaves");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card title="Application">
        <div className="space-y-4">
          <FormField label="Application Date"><Input type="date" value={todayISO()} disabled /></FormField>
          <FormField label="Leave" required>
            <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
              <option value="">Select a leave</option>
              {leaveTypes.filter((t) => t.is_active).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
            </Select>
          </FormField>
          <FormField label="No. of Days" required><Input type="number" min={0.5} step={0.5} value={days} onChange={(e) => setDays(e.target.value)} /></FormField>
          <div>
            <Label required>Include Weekends</Label>
            <div className="flex gap-4 pt-1">
              {[{ label: "Yes", value: true }, { label: "No", value: false }].map((opt) => (
                <label key={opt.label} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input type="radio" name="include_weekends" checked={includeWeekends === opt.value} onChange={() => setIncludeWeekends(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <FormField label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
        </div>
      </Card>
      <Card title="Dates & Approver">
        <div className="space-y-4">
          <FormField label="Reporting Manager"><Input value={data.employee?.reporting_manager ?? ""} placeholder={EMPTY} disabled /></FormField>
          <FormField label="From Date" required><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></FormField>
          <FormField label="To Date"><Input type="date" value={toDate} disabled /></FormField>
          <FormField label="Leave Type" required>
            <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
              {DURATIONS.map((d) => <option key={d.value} value={d.value} disabled={d.value !== "full_day" && selectedType ? !selectedType.allows_half_day : false}>{d.label}</option>)}
            </Select>
          </FormField>
        </div>
      </Card>
      <div className="space-y-5">
        <Card title="Leave Balance" bodyClassName="p-0">
          <table className="w-full text-sm"><tbody>{data.leave_balances.map((b) => {
            const type = leaveTypes.find((t) => t.id === b.leave_type_id);
            return <tr key={b.leave_type_id} className="border-t border-gray-100"><td className="px-5 py-2">{b.leave_type}</td><td className="px-5 py-2 text-right font-semibold">{b.balance}</td><td className="px-5 py-2 text-right text-xs text-gray-500">{fmtLimit(type?.annual_quota_days ?? null, "days")}</td></tr>;
          })}</tbody></table>
        </Card>
        {balance && numericDays > balance.balance && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{fmtDays(numericDays)} exceeds your {balance.leave_type} balance.</p>}
        <div className="flex justify-end gap-2"><Button onClick={() => router.back()}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={submit}>Save</Button></div>
      </div>
    </div>
  );
}
