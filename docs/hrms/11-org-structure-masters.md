# HRMS — Organization Structure masters

Captured: 2026-08-08 · batch 10
Menu: ⚙ → `ORGANIZATION STRUCTURE`

| Item | Captured |
|---|---|
| Branch | ⬜ |
| Business Unit | ✅ §0 |
| Department | ✅ §1a |
| Sub-Department | ⬜ |
| Designation | ✅ §1 |
| Employement Type | ✅ §2 *(spelled thus in the product)* |
| Function Role | ✅ §3 |
| Work Hours & Shifts | ✅ `08-masters.md §3` |
| Roster | ✅ `09-org-settings.md §1` |
| Announcement Category | ⬜ |
| General Settings | ✅ `09-org-settings.md §2` |

---

## 0. Business Unit — ✅ resolves open question #3

`+ Add Business Unit` · search · `Total Records Count is 0` — **empty in this tenant.**

| Column |
|---|
| Business Unit Name · Actions |

### `Add Business Unit` modal

| Field | Req | Control |
|---|---|---|
| Business Unit Name | ✱ | text — *"Enter Business name"* |
| Business Unit Head Name | ✱ | select — **list of employees** |

Head dropdown options: `Anish Trivedi` · `Anjali Singh` · `Priya Sharma` ·
`Rajesh Kumar` · `Sanjay Gupta` · `Vikram Patel` — all six directory employees,
unfiltered by role, designation or seniority.

### The answer to #3

**Business Unit is a flat list, independent of Department.** Department is
name-only with no business-unit column (§1a), and Business Unit has no department
column. In the reference they are two unrelated axes, both set directly on the
employee record. So Business Unit is *not* a third level of the department tree.

**Ours:** `departments.business_unit_id` — a BU owns departments, and an employee's
BU is derived from their department rather than typed twice. Keep
`employees.business_unit_id` nullable as an override for staff who sit outside the
departmental structure.

### ⚠ The important half — this is the first master with a relationship

`Business Unit Head Name` is a real FK to an employee. That matters more than the
master itself, because it **explains `Business Head` on the employee record**
(`05-employee-record.md §5`): it is not a field someone types per employee, it
resolves through the employee's business unit.

```sql
business_units
  id, org_id, name, code,
  head_employee_id fk → hrms.employees,   -- "Business Unit Head Name"
  sort_order, is_active
```

**And it closes the approval engine's last loose end.** `10-foundation-spec.md §5`
defines `approver_source = 'business_head'`; this is how it resolves:

```
employee → department → business_unit → head_employee_id
```

No stored approver, no duplication. Change the BU head once and every pending
request routes to the new person.

### Two consequences

1. **The head must be nullable in the database even though the form marks it ✱.**
   It's circular on day one: you cannot create a Business Unit without an employee,
   and the Add Employee form asks for a Business Unit. Required at the *form*
   level, nullable at the *schema* level — the same principle as
   `10-foundation-spec.md §1` ("required-ness belongs to forms, not columns").
2. **`Business Head` on the employee record must be read-only and derived.** If it
   stays an editable field, it drifts from `business_units.head_employee_id` and
   approvals route to someone who left. Add it to `§4.4 Derived, never stored`.

⬜ Not captured: whether the head dropdown excludes the BU's own members, and
whether an employee can head more than one BU (assume yes — `head_employee_id` is
on the BU side, so it's naturally one-to-many).

---

## 1. Designation

`+ Add Designation` · search · pagination `25 / Page`

| Column |
|---|
| Designation · Actions (✏ 🗑) |

### Live data
`Software Engineer` · `Marketing Manager` · `Sales Executive` · `HR Specialist` ·
`Financial Analyst` — `Total Records Count is 5`

Matches the five populated employees in the directory (`02-team.md §2`).

---

## 1a. Department

`+ Add Department` · search · pagination `25 / Page`

| Column |
|---|
| Department · Actions (✏ 🗑) |

### Live data
`Engineering` · `Marketing` · `Sales` · `HR` · `Finance` — `Total Records Count is 5`

Matches the five departments on the employee directory rows.

### ⚠ No parent field — so `Sub-Department` is a second table

The list shows **name only**. There is no parent column, no nesting, no indent.
Combined with `Sub-Department` existing as its own separate menu item, this confirms
the reference **splits one hierarchy across two tables**.

That's the failure mode flagged in `10-foundation-spec.md §3.3`, now observed
rather than predicted. It breaks the first time anyone needs three levels
(Engineering → Platform → Infrastructure), and every query that wants "everyone
under Engineering" has to union two tables and know which is which.

**Ours stays one table:**

```sql
departments
  id, org_id, name, code,
  parent_id fk → departments,   -- NULL = top level; sub-departments nest here
  business_unit_id fk,
  head_employee_id fk → employees,   -- "Business Head" on the employee record
  sort_order, is_active
```

Arbitrary depth, one query with a recursive CTE, and "Sub-Department" becomes a
UI label for `parent_id IS NOT NULL` rather than a separate concept.

---

## 2. Employment Type

Header reads `Employement Type` (product typo); button `+ Add Employment Type`.

| Column |
|---|
| Employment Type Name · Actions |

### Live data
`Probation` — `Total Records Count is 1`

> **This is why 5 of 6 employees show `-` in the directory's `Type` column.**
> Only one employment type exists, assigned to one person.

### ⚠ Design catch — `Probation` is not an employment type

Employment type is *the nature of the contract*: Permanent · Contract · Intern ·
Consultant · Part-time. **Probation is a phase within permanent employment**, and
the employee record already models it correctly and separately:

- `Date Of Confirmation`
- `Confirmation Status`
- and `Probation Period (Days)` in General Settings (`09-org-settings.md §2.2`)

Putting `Probation` in this list means an employee is *either* Permanent *or*
Probation, never "permanent, currently on probation" — so the moment they're
confirmed, their employment type has to be edited, and you lose the fact that they
were ever probationary.

**Ours keeps them separate.** `employment_types` holds contract nature only;
probation is derived from `date_of_joining + probation_period_days` versus
`date_of_confirmation`. Seed: Permanent, Contract, Intern, Consultant, Part-time.

---

## 3. Function Role — ✅ resolves open question #2

`+ Add Role` · search

| Column |
|---|
| Role · Actions |

`Total Records Count is 0` — **empty in this tenant.**

### The answer

Structurally, `Function Role` and `Designation` are **identical**: a flat list of
names with edit and delete. There is no field, relationship, or constraint that
distinguishes them. And Function Role is unused — zero rows, and the `Function`
field on the employee record is blank (`05-employee-record.md §5`).

So the reference provides **no** semantic distinction. It's a second flat list that
nobody filled in.

### Our decision — keep it, but give it a real job

The intent behind the pair is standard and worth honouring:

| | Meaning | Example |
|---|---|---|
| **Designation** | the job title — what's on the business card, what changes on promotion | `Senior Software Engineer` |
| **Function Role** | the job family / function — stable across titles and departments | `Engineering` |

Function survives promotion; designation doesn't. That's what makes headcount-by-
function, career pathing, and salary banding possible. Two engineers in different
departments share a function; a "Manager" in Sales and a "Manager" in Finance do not.

**Model it as a real relationship rather than a parallel flat list:**

```sql
function_roles
  id, org_id, name, code, sort_order, is_active

designations
  id, org_id, name, code,
  function_role_id  fk → function_roles,   -- designation belongs to a function
  salary_grade_id   fk → salary_grades,    -- default band for this title
  sort_order, is_active
```

Then `employees.function_role_id` **defaults from the designation** rather than
being a third thing HR has to remember to set — which is exactly why the
reference's copy is empty.

---

## 4. What these three screens reveal about the reference's masters

All three are **name-only**. No code, no sort order, no active flag, no
relationships to anything else.

That has consequences visible elsewhere in the product:

- `Salary Grade` on the employee record is free-floating (`A`) because no
  designation maps to a grade — so grade is set by hand, per employee, every time.
- Deleting a designation has a 🗑 with no visible guard. What happens to employees
  holding it is ⬜ unknown, and "nothing" is the likely answer.
- Dropdowns can't be ordered meaningfully, only alphabetically.

**Our masters carry the fields from `10-foundation-spec.md §3.3`** —
`code`, `sort_order`, `is_active` — plus:

1. **Soft delete only.** `is_active = false`, never a hard delete. A designation in
   use by a historical employee record must remain resolvable forever.
2. **Referential integrity.** Deactivating hides it from dropdowns; it does not
   orphan the employees holding it.
3. **Relationships where they earn their keep** — designation → function_role,
   designation → salary_grade — so that setting one field fills in two.

---

## 5. Question #3 — ✅ resolved

**Department is flat, with no parent field** (§1a) → Department and Sub-Department
are two tables for one hierarchy in the reference; our `departments.parent_id`
replaces both.

**Business Unit is a separate axis, not a tree level** (§0) → `departments.business_unit_id`.

Final shape of the org hierarchy:

```
organization
  └── business_unit          (head_employee_id → the "Business Head")
        └── department       (parent_id → sub-departments, arbitrary depth)
              └── employee   (designation → function_role + salary_grade)

branch / work_location — orthogonal, physical, not part of the tree
```

⬜ Still not captured: Branch, Announcement Category. Both expected to be flat
name-only lists; neither blocks the schema.
