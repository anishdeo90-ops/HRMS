"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus } from "lucide-react";
import { Button, Card, FormField, FormGrid, Input, Select, Textarea } from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";

/** `docs/hrms/07-settings.md §1` — one record per organisation. */
export default function CompanyProfilePage() {
  const [dirty, setDirty] = useState(false);
  const touch = () => setDirty(true);

  return (
    <SettingsPage
      title="Company Profile"
      description="The legal entity, its branding and the handle used in public links."
      actions={
        <>
          <Button disabled={!dirty} onClick={() => setDirty(false)}>
            Reset
          </Button>
          <Button
            variant="primary"
            disabled={!dirty}
            onClick={() => {
              toast.success("Company profile saved");
              setDirty(false);
            }}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Card title="Identity">
          <FormGrid columns={2}>
            <FormField label="Legal Name" required>
              <Input defaultValue="HireRabbits Technologies Private Limited" onChange={touch} />
            </FormField>
            <FormField label="Display Name" required hint="Shown in the app and on generated letters">
              <Input defaultValue="HireRabbits" onChange={touch} />
            </FormField>
            <FormField
              label="Company Slug"
              hint="Used in public links. Editable, so it is never treated as the tenant id."
            >
              <Input defaultValue="hirerabbits" onChange={touch} />
            </FormField>
            <FormField label="Industry">
              <Select defaultValue="Staffing & Recruitment" onChange={touch}>
                {["Staffing & Recruitment", "Facility Services", "Information Technology", "Manufacturing", "Other"].map(
                  (i) => (
                    <option key={i}>{i}</option>
                  )
                )}
              </Select>
            </FormField>
            <FormField label="Registered Address" span>
              <Textarea
                defaultValue="Unit 402, Andheri East, Mumbai 400069, Maharashtra, India"
                onChange={touch}
              />
            </FormField>
          </FormGrid>
        </Card>

        <Card title="Statutory Registration">
          <FormGrid columns={3}>
            <FormField label="CIN">
              <Input defaultValue="U72900MH2019PTC331234" onChange={touch} />
            </FormField>
            <FormField label="GSTIN">
              <Input defaultValue="27AABCH1234K1Z9" onChange={touch} />
            </FormField>
            <FormField label="PAN">
              <Input defaultValue="AABCH1234K" onChange={touch} />
            </FormField>
            <FormField label="PF Establishment Code">
              <Input defaultValue="MHBAN1234567000" onChange={touch} />
            </FormField>
            <FormField label="ESIC Code">
              <Input defaultValue="31000123450000999" onChange={touch} />
            </FormField>
            <FormField label="Professional Tax Registration">
              <Input defaultValue="27999888777" onChange={touch} />
            </FormField>
          </FormGrid>
        </Card>

        <Card title="Contact">
          <FormGrid columns={3}>
            <FormField label="Primary Email" required>
              <Input type="email" defaultValue="hr@hirerabbits.ai" onChange={touch} />
            </FormField>
            <FormField label="Phone">
              <Input type="tel" defaultValue="+91 22 4000 1234" onChange={touch} />
            </FormField>
            <FormField label="Website">
              <Input defaultValue="https://hirerabbits.ai" onChange={touch} />
            </FormField>
          </FormGrid>
        </Card>

        <Card title="Branding" subtitle="Used on offer letters, payslips and generated documents">
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={touch}
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600"
            >
              <ImagePlus size={20} />
              Upload Logo
            </button>
            <button
              type="button"
              onClick={touch}
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600"
            >
              <ImagePlus size={20} />
              Upload Letterhead
            </button>
          </div>
        </Card>
      </div>
    </SettingsPage>
  );
}
