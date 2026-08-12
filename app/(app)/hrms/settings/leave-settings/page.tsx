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
import { DEMO_LEAVE_TYPES } from "@/lib/hrms/demo-data";
import { fmtLimit } from "@/lib/hrms/format";
import type { LeaveType } from "@/lib/hrms/types";

/**
 * `docs/hrms/09-org-settings.md §3`.
 *
 * Balance is a ledger, never a counter — every accrual, debit and reversal is a
 * row, and the balance is their sum. That is what lets a cancellation reverse a
 * specific prior debit instead of nudging a number nobody can audit.
 */
export default function LeaveSettingsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [paid, setPaid] = useState(true);
  const [halfDay, setHalfDay] = useState(true);
  const [needsDoc, setNeedsDoc] = useState(false);
  const [unlimited, setUnlimited] = useState(false);

  const columns: Column<LeaveType>[] = [
    { key: "name", header: "Leave Type", render: (t) => <span className="font-medium text-gray-900">{t.name}</span> },
    { key: "code", header: "Code", render: (t) => t.code },
    {
      key: "quota",
      header: "Annual Quota",
      align: "right",
      // NULL means no limit, and it says so.
      render: (t) => fmtLimit(t.annual_quota_days, "days"),
    },
    {
      key: "carry",
      header: "Carry Forward Cap",
      align: "right",
      render: (t) => fmtLimit(t.carry_forward_cap_days, "days"),
    },
    {
      key: "paid",
      header: "Paid",
      align: "center",
      render: (t) =>
        t.is_paid ? (
          <Badge tone="bg-green-100 text-green-700">Paid</Badge>
        ) : (
          <Badge tone="bg-red-100 text-red-700">Unpaid</Badge>
        ),
    },
    {
      key: "half",
      header: "Half Day",
      align: "center",
      render: (t) => (t.allows_half_day ? "Allowed" : "Full days only"),
    },
    {
      key: "doc",
      header: "Document",
      align: "center",
      render: (t) =>
        t.requires_document ? <Badge tone="bg-amber-100 text-amber-800">Required</Badge> : "—",
    },
    {
      key: "status",
      header: "Status",
      render: (t) => (
        <Badge tone={t.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
          {t.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (t) => (
        <Button variant="ghost" onClick={() => toast.success(`${t.name} opened`)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <SettingsPage
      title="Leave Settings"
      description="Leave types, quotas, accrual and carry-forward. Balances are derived from the ledger, not stored."
      actions={
        <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
          Add Leave Type
        </Button>
      }
    >
      <div className="space-y-5">
        <Card title="Leave Types" bodyClassName="p-4">
          <DataTable
            columns={columns}
            rows={DEMO_LEAVE_TYPES}
            getKey={(t) => t.id}
            empty="No leave types defined"
            dense
          />
        </Card>

        <Card title="Accrual & Cycle">
          <FormGrid columns={3}>
            <FormField label="Leave Year Starts" required>
              <Select defaultValue="April">
                {["January", "April", "July", "October"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Accrual Frequency" required hint="Posted by the monthly accrual cron">
              <Select defaultValue="Monthly">
                {["Monthly", "Quarterly", "Annually", "On joining"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Accrual Rounding">
              <Select defaultValue="Half day">
                {["No rounding", "Half day", "Full day"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Probation Accrual" hint="Whether leave accrues before confirmation">
              <Select defaultValue="Accrue but do not allow use">
                <option>Accrue and allow use</option>
                <option>Accrue but do not allow use</option>
                <option>Do not accrue</option>
              </Select>
            </FormField>
            <FormField label="Negative Balance" hint="Whether leave may be taken beyond the balance">
              <Select defaultValue="Not allowed">
                <option>Not allowed</option>
                <option>Allowed up to 2 days</option>
                <option>Allowed up to 5 days</option>
              </Select>
            </FormField>
            <FormField label="Encashment on Exit" hint="A Payroll consumer of the leave ledger">
              <Select defaultValue="Earned Leave only">
                <option>Earned Leave only</option>
                <option>All paid leave types</option>
                <option>None</option>
              </Select>
            </FormField>
          </FormGrid>
        </Card>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Leave Type"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Leave type added");
                setAddOpen(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Name" required>
            <Input placeholder="e.g. Bereavement Leave" />
          </FormField>
          <FormField label="Code" required hint="Short code used on reports and payslips">
            <Input placeholder="e.g. BL" maxLength={6} />
          </FormField>
          <FormField
            label="Annual Quota"
            hint="Leave blank for no limit — never enter a sentinel like 9999"
          >
            <div className="space-y-2">
              <Input type="number" min={0} step={0.5} placeholder="No limit" disabled={unlimited} />
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <Toggle checked={unlimited} onChange={setUnlimited} label="No limit" />
                No limit
              </label>
            </div>
          </FormField>
          <FormField label="Carry Forward Cap" hint="Blank means nothing carries forward">
            <Input type="number" min={0} placeholder="No carry forward" />
          </FormField>
          <FormField label="Paid">
            <div className="pt-1">
              <Toggle checked={paid} onChange={setPaid} label="Paid" />
            </div>
          </FormField>
          <FormField label="Allows Half Day">
            <div className="pt-1">
              <Toggle checked={halfDay} onChange={setHalfDay} label="Allows half day" />
            </div>
          </FormField>
          <FormField label="Requires Document" span hint="Blocks submission until a file is attached">
            <div className="pt-1">
              <Toggle checked={needsDoc} onChange={setNeedsDoc} label="Requires document" />
            </div>
          </FormField>
        </FormGrid>
      </Modal>
    </SettingsPage>
  );
}
