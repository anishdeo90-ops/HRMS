"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Award, Plus } from "lucide-react";
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
  Textarea,
  Toggle,
  type Column,
} from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { EMPTY } from "@/lib/hrms/format";
import { titleCase } from "@/lib/hrms/status";

/** `docs/hrms/07-settings.md` — the recognition catalogue behind the Overview tab. */

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: "performance" | "tenure" | "behaviour" | "referral";
  award_basis: "manual" | "automatic";
  criteria?: string;
  awarded_count: number;
  is_active: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "ach-1", name: "Star Performer", description: "Ranked first in the quarterly cohort", category: "performance", award_basis: "automatic", criteria: "Rank = 1 in a completed quarter", awarded_count: 8, is_active: true },
  { id: "ach-2", name: "Perfect Attendance", description: "A full quarter with no absence or late mark", category: "behaviour", award_basis: "automatic", criteria: "No penalty rows in the quarter", awarded_count: 23, is_active: true },
  { id: "ach-3", name: "Five Year Club", description: "Five years with the company", category: "tenure", award_basis: "automatic", criteria: "Work anniversary = 5 years", awarded_count: 6, is_active: true },
  { id: "ach-4", name: "Talent Scout", description: "Referred a candidate who joined and confirmed", category: "referral", award_basis: "automatic", criteria: "Referred employee passes probation", awarded_count: 4, is_active: true },
  { id: "ach-5", name: "Above and Beyond", description: "Nominated by a manager for exceptional work", category: "behaviour", award_basis: "manual", awarded_count: 11, is_active: true },
  { id: "ach-6", name: "Onboarding Champion", description: "Buddy to three or more new joiners", category: "behaviour", award_basis: "manual", awarded_count: 0, is_active: false },
];

const CATEGORY_TONE: Record<Achievement["category"], string> = {
  performance: "bg-brand-100 text-brand-700",
  tenure: "bg-green-100 text-green-700",
  behaviour: "bg-slate-200 text-slate-700",
  referral: "bg-amber-100 text-amber-800",
};

export default function AchievementsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [basis, setBasis] = useState<Achievement["award_basis"]>("manual");
  const [active, setActive] = useState(true);

  const columns: Column<Achievement>[] = [
    {
      key: "name",
      header: "Achievement",
      render: (a) => (
        <div className="flex items-start gap-2.5">
          <Award size={15} className="mt-0.5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-gray-900">{a.name}</p>
            <p className="text-xs text-gray-500">{a.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (a) => <Badge tone={CATEGORY_TONE[a.category]}>{titleCase(a.category)}</Badge>,
    },
    {
      key: "basis",
      header: "Awarded",
      render: (a) => (a.award_basis === "automatic" ? "Automatically" : "By nomination"),
    },
    { key: "criteria", header: "Criteria", render: (a) => a.criteria ?? EMPTY },
    {
      key: "count",
      header: "Times Awarded",
      align: "right",
      // `—` rather than 0, so "never awarded" reads as a fact rather than a score.
      render: (a) => (a.awarded_count ? a.awarded_count : EMPTY),
    },
    {
      key: "status",
      header: "Status",
      render: (a) => (
        <Badge tone={a.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
          {a.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (a) => (
        <Button variant="ghost" onClick={() => toast.success(`${a.name} opened`)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <SettingsPage
      title="Achievements"
      description="The recognition catalogue. Automatic achievements are awarded by the nightly job from data the system already has."
      actions={
        <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
          Add Achievement
        </Button>
      }
    >
      <Card title="Catalogue" bodyClassName="p-4">
        <DataTable
          columns={columns}
          rows={ACHIEVEMENTS}
          getKey={(a) => a.id}
          empty="No achievements defined"
          dense
        />
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Achievement"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Achievement added");
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
            <Input placeholder="e.g. Perfect Attendance" />
          </FormField>
          <FormField label="Category" required>
            <Select defaultValue="performance">
              {["performance", "tenure", "behaviour", "referral"].map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Description" required span>
            <Textarea placeholder="What this recognises" />
          </FormField>
          <FormField label="Award Basis" required>
            <Select
              value={basis}
              onChange={(e) => setBasis(e.target.value as Achievement["award_basis"])}
            >
              <option value="manual">By nomination</option>
              <option value="automatic">Automatically</option>
            </Select>
          </FormField>
          {basis === "automatic" && (
            <FormField label="Criteria" required hint="Evaluated by the nightly achievements job">
              <Select defaultValue="">
                <option value="">Select</option>
                <option>Rank = 1 in a completed quarter</option>
                <option>No penalty rows in the quarter</option>
                <option>Work anniversary reached</option>
                <option>Referred employee passes probation</option>
              </Select>
            </FormField>
          )}
          <FormField label="Active" span>
            <div className="pt-1">
              <Toggle checked={active} onChange={setActive} label="Active" />
            </div>
          </FormField>
        </FormGrid>
      </Modal>
    </SettingsPage>
  );
}
