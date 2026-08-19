"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button, FormField, Input, Modal, Textarea } from "@/components/hrms/ui";
import { hrmsMutation } from "@/lib/hrms/api-client";
import { fmtDate, fmtTime } from "@/lib/hrms/format";

export interface AttendanceCorrectionSource {
  employee_id?: string;
  work_date: string;
  first_in?: string | null;
  last_out?: string | null;
}

function timeValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function CorrectionModal({
  row,
  onClose,
  onSaved,
}: {
  row: AttendanceCorrectionSource | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [requestedFirst, setRequestedFirst] = useState("");
  const [requestedLast, setRequestedLast] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRequestedFirst(timeValue(row?.first_in));
    setRequestedLast(timeValue(row?.last_out));
    setReason("");
  }, [row]);

  async function submit() {
    if (!row) return;
    setSaving(true);
    try {
      await hrmsMutation("/api/hrms/attendance/regularizations", "POST", {
        request_type: "early_in_out",
        employee_id: row.employee_id,
        subject: `Attendance correction - ${fmtDate(row.work_date)}`,
        from_date: row.work_date,
        to_date: row.work_date,
        days: 1,
        reason,
        previous_first_in: timeValue(row.first_in),
        previous_last_out: timeValue(row.last_out),
        requested_first_in: requestedFirst,
        requested_last_out: requestedLast,
      });
      toast.success("Correction sent for approval");
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!row}
      onClose={onClose}
      title="Apply Approval"
      subtitle={row ? fmtDate(row.work_date) : undefined}
      width="max-w-xl"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!reason.trim() || saving} onClick={submit}>{saving ? "Submitting" : "Submit"}</Button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Current In"><Input value={fmtTime(row?.first_in)} disabled /></FormField>
        <FormField label="Current Out"><Input value={fmtTime(row?.last_out)} disabled /></FormField>
        <FormField label="Requested In"><Input type="time" value={requestedFirst} onChange={(e) => setRequestedFirst(e.target.value)} /></FormField>
        <FormField label="Requested Out"><Input type="time" value={requestedLast} onChange={(e) => setRequestedLast(e.target.value)} /></FormField>
        <div className="sm:col-span-2">
          <FormField label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
        </div>
      </div>
    </Modal>
  );
}
