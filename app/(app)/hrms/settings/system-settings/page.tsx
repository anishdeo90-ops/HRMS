"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Card, FormField, FormGrid, Input, Select, Toggle } from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { saveHrmsData, useHrmsData } from "@/lib/hrms/client-api";

/**
 * `docs/hrms/07-settings.md §2` — key/value config.
 *
 * Date format and currency are shown but locked: `DD-MM-YYYY` and `₹` are
 * rendering conventions the whole product depends on (`10-foundation-spec.md
 * §8`), and making them per-tenant switches means every screen has to agree
 * about them at runtime. They become editable when a second locale is a real
 * requirement, not before.
 */
export default function SystemSettingsPage() {
  const [dirty, setDirty] = useState(false);
  const [settings, reload] = useHrmsData<Record<string, unknown>>("/api/hrms/settings/system-settings", {});
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const touch = () => setDirty(true);

  return (
    <SettingsPage
      title="System Settings"
      description="Formats, defaults and notification behaviour for the whole organisation."
      actions={
        <>
          <Button disabled={!dirty} onClick={() => setDirty(false)}>
            Reset
          </Button>
          <Button
            variant="primary"
            disabled={!dirty}
            onClick={async () => {
              await saveHrmsData("/api/hrms/settings/system-settings", {
                ...settings,
                email_notifications: emailNotifications,
                in_app_notifications: inAppNotifications,
                auto_approve: autoApprove,
                saved_at: new Date().toISOString(),
              });
              await reload();
              toast.success("System settings saved");
              setDirty(false);
            }}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Card title="Formats">
          <FormGrid columns={3}>
            <FormField
              label="Date Format"
              hint="Fixed product-wide, tooltips included, so two screens can never disagree"
            >
              <Input value="DD-MM-YYYY" disabled />
            </FormField>
            <FormField label="Currency" hint="Amounts are stored in paise as integers">
              <Input value="₹ INR" disabled />
            </FormField>
            <FormField label="Time Zone" required>
              <Select defaultValue="Asia/Kolkata" onChange={touch}>
                {["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "UTC"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Week Starts On" required>
              <Select defaultValue="Monday" onChange={touch}>
                {["Monday", "Sunday"].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Financial Year Starts" required>
              <Select defaultValue="April" onChange={touch}>
                {["January", "April", "July", "October"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Number Format">
              <Select defaultValue="Indian (1,23,456)" onChange={touch}>
                <option>Indian (1,23,456)</option>
                <option>International (123,456)</option>
              </Select>
            </FormField>
          </FormGrid>
        </Card>

        <Card title="Employee Defaults">
          <FormGrid columns={3}>
            <FormField label="Employee Code Prefix" hint="Codes auto-generate as prefix + sequence">
              <Input defaultValue="HR-" onChange={touch} />
            </FormField>
            <FormField label="Employee Code Padding">
              <Input type="number" min={1} max={8} defaultValue={4} onChange={touch} />
            </FormField>
            <FormField label="Default Probation Period" hint="Days, overridable per employment type">
              <Input type="number" min={0} defaultValue={90} onChange={touch} />
            </FormField>
          </FormGrid>
        </Card>

        <Card title="Notifications">
          <ul className="divide-y divide-gray-100">
            {[
              {
                label: "Email notifications",
                hint: "Approvals, reminders and document requests are emailed",
                value: emailNotifications,
                set: setEmailNotifications,
              },
              {
                label: "In-app notifications",
                hint: "Shown in the notification bell",
                value: inAppNotifications,
                set: setInAppNotifications,
              },
              {
                label: "Auto-approve requests within policy",
                hint: "Requests that break no rule skip the manager step. Off by default — silent approval is hard to audit.",
                value: autoApprove,
                set: setAutoApprove,
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
      </div>
    </SettingsPage>
  );
}
