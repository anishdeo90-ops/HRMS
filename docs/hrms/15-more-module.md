# HRMS — More module

Captured: 2026-08-10 · batch 15
Left rail → `More`

Tabs: **Job Opening · Inventory ⬜ · Announcements · Bill Reimbursement Approval**

---

## 1. ⭐ Job Openings — the second ATS seam

Sub-tabs: `My Jobs` · `All Jobs`
Buttons: `+ Add Job` · **`Refer Candidate`**
Toolbar: `Search` · `Filter` · `Reset` · `Export CSV`

| Column | |
|---|---|
| Job Title | |
| Experience (Year) | |
| **Budget (Lacs per annum)** | Indian units |
| No of Openings | headcount |
| Priority | |
| Status | |
| Created By | |
| **Created At** · **In Progress Date** · **Closed Date** | lifecycle |
| Actions | |

Horizontal scrollbar present — more columns beyond `Actions` ⬜.
`Total Records Count is 0`.

### 1.1 This is a requisition table, and the ATS already has three

The ATS repo already carries `jobs`, `job_creation_requests` and
`hiring_requests`. This screen is a **fourth** copy of the same concept, living in
HRMS with no connection to any of them.

**Decision — HRMS gets no jobs table.** The requisition stays in the ATS as the
single source, and `More → Job Opening` becomes a **view** of it rendered inside
the HRMS shell:

```
ats.jobs  ──(read)──▶  HRMS "Job Opening" tab
   │                        │
   │                        └─ "Refer Candidate" ──(write)──▶ ats.candidates
   └──────────── entity_links ────────────────────────────────┘
```

`My Jobs` / `All Jobs` is a filter on the viewer, not a second dataset.

### 1.2 ⭐ `Refer Candidate` — the referral loop

An employee referring a candidate is a **candidate source that originates in HRMS
and must land in the ATS**. It is also the clearest example of why the linkage has
to run both ways:

```
employee ──refers──▶ ats.candidate ──hired──▶ onboarding_case ──▶ new employee
    ▲                                                │
    └──────── referral bonus (payroll) ◀─────────────┘
```

The referrer must be resolvable from the hire months later, or the bonus cannot be
paid. That is a single `entity_links` row written at referral time:

```
entity_links: hrms.employees ──referred──▶ ats.candidates
```

Without it, referral bonuses become a spreadsheet — which is exactly the class of
problem this project exists to remove.

⬜ Not captured: the `Refer Candidate` form. Worth one screenshot — it is the only
place in the whole product where HRMS *writes into* recruiting.

### 1.3 ⚠ Three lifecycle dates as columns

`Created At` · `In Progress Date` · `Closed Date` — the requisition's state
transitions stored as three columns. The ATS does the same thing
(`20260718082254_candidate_stage_activity_dates.sql`).

It works until a fourth state appears, or a job is reopened, at which point
`In Progress Date` means "the first time" or "the last time" and nobody knows
which. **Ours derives all three from `entity_events`** — the transitions are
already being recorded, so the dates are a query, not columns to keep in sync.

### 1.4 `Budget (Lacs per annum)` — link it to the offer

The requisition carries a budget; Candidate Approval carries
`Offered Annual Salary` (`14-onboarding.md §3`). Nothing connects them, so nobody
is told when an offer exceeds the budget it was raised against.

With the seam in place that check is trivial and belongs at offer approval:

```
onboarding_case.offered_annual_salary  vs  ats.jobs.budget_annual
   → flag on the Candidate Approval screen, before Approve is enabled
```

Store the budget in **paise as an integer** like every other money value
(`10-foundation-spec.md §8`) and render "Lacs" as a display format. "Lacs per
annum" as a stored unit will not survive the first non-Indian tenant.

---

## 2. Announcements

`Title · Category · Active · Actions` · `+ Add Announcement` · empty.

### 2.1 Confirms the `Announcement Category` master

`Category` is the FK target for the `Announcement Category` master under
`Settings → ORGANIZATION STRUCTURE` (`11-org-structure-masters.md`, still
uncaptured). No longer worth capturing separately — it is a flat name list like
its siblings.

This is the **admin side** of the announcement widget on the HRMS Dashboard
(`01-dashboard.md`).

### 2.2 ⚠ `Active` is a boolean where dates are needed

An announcement about Tuesday's fire drill should stop showing on Wednesday.
A boolean means someone has to remember to switch it off, and nobody does — so
the dashboard fills with stale notices and people stop reading it.

```sql
announcements
  id, org_id, title, body,
  category_id fk,
  published_at timestamptz, expires_at timestamptz NULL,
  audience_scope text, audience_scope_id uuid,   -- reuse policy_assignments scopes
  is_pinned bool, created_by
```

`audience_scope` matters as much: a branch-specific notice should not reach every
employee in the company. Same resolver as everything else
(`13-performance-review.md §3.5`).

---

## 3. ⭐ Bill Reimbursement Approval — proves the multi-step approval design

Title: `Claim Approval Records`
Toolbar: `Filter` · `Reset` · `Export CSV ▾` · `Approve` · `Reject` (bulk)

| Column |
|---|
| ☐ · **Claim Code** · Date · Employee Code · Employee Name · **Total Amount** |
| **Final Status** · **RM Status** · **Admin Status** · Actions |

### 3.1 Three status columns for a two-step chain

`RM Status` (reporting manager) and `Admin Status` are the two approval steps;
`Final Status` is the outcome. So the approval **chain is denormalised into one
column per approver**.

A two-step chain needs three columns. A three-step chain needs four. Add a
Business Head step and every query, export and filter changes.

**This is the clearest possible confirmation of the approval engine in
`10-foundation-spec.md §5`** — `approval_requests` with an ordered
`approval_steps` child, one row per approver:

```sql
approval_steps
  request_id fk, sequence int,
  approver_source text,      -- 'manager'|'admin'|'business_head'|'role'|'explicit'
  approver_employee_id fk,
  status text,               -- 'pending'|'approved'|'rejected'|'skipped'
  acted_at, comment
```

`Final Status` is then **derived** — rejected if any step rejected, approved when
the last step approves, pending otherwise. Adding a step is a config row, not a
migration.

### 3.2 The eleventh request type, built separately again

Bulk `Approve` / `Reject`, its own screen, its own status vocabulary — like
candidate approval (`14-onboarding.md §4`) and goal approval
(`13-performance-review.md §2.2`). Eleven request types, eleven screens, and no
single queue anywhere.

### 3.3 `Total Amount` implies claim lines

A claim has a total, and `Me → Bill Reimbursement` (`04-me.md §5`) collects an
expense type per entry. So a claim is a header with line items:

```sql
expense_claims
  id, org_id, employee_id, claim_code, claim_date,
  total_amount_paise bigint,        -- derived from lines
  status text
expense_claim_lines
  claim_id fk, expense_type_id fk, expense_date date,
  amount_paise bigint, description, receipt_asset_id fk
```

`Total Amount` is **derived from the lines**, never typed — otherwise the header
and the receipts disagree and finance has to reconcile by hand.

### 3.4 Reimbursement is the fourth HRMS → Payroll flow

After overtime, leave encashment and attendance deductions
(`10-foundation-spec.md §6.2a`), approved claims are paid — typically through
payroll as a non-taxable reimbursement line.

```
expense_claims (approved) ──entity_link──▶ payroll earning line
```

Which means a claim, once paid, must become **immutable**. Ours locks it on
payment rather than relying on nobody editing it.

`Claim Code` — another generated code, alongside `KRA Code` and `Cycle Code`
(`13-performance-review.md §3.3`). Reinforces auto-generation as the default.

---

## 4. Inventory ⬜

Not captured. Expected to be asset management, and almost certainly the source of
the **`Assets` tab on the employee record** (`05-employee-record.md §5F`) and of
the `De-Allocate Device` cron (`12-… §4.3`).

```sql
assets                    -- the inventory
  id, org_id, asset_code, category_id, make, model, serial_number,
  purchase_date, status   -- 'in_stock'|'allocated'|'in_repair'|'retired'
asset_allocations         -- the employee-record Assets tab
  asset_id fk, employee_id fk,
  allocated_on, returned_on, condition_out, condition_in, notes
```

Worth one screenshot to confirm, but nothing here blocks the schema.

---

## 5. What this module settles

| | |
|---|---|
| Does HRMS need its own jobs table? | **No** — the ATS requisition is the source; this tab is a view (§1.1) |
| Where does HRMS write *into* the ATS? | **`Refer Candidate`** — the only such path (§1.2) |
| Does the approval engine need multi-step? | **Yes, confirmed** — `RM Status` + `Admin Status` + `Final Status` is a chain flattened into columns (§3.1) |
| Announcement Category master? | Confirmed as a flat FK target; no separate capture needed (§2.1) |
| How many bespoke approval screens? | **Eleven** |

## 6. Not captured

- ⬜ `Inventory` tab (§4)
- ⬜ `Refer Candidate` form — **the one worth having** (§1.2)
- ⬜ `+ Add Job` form · columns right of `Actions` on Job Openings
- ⬜ `+ Add Announcement` form
- ⬜ A populated claim row / the claim detail view
