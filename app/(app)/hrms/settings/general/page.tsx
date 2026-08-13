"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Info, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  FormField,
  FormGrid,
  Input,
  Select,
  Toggle,
} from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { saveHrmsData, useHrmsData } from "@/lib/hrms/client-api";
import { fmtLimit } from "@/lib/hrms/format";

/**
 * `docs/hrms/09-org-settings.md §2` and `12-… §8`.
 *
 * Two decisions are visible here:
 *
 *  - **Attendance Mode** is a real behaviour switch, not a preference.
 *    `Working Hours Only` counts total time worked; `Strict Shift Timing` also
 *    enforces the punch windows, which is what makes late marks possible.
 *  - **Regularization limits are scoped**, not keyed by role. The reference
 *    keyed them by role, so a manager who was also a field employee got the
 *    wrong allowance. A scope (organisation / branch / department / employment
 *    type) with the most specific winning is the shape that survives.
 */

interface LimitRule {
  key: string;
  scope: "organization" | "branch" | "department" | "employment_type";
  scopeValue: string;
  /** NULL is no limit — never a 9999 sentinel. */
  perMonth: number | null;
  withinDays: number;
}

export default function GeneralSettingsPage() {
  const [dirty, setDirty] = useState(false);
  const [options] = useHrmsData<{ branches: { name: string }[]; departments: { name: string }[]; employment_types: { name: string }[] }>("/api/hrms/options", { branches: [], departments: [], employment_types: [] });
  const [settings, reload] = useHrmsData<Record<string, unknown>>("/api/hrms/settings/general", {});
  const [attendanceMode, setAttendanceMode] = useState<"working_hours_only" | "strict_shift_timing">(
    "working_hours_only"
  );
  const [allowBackdated, setAllowBackdated] = useState(true);
  const [requireReason, setRequireReason] = useState(true);
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [rules, setRules] = useState<LimitRule[]>([
    { key: "r1", scope: "organization", scopeValue: "All employees", perMonth: 3, withinDays: 7 },
    { key: "r2", scope: "branch", scopeValue: "Mumbai — Andheri East", perMonth: 4, withinDays: 7 },
    { key: "r3", scope: "employment_type", scopeValue: "Contract", perMonth: null, withinDays: 14 },
  ]);

  const touch = () => setDirty(true);

  const scopeOptions = (scope: LimitRule["scope"]) => {
    if (scope === "branch") return options.branches.map((b) => b.name);
    if (scope === "department") return options.departments.map((d) => d.name);
    if (scope === "employment_type") return options.employment_types.map((t) => t.name);
    return ["All employees"];
  };

  return (
    <SettingsPage
      title="General Settings"
      description="Attendance behaviour, regularization allowances and approval routing."
      actions={
        <>
          <Button disabled={!dirty} onClick={() => setDirty(false)}>
            Reset
          </Button>
          <Button
            variant="primary"
            disabled={!dirty}
            onClick={async () => {
              await saveHrmsData("/api/hrms/settings/general", {
                ...settings,
                attendance_mode: attendanceMode,
                allow_backdated: allowBackdated,
                require_reason: requireReason,
                auto_escalate: autoEscalate,
                regularization_rules: rules,
              });
              await reload();
              toast.success("General settings saved");
              setDirty(false);
            }}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Card title="Attendance Mode">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                value: "working_hours_only" as const,
                label: "Working Hours Only",
                hint: "Counts total time worked in the day. Punch times themselves do not create penalties.",
              },
              {
                value: "strict_shift_timing" as const,
                label: "Strict Shift Timing",
                hint: "Also enforces the shift's check-in and check-out windows, so late arrivals and early exits are flagged.",
              },
            ].map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => {
                  setAttendanceMode(mode.value);
                  touch();
                }}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  attendanceMode === mode.value
                    ? "border-brand-400 bg-brand-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full border ${
                      attendanceMode === mode.value ? "border-brand-500" : "border-gray-300"
                    }`}
                  >
                    {attendanceMode === mode.value && (
                      <span className="h-2 w-2 rounded-full bg-brand-500" />
                    )}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{mode.label}</span>
                </div>
                <p className="mt-1.5 text-xs leading-snug text-gray-500">{mode.hint}</p>
              </button>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            This is the organisation default. A shift may override it, and an employee&apos;s record
            shows which mode actually applies to them.
          </p>
        </Card>

        <Card
          title="Regularization Limits"
          subtitle="Scoped, with the most specific rule winning — an employee is not one role"
          bodyClassName="p-4"
          actions={
            <Button
              icon={Plus}
              onClick={() => {
                setRules((prev) => [
                  ...prev,
                  {
                    key: Math.random().toString(36).slice(2),
                    scope: "department",
                    scopeValue: options.departments[0]?.name ?? "All employees",
                    perMonth: 3,
                    withinDays: 7,
                  },
                ]);
                touch();
              }}
            >
              Add Rule
            </Button>
          }
        >
          <div className="space-y-3">
            {rules.map((rule, i) => (
              <div
                key={rule.key}
                className="grid gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-[150px_1fr_140px_140px_auto]"
              >
                <Select
                  aria-label="Scope"
                  value={rule.scope}
                  onChange={(e) => {
                    const scope = e.target.value as LimitRule["scope"];
                    setRules((prev) =>
                      prev.map((r) =>
                        r.key === rule.key
                          ? { ...r, scope, scopeValue: scopeOptions(scope)[0] }
                          : r
                      )
                    );
                    touch();
                  }}
                >
                  <option value="organization">Organisation</option>
                  <option value="branch">Branch</option>
                  <option value="department">Department</option>
                  <option value="employment_type">Employment Type</option>
                </Select>
                <Select
                  aria-label="Applies to"
                  value={rule.scopeValue}
                  disabled={rule.scope === "organization"}
                  onChange={(e) => {
                    setRules((prev) =>
                      prev.map((r) => (r.key === rule.key ? { ...r, scopeValue: e.target.value } : r))
                    );
                    touch();
                  }}
                >
                  {scopeOptions(rule.scope).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
                <div>
                  <Input
                    type="number"
                    min={0}
                    aria-label="Requests per month"
                    placeholder="No limit"
                    value={rule.perMonth ?? ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      setRules((prev) =>
                        prev.map((r) => (r.key === rule.key ? { ...r, perMonth: v } : r))
                      );
                      touch();
                    }}
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Per month · {fmtLimit(rule.perMonth)}
                  </p>
                </div>
                <div>
                  <Input
                    type="number"
                    min={1}
                    aria-label="Raise within days"
                    value={rule.withinDays}
                    onChange={(e) => {
                      setRules((prev) =>
                        prev.map((r) =>
                          r.key === rule.key ? { ...r, withinDays: Number(e.target.value) } : r
                        )
                      );
                      touch();
                    }}
                  />
                  <p className="mt-1 text-[11px] text-gray-500">Raise within days</p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove rule ${i + 1}`}
                  disabled={rule.scope === "organization"}
                  onClick={() => {
                    setRules((prev) => prev.filter((r) => r.key !== rule.key));
                    touch();
                  }}
                  className="self-start rounded p-2 text-gray-400 hover:text-red-600 disabled:opacity-40"
                  title={rule.scope === "organization" ? "The organisation rule is the fallback" : undefined}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Leave the monthly figure blank for <Badge tone="bg-gray-100 text-gray-600">No limit</Badge>{" "}
            — never a sentinel number.
          </p>
        </Card>

        <Card title="Request Behaviour">
          <ul className="divide-y divide-gray-100">
            {[
              {
                label: "Allow backdated requests",
                hint: "Employees may raise a request for a date that has already passed, within the limits above",
                value: allowBackdated,
                set: setAllowBackdated,
              },
              {
                label: "Require a reason on every request",
                hint: "An approver deciding without context is how approvals become rubber stamps",
                value: requireReason,
                set: setRequireReason,
              },
              {
                label: "Escalate stale approvals",
                hint: "Requests untouched past the SLA move to the next approver in the chain",
                value: autoEscalate,
                set: setAutoEscalate,
              },
            ].map((row) => (
              <li key={row.label} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{row.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{row.hint}</p>
                </div>
                <Toggle
                  checked={row.value}
                  onChange={(v) => {
                    row.set(v);
                    touch();
                  }}
                  label={row.label}
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Approval Routing">
          <FormGrid columns={2}>
            <FormField label="Default First Approver" required>
              <Select defaultValue="manager" onChange={touch}>
                <option value="manager">Reporting Manager</option>
                <option value="business_head">Business Head</option>
                <option value="admin">HR Administrator</option>
              </Select>
            </FormField>
            <FormField
              label="Fallback When Unavailable"
              hint="The assistant reporting manager on the employee record"
            >
              <Select defaultValue="assistant_manager" onChange={touch}>
                <option value="assistant_manager">Assistant Reporting Manager</option>
                <option value="skip_level">Skip-level Manager</option>
                <option value="admin">HR Administrator</option>
              </Select>
            </FormField>
            <FormField label="Escalation SLA" hint="Hours before a pending request escalates">
              <Input type="number" min={1} defaultValue={48} onChange={touch} />
            </FormField>
            <FormField label="Second Approver Threshold" hint="Leave blank to never require a second step">
              <Input placeholder="No limit" onChange={touch} />
            </FormField>
          </FormGrid>
        </Card>
      </div>
    </SettingsPage>
  );
}
