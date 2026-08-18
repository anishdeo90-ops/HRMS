"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  FormField,
  FormGrid,
  Input,
  Select,
  Textarea,
} from "@/components/hrms/ui";
import { fmtMoney, todayISO } from "@/lib/hrms/format";
import type { LookupItem } from "@/lib/hrms/types";
import { useApiData } from "@/lib/hrms/use-api-data";

/**
 * `docs/hrms/04-me.md §5`.
 *
 * `Expense Type` is a strict FK to the expense-type master, not the reference's
 * creatable combobox. Free-typing fills the master with "Travel", "travel",
 * "Travelling" and "Trvl", and every expense report downstream becomes unusable.
 * Ad-hoc spend goes under an explicit `Other` type plus the description field.
 *
 * `Total Amount` is summed from the lines and never entered.
 */

interface LineDraft {
  key: string;
  expense_date: string;
  expense_type: string;
  amount: string;
  description: string;
  attachmentNames: string[];
}

function emptyLine(): LineDraft {
  return {
    key: Math.random().toString(36).slice(2),
    expense_date: todayISO(),
    expense_type: "",
    amount: "",
    description: "",
    attachmentNames: [],
  };
}

export default function AddReimbursementPage() {
  const router = useRouter();
  const [expenseName, setExpenseName] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const expenseTypes = useApiData<LookupItem[]>("/api/hrms/masters/expense-type", []);

  const totalPaise = lines.reduce((sum, l) => sum + Math.round((Number(l.amount) || 0) * 100), 0);
  const claimHint = expenseName.trim().length === 0
    ? "Expense name is required"
    : lines.some((l) => !l.expense_type || Number(l.amount) <= 0 || !l.expense_date)
      ? "Complete every expense line"
      : "";
  const valid =
    expenseName.trim().length > 0 &&
    lines.every((l) => l.expense_type && Number(l.amount) > 0 && l.expense_date);

  function update(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function submit() {
    const res = await fetch("/api/hrms/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: [expenseName, notes].filter(Boolean).join("\n"),
        lines: lines.map((l) => ({
          expense_date: l.expense_date,
          expense_type: l.expense_type,
          amount_paise: Math.round(Number(l.amount) * 100),
          description: l.description,
          has_receipt: l.attachmentNames.length > 0,
        })),
      }),
    });
    if (!res.ok) return toast.error("Could not submit reimbursement claim");
    toast.success("Reimbursement claim submitted for approval");
    router.push("/hrms/me/reimbursement");
  }

  return (
    <div className="space-y-5">
      <Card title="Claim">
        <FormGrid columns={2}>
          <FormField label="Date" required>
            <Input type="date" value={todayISO()} disabled />
          </FormField>
          <FormField label="Expense Name" required>
            <Input
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              placeholder="e.g. Chennai client visit — October"
            />
          </FormField>
        </FormGrid>
      </Card>

      <Card
        title="Expense Details"
        subtitle="Attachments belong to the line, not the claim"
        bodyClassName="p-0"
        actions={
          <Button icon={Plus} onClick={() => setLines((prev) => [...prev, emptyLine()])}>
            Add Line
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Sr.No</th>
                <th className="px-4 py-2.5 text-left font-semibold">Expense Date</th>
                <th className="px-4 py-2.5 text-left font-semibold">Expense Type</th>
                <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                <th className="px-4 py-2.5 text-left font-semibold">Attachments</th>
                <th className="px-4 py-2.5 text-left font-semibold">Description</th>
                <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.key} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3 pt-5 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="date"
                      value={l.expense_date}
                      onChange={(e) => update(l.key, { expense_date: e.target.value })}
                      className="w-40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={l.expense_type}
                      onChange={(e) => update(l.key, { expense_type: e.target.value })}
                      className="w-52"
                    >
                      <option value="">Select expense type</option>
                      {expenseTypes.filter((t) => t.is_active).map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={l.amount}
                      onChange={(e) => update(l.key, { amount: e.target.value })}
                      placeholder="0.00"
                      className="w-32 text-right"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex w-40 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-brand-300 hover:text-brand-600">
                      <input
                        type="file"
                        multiple
                        className="sr-only"
                        onChange={(e) => update(l.key, { attachmentNames: Array.from(e.target.files ?? []).map((file) => file.name) })}
                      />
                      <Paperclip size={12} />
                      <span className="truncate">{l.attachmentNames.length ? `${l.attachmentNames.length} file${l.attachmentNames.length > 1 ? "s" : ""}` : "Choose files"}</span>
                    </label>
                    {l.attachmentNames.length > 0 && (
                      <p className="mt-1 max-w-40 truncate text-[11px] text-gray-400" title={l.attachmentNames.join(", ")}>
                        {l.attachmentNames.join(", ")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Textarea
                      rows={2}
                      value={l.description}
                      onChange={(e) => update(l.key, { description: e.target.value })}
                      placeholder="Enter purpose"
                      className="w-64"
                    />
                  </td>
                  <td className="px-4 py-3 pt-5 text-right">
                    <button
                      type="button"
                      aria-label="Delete line"
                      disabled={lines.length === 1}
                      onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                      className="rounded p-1 text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Total Amount
          </span>
          <span className="text-lg font-bold text-gray-900">{fmtMoney(totalPaise, { decimals: true })}</span>
        </div>
      </Card>

      <Card title="Additional Notes">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything the approver should know about this claim"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          {claimHint && <span className="mr-auto text-xs text-red-600">{claimHint}</span>}
          <Button onClick={() => router.push("/hrms/me/reimbursement")}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={submit}>
            Submit Claim
          </Button>
        </div>
      </Card>
    </div>
  );
}
