# HRMS Target — Navigation Map

Running inventory of the reference HRMS being modelled (`hrms.weekmate.in`).
Built up screenshot by screenshot. **Incomplete** — sections marked `⬜ not yet captured`.

Source tenant: COSMOS Staffing and Facility Services LLC
Captured: 2026-08-08 · batch 1 (5 screens)

---

## 1. URL structure

Observed on the Announcements screen:

```
https://hrms.weekmate.in/797621/announcement
                        └─────┘ └──────────┘
                     company slug  page slug
```

**Multi-tenant, company slug in the path.** ⚠ **Corrected 2026-08-08:** `797621`
is **not** the org id — it is the user-editable **Company Slug** from
`Settings → Company Profile` (`07-settings.md §1`), which merely looks numeric in
this tenant. The real tenant id is never exposed.

**Our decision** (`10-foundation-spec.md §2.1`): multi-tenant, but org resolved
from the **session**, not the URL. We keep `organizations.slug` for public handles
and per-tenant branding, and keep URLs clean.

---

## 2. Left sidebar (primary nav)

| # | Item | Status |
|---|------|--------|
| 1 | Dashboard | ✅ `01-dashboard.md` |
| 2 | Me | ✅ `04-me.md` |
| 3 | Team | ✅ `02-team.md` · `05` · `06` — all 8 tabs |
| 4 | Performance Review | ✅ `13-performance-review.md` — all 7 tabs |
| 5 | Onboarding | ✅ `14-onboarding.md` — all 7 tabs |
| 6 | **Survey** | 🚫 **out of scope** — decided 2026-08-10 |
| 7 | **Learning** | 🚫 **out of scope** — decided 2026-08-10 |
| 8 | More | ✅ `15-more-module.md` (Inventory tab ⬜, modelled from the employee Assets tab) |
| 9 | **Organization Tree** | 🚫 **out of scope as a module** — decided 2026-08-10 |

> **Scope decision — 2026-08-10 (Anish).** Survey, Learning and Organization Tree
> are not being built. Nothing in the foundation depends on them, and no captured
> screen references them.
>
> Organization Tree is worth a note: it is a *visualisation* of
> `business_units → departments → employee_assignments`, all of which exist in the
> schema regardless. If it is ever wanted it is a read-only view over data already
> there, not a module — so dropping it costs nothing and reverses cheaply.
>
> **Capture is complete as of this date.** Every remaining ⬜ in these documents is
> a dropdown option list, a form behind a button, or a filter panel — each noted in
> place, none blocking. See `10-foundation-spec.md §11`: no blocking questions
> remain.

Sidebar is icon + label, dark navy, single level. Flyout opens on hover/click
with the module's pages. The same pages also appear as a **horizontal tab strip**
under the org name once inside the module — two routes to the same pages.

---

## 3. Module → page inventory

### 3.1 Dashboard
No sub-pages. Widget grid. See `01-dashboard.md`.

### 3.2 Me
⬜ not yet captured

### 3.3 Team → see `02-team.md`
1. Employee Directory
2. Employee-In-Out
3. Separation
4. Reports
5. Tickets
6. Admin Approvals
7. Pending Tasks
8. Admin-Regularization

### 3.4 Performance Review
1. Dashboard
2. Goals
3. KRA — sub-tabs: `My KRAs`, `KRA Master`
4. Appraisals
5. Reports
6. Performance Cycles
7. Appraisal Templates

> KRA table columns seen (empty state): KPI Name, Score, Measurement,
> Weightage, Assigned Date, Actions. Value shapes unknown — needs a populated row.

### 3.5 Onboarding
⬜ not yet captured

### 3.6 Survey
⬜ not yet captured

### 3.7 Learning
⬜ not yet captured

### 3.8 More
1. Mood Analytics
2. Job Opening
3. Inventory
4. Announcements
5. Bill Reimbursement Approval

### 3.9 Organization Tree
⬜ not yet captured

---

## 4. Settings menu (⚙ in top bar)

Two columns. **This is the master-data list — it defines the foundation schema.**

### GENERAL
| Item | Likely nature |
|------|---------------|
| Company Profile | Single record per org |
| System Settings | Key/value config |
| Policy Setup | Policy documents / rules |
| Permission Management | Roles + permissions |
| Email Master | Email templates |
| Document Master | Document types required per employee |
| Cron Master | User-configurable scheduled jobs |
| Leave Settings | Leave types, accrual, cycles |
| Holiday Calendar | Holiday lists per branch/region |
| Achievements | Recognition/badge catalogue |
| Activity Logs | Audit trail |
| Face Identity Vault | Biometric face templates for attendance |

### ORGANIZATION STRUCTURE
| Item | Notes |
|------|-------|
| Branch | Physical location / office |
| Business Unit | Above or beside department |
| Department | |
| Sub-Department | Implies a 2-level hierarchy, or `parent_id` on department |
| Designation | Job title |
| Employement Type | *(spelled thus in the product)* — permanent / contract / intern |
| Function Role | Distinct from Designation — needs clarification |
| Work Hours & Shifts | Shift definitions |
| Roster | Shift assignment to employees |
| Announcement Category | Lookup for announcements |
| General Settings | |

---

## 5. Top bar

- Org name (left) — `COSMOS Staffing and Facility Services LLC`
- ⋮⋮⋮ waffle — product switcher (same pattern we just built)
- ⚙ gear — settings menu above
- User avatar + name + dropdown ⬜ dropdown contents not captured
- Floating assistant button (bottom-right, "M") — present on every screen

---

## 6. Cross-product linkage points spotted so far

These are the seams where HRMS meets our existing ATS and future Payroll.

| Screen | Element | Links to |
|--------|---------|----------|
| Dashboard | `Job Opening` widget (New This Week / Active Openings / On Hold / Current Strength) | **ATS** — jobs / requisitions |
| More | `Job Opening` page | **ATS** — same source |
| Dashboard | `Upcoming New Joinees` | **ATS** — accepted offers not yet joined |
| More | `Bill Reimbursement Approval` | **Payroll** — reimbursements paid via payroll |
| Team | `Separation` | **Payroll** — final settlement |
| Team → Reports | Leave Balance, Attendance Register | **Payroll** — LOP / attendance-linked pay |
| Settings | Face Identity Vault | Attendance capture source |

---

## 7. Open questions

1. **`Function Role` vs `Designation`** — two separate masters. What distinguishes them?
2. **`Business Unit` vs `Department` vs `Sub-Department`** — is this a strict 3-level tree, or are BU and Dept independent axes?
3. **Is Payroll a module here or a separate product?** No payroll entry in the sidebar or settings. `Bill Reimbursement Approval` sits under More, which suggests payroll lives elsewhere.
4. **Multi-tenancy** — do we adopt the `/{orgId}/` URL scheme, or single-tenant per deployment?
5. **`Inventory`** under More — asset allocation to employees? Unconfirmed.
