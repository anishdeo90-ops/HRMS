"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
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
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_TEMPLATES } from "@/lib/hrms/demo-data";
import type { AppraisalTemplate } from "@/lib/hrms/types";

/**
 * `docs/hrms/13-performance-review.md §5.3`.
 *
 * Templates carry typed sections and typed questions, which is why the eight
 * fixed ranking columns collapse into this — one system, configured, rather than
 * two parallel appraisal mechanisms that never agree.
 */

const QUESTION_TYPES = [
  { value: "rating_5", label: "Rating (1–5)" },
  { value: "rating_10", label: "Rating (1–10)" },
  { value: "text", label: "Free text" },
  { value: "yes_no", label: "Yes / No" },
  { value: "goal_rollup", label: "Goal roll-up (computed)" },
  { value: "kra_rollup", label: "KRA roll-up (computed)" },
];

interface QuestionDraft {
  key: string;
  text: string;
  type: string;
  weightage: string;
  mandatory: boolean;
}

export default function AppraisalTemplatesPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { key: "q1", text: "", type: "rating_5", weightage: "20", mandatory: true },
  ]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_TEMPLATES.filter(
      (t) => !q || [t.template_name, t.template_type].some((f) => f.toLowerCase().includes(q))
    );
  }, [search]);

  const totalWeightage = questions.reduce((s, q) => s + (Number(q.weightage) || 0), 0);

  const columns: Column<AppraisalTemplate>[] = [
    {
      key: "name",
      header: "Template Name",
      render: (t) => <span className="font-medium text-gray-900">{t.template_name}</span>,
    },
    { key: "type", header: "Template Type", render: (t) => t.template_type },
    { key: "sections", header: "Sections", align: "right", render: (t) => t.sections },
    { key: "questions", header: "Questions", align: "right", render: (t) => t.questions },
    {
      key: "active",
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
        <Button variant="ghost" onClick={() => toast.success(`${t.template_name} opened`)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Appraisal Templates"
      subtitle="Typed sections and typed questions — a ninth criterion is a config row, not a migration"
      bodyClassName="p-4"
      actions={
        <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
          Create Template
        </Button>
      }
    >
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search template name or type"
        onReset={() => setSearch("")}
        onExport={() => {}}
      />

      <DataTable columns={columns} rows={rows} getKey={(t) => t.id} empty="No templates defined" dense />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Create Appraisal Template"
        width="max-w-4xl"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={totalWeightage !== 100}
              onClick={() => {
                toast.success("Template created");
                setAddOpen(false);
              }}
            >
              Save Template
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Template Name" required>
            <Input placeholder="e.g. Annual Review — Individual Contributor" />
          </FormField>
          <FormField label="Template Type" required>
            <Select defaultValue="">
              <option value="">Select</option>
              {["Annual", "Half Yearly", "Quarterly", "Probation", "Separation"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Section" required span hint="Questions below belong to this section">
            <Input placeholder="e.g. Delivery & Quality" />
          </FormField>
        </FormGrid>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Questions</h3>
            <Button
              icon={Plus}
              onClick={() =>
                setQuestions((prev) => [
                  ...prev,
                  {
                    key: Math.random().toString(36).slice(2),
                    text: "",
                    type: "rating_5",
                    weightage: "0",
                    mandatory: true,
                  },
                ])
              }
            >
              Add Question
            </Button>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div
                key={q.key}
                className="grid gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_180px_110px_90px_auto]"
              >
                <Input
                  placeholder={`Question ${i + 1}`}
                  value={q.text}
                  onChange={(e) =>
                    setQuestions((prev) =>
                      prev.map((x) => (x.key === q.key ? { ...x, text: e.target.value } : x))
                    )
                  }
                />
                <Select
                  value={q.type}
                  onChange={(e) =>
                    setQuestions((prev) =>
                      prev.map((x) => (x.key === q.key ? { ...x, type: e.target.value } : x))
                    )
                  }
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={q.weightage}
                  onChange={(e) =>
                    setQuestions((prev) =>
                      prev.map((x) => (x.key === q.key ? { ...x, weightage: e.target.value } : x))
                    )
                  }
                  placeholder="Weightage %"
                />
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <Toggle
                    checked={q.mandatory}
                    onChange={(v) =>
                      setQuestions((prev) =>
                        prev.map((x) => (x.key === q.key ? { ...x, mandatory: v } : x))
                      )
                    }
                    label="Mandatory"
                  />
                  Required
                </label>
                <button
                  type="button"
                  aria-label={`Remove question ${i + 1}`}
                  disabled={questions.length === 1}
                  onClick={() => setQuestions((prev) => prev.filter((x) => x.key !== q.key))}
                  className="rounded p-2 text-gray-400 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div
            className={`mt-3 rounded-lg px-3 py-2 text-xs ${
              totalWeightage === 100
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            Weightage totals {totalWeightage}%.{" "}
            {totalWeightage === 100 ? "Ready to save." : "Must reach 100% before this can be saved."}
          </div>
        </div>
      </Modal>
    </Card>
  );
}
