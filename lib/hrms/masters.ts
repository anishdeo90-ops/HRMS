import {
  DEMO_ANNOUNCEMENT_CATEGORIES,
  DEMO_BRANCHES,
  DEMO_BUSINESS_UNITS,
  DEMO_DEPARTMENTS,
  DEMO_DESIGNATIONS,
  DEMO_EMPLOYMENT_TYPES,
  DEMO_EXPENSE_TYPES,
  DEMO_FUNCTION_ROLES,
  DEMO_SUB_DEPARTMENTS,
} from "./demo-data";
import type { LookupItem } from "./types";

/**
 * The flat organisation masters, behind one screen.
 *
 * `docs/hrms/11-org-structure-masters.md` — these differ only in their label,
 * whether they carry a code, and what they hang off. Building eleven near
 * identical CRUD screens is how a settings area rots, so there is one.
 */

export interface MasterDefinition {
  slug: string;
  label: string;
  /** Plural, used in headings and empty states. */
  plural: string;
  description: string;
  items: LookupItem[];
  hasCode: boolean;
  /** Set when rows belong to a parent master. */
  parentLabel?: string;
  parentOptions?: LookupItem[];
  /** Business Unit alone names a head, because approvals resolve through it. */
  hasHead?: boolean;
  hasDescription?: boolean;
}

export const MASTERS: MasterDefinition[] = [
  {
    slug: "branch",
    label: "Branch",
    plural: "Branches",
    description: "Physical locations. Holiday calendars and announcements scope to these.",
    items: DEMO_BRANCHES,
    hasCode: true,
  },
  {
    slug: "business-unit",
    label: "Business Unit",
    plural: "Business Units",
    description:
      "Owns departments and names a head. `approver_source = business_head` resolves from here.",
    items: DEMO_BUSINESS_UNITS,
    hasCode: true,
    hasHead: true,
  },
  {
    slug: "department",
    label: "Department",
    plural: "Departments",
    description: "Reports into a business unit. Departments and business units are separate axes, not tree levels.",
    items: DEMO_DEPARTMENTS,
    hasCode: true,
    parentLabel: "Business Unit",
    parentOptions: DEMO_BUSINESS_UNITS,
  },
  {
    slug: "sub-department",
    label: "Sub-Department",
    plural: "Sub-Departments",
    description: "One level below department.",
    items: DEMO_SUB_DEPARTMENTS,
    hasCode: false,
    parentLabel: "Department",
    parentOptions: DEMO_DEPARTMENTS,
  },
  {
    slug: "designation",
    label: "Designation",
    plural: "Designations",
    description: "Job titles. KRAs and appraisal templates attach to these.",
    items: DEMO_DESIGNATIONS,
    hasCode: true,
  },
  {
    slug: "employment-type",
    label: "Employment Type",
    plural: "Employment Types",
    description: "Permanent, contract, intern, consultant. Drives notice period and document checklists.",
    items: DEMO_EMPLOYMENT_TYPES,
    hasCode: true,
  },
  {
    slug: "function-role",
    label: "Function Role",
    plural: "Function Roles",
    description:
      "What a person does, independent of their title — which is why it is separate from Designation.",
    items: DEMO_FUNCTION_ROLES,
    hasCode: false,
    hasDescription: true,
  },
  {
    slug: "announcement-category",
    label: "Announcement Category",
    plural: "Announcement Categories",
    description: "The lookup announcements are filed under.",
    items: DEMO_ANNOUNCEMENT_CATEGORIES,
    hasCode: false,
  },
  {
    slug: "expense-type",
    label: "Expense Type",
    plural: "Expense Types",
    description:
      "A strict list. Free-typed types fill the master with `Travel`, `travel` and `Trvl`, and every expense report becomes unusable.",
    items: DEMO_EXPENSE_TYPES,
    hasCode: false,
  },
];

export function masterBySlug(slug: string): MasterDefinition | undefined {
  return MASTERS.find((m) => m.slug === slug);
}
