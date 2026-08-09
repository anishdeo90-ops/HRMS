# HRMS — Employee record (detail / edit view)

Captured: 2026-08-08 · batch 4
Route: `Team → Employee Directory → <row>`
Specimen: **Sanjay Gupta**, `EMP6`, Financial Analyst, Finance

This is the spine of the whole system. Every other module FKs to it.

---

## 1. Header card

| Element | Observed |
|---|---|
| Avatar | `+ Upload Image` placeholder |
| Name | `Sanjay Gupta` + green status pill |
| Email | `sanjay.gupta@797621.com` |
| 💼 | `Financial Analyst` — designation |
| 🪪 | `EMP6` — employee code |
| 👤 | `-` — reporting manager |
| 📅 | `23-07-2026` — date of joining |
| 🤝 | `-` — ⬜ unidentified icon |
| Right | **`14%` donut — "Profile Completion"** |

> **The work email is system-generated:** `firstname.lastname@{orgId}.com` —
> `797621` is the tenant id from the URL. Not a real mailbox; a generated login
> identifier. We should decide deliberately whether to mint work emails or require
> a real one, because this affects how employees log in.

---

## 2. Tabs

`Personal Details` · `Employment Details` · `Documents` · `Contact Details` ·
`Banking Details` · `Additional Info` · `Overview` · `Assets`

| Tab | Captured | Contents |
|---|---|---|
| Personal Details | ✅ | §4 — basic info, addresses, education, experience, certificates |
| Employment Details | ✅ | §5 — job, managers, grades, ATS provenance, attendance config |
| Documents | ✅ | §5A — pre-seeded document checklist + generation |
| Contact Details | ✅ | §5B — emergency contacts only |
| Banking Details | ✅ | §5C — identity proofs + two bank accounts |
| Additional Info | ✅ | §5D — **PF / UAN / ESI statutory** |
| Overview | ✅ | §5E — performance rollup |
| Assets | ✅ | §5F — allocated assets |

**All 8 tabs captured.** The employee spine is fully mapped.

---

## 3. Profile Completion — a real feature, not decoration

Three completion figures observed:

| Scope | Value |
|---|---|
| Overall (header donut) | `14%` |
| Personal Details → Basic Information | `5% Complete` (red dot) |
| Employment Details → Employment Information | `24% Complete` (red bar) |

So completeness is computed **per section** and rolled up. Each section has its own
progress bar and colour state. That implies a configuration of which fields count
and what each is worth — not a naive `filled ÷ total`.

> Model as a `profile_completion_rules` config (section, field, weight, required_for)
> evaluated on read. Hardcoding percentages means HR can never change what "complete"
> means without a deploy.

---

## 4. Personal Details tab

### 4.1 Basic Information → Personal Information

| Field | Value | On Add form? |
|---|---|---|
| Gender | `Male` | ✅ |
| Father / Husband Name | `-` | ✅ (as "Father's Name") |
| Mother Name | `-` | ✅ |
| **Blood Group** | `-` | ❌ new |
| Personal Email ID | `-` | ✅ |
| Marital Status | `-` | ✅ |
| **Spouse Name** | `-` | ❌ new |
| **Work Phone No.** | `-` | ❌ new |
| **Nationality** | `-` | ❌ new |
| **Hidden Talent** | `-` | ❌ new |
| Personal Phone No. | (blank) | ✅ |

> `Father / Husband Name` as one field is a legacy Indian-forms convention. Ours
> should keep `father_name` and `spouse_name` separate — they already have
> `Spouse Name` as its own field, so the combined label is inconsistent with their
> own schema.

### 4.2 Residency Information

**Two full addresses**, side by side:

| Present Address | Permanent Address |
|---|---|
| Address | Address |
| City · State | City · State |
| Country · Pincode | Country · Pincode |

> The Add Employee form captured **one** address plus Country/State/District/
> City/Pin. The detail view has two. So address belongs in a child table
> `employee_addresses (employee_id, type 'present'|'permanent', …)`, not as columns.

### 4.3 Educational Details

Accordion, four fixed levels:

| Row | Badge |
|---|---|
| SSC (Secondary School Certificate) | `Class 10` |
| HSC (Higher Secondary Certificate) | `Class 12` |
| Graduation | `Bachelor's Degree` |
| Masters | `Master's Degree` |

⬜ Expanded contents not captured — presumably institution, board/university,
year, percentage, document upload.

> Indian education convention. Model as `employee_education (employee_id,
> level enum, institution, board, year, score, document_url)` — a **table with a
> level enum**, not four hardcoded blocks. Someone will eventually have a PhD,
> a diploma, or two graduations.

### 4.4 Experience Details
Table — `Company Name` · `Start Date` · `End Date` · `Designation` · `Action`. Empty.
→ child table `employee_prior_experience`.

### 4.5 Additional Certificates
Table — `Name` · `File Name` · `Issued By` · `Expiry Date` · `Action`. Empty.
→ child table `employee_certificates`. **`Expiry Date` implies renewal tracking** —
certificates that lapse should raise a notification.

---

## 5. Employment Details tab

`Employment Information` — `24% Complete`. Has an **eye icon** alongside the edit
pencil (⬜ purpose unknown — field-level visibility? audit view?).

| Field | Value | On Add form? |
|---|---|---|
| Employee ID | `EMP6` | ✅ |
| Punching Employee Code | `-` | ✅ |
| First / Middle / Last Name | `Sanjay` / `-` / `Gupta` | ✅ |
| Date of Birth | **`Invalid date`** ⚠ | ✅ |
| Date of Joining | `23-07-2026` | ✅ |
| Branch | `-` | ✅ |
| Department | `Finance` | ✅ |
| **Sub-Department** | `-` | ❌ new |
| Designation | `Financial Analyst` | ✅ |
| Employee Type | `-` | ✅ |
| **Work Location** | `-` | ❌ new — distinct from Branch |
| Reporting Manager Name | `-` | ✅ |
| Reporting Manager (Employee Code) | `-` | — |
| Assistant Reporting Manager Name | `-` | ✅ |
| Assistant Reporting Manager (Employee Code) | `-` | — |
| **L-2 Manager (Employee Code)** | `-` | ❌ new |
| Buddy | `-` | ✅ |
| Referred By | `-` | ✅ |
| **Last Working Date** | `-` | ❌ new — separation |
| Business Unit | `-` | ❌ new on form |
| **Business Head** | `-` | ❌ new |
| **Function** | `-` | ❌ new — the `Function Role` master |
| Salary Grade | `A` | ✅ |
| Experience Grade | `A` | ✅ |
| Appraisal | `-` | ✅ |
| **Last Organization** | `-` | ❌ new |
| **Last Held Designation** | `-` | ❌ new |
| **Date Of Confirmation** | `-` | ❌ new — probation |
| **Confirmation Status** | `Yes` | ❌ new |
| **Source of Hire** | `-` | ❌ **ATS linkage** |
| **Source Name** | `-` | ❌ **ATS linkage** |
| **Recruiter Name** | `-` | ❌ **ATS linkage** |
| Signature | `-` | ✅ |
| **In-Out Applicable** | `Yes` | ❌ new — attendance opt-in |
| **Permanent WFH** | `No` | ❌ new |
| **Shift** | `Morning Shift` | ❌ new |

### 5.1 ⚠ `Date of Birth: Invalid date`
A live rendering bug in the reference product — an unparseable value reaching the
UI as the literal string "Invalid date". Ours validates on write and renders `—`
on read. Noting it because it is exactly the class of bug that survives a rebuild
if you port behaviour instead of intent.

### 5.2 Four management relationships, not one
`Reporting Manager` · `Assistant Reporting Manager` · `L-2 Manager` · `Business Head`.

Each stored **twice** — once as a name string, once as an employee code. That
denormalisation is what we're explicitly avoiding: a single `manager_id` FK, with
name and code resolved on read.

Approval routing therefore has multiple axes: the direct line (RM → L-2), a
fallback (ARM), and an org axis (Business Head). The approval engine's `steps`
config must be able to name any of these, not assume "manager of".

### 5.3 The ATS seam is already here, as flat text
`Source of Hire`, `Source Name`, `Recruiter Name` — the reference product stores
recruitment provenance as **three free-text strings on the employee row**.

This is precisely the hardcoding you wanted to avoid. In ours:
- `Source of Hire` → FK to a source master (shared with the ATS's existing `masters` table)
- `Recruiter Name` → FK to the recruiter's employee/profile record
- The candidate→employee link → one `entity_links` row, giving the full trace back
  to the application, the job, and the requisition

That single change is the difference between "we typed the recruiter's name" and
"click through from the payslip to the job ad that hired them."

### 5.4 Attendance configuration lives on the employee
`In-Out Applicable`, `Permanent WFH`, `Shift`. So whether attendance is tracked at
all is a **per-employee flag** — field staff and senior management are typically
exempt. The attendance day-register generator must respect it, or you generate
absent rows for people who don't punch.

---

## 5A. Documents tab

Actions: `⬆ Upload Documents` · `📄 Generate Documents`

| Column | |
|---|---|
| # | `01`, `02`, … |
| Documents | document name |
| Comments | |
| Expiry Date | |
| Status | ● `Pending` |
| Action | 👁 view · 🖨 print · 🗑 delete (all greyed until uploaded) |

### Pre-seeded rows (live)
`01 Aadhar Card` · `02 Pan Card` · `03 Latest Education Certificate` ·
`04 Electricity Bill` · `05 Bank Statement` · `06 Last Appraisal Documents`
*(more below fold ⬜)*

> **This is a checklist, not an upload folder.** Rows exist before any file does,
> each sitting at `Pending`.
>
> ⚠ **Corrected 2026-08-08:** an earlier version of this note said the checklist is
> seeded from `Settings → Document Master`. It is not — Document Master holds
> *generation templates* for the `Generate Documents` button (`08-masters.md §2`).
> Where the reference configures this checklist is currently unknown; our design
> needs a `document_types` master regardless.
>
> Model: `document_types` (master, with `is_mandatory`, `has_expiry`) →
> `employee_documents (employee_id, document_type_id, file_url, status, expiry_date, comments)`.
> Rows materialise on employee creation. `Expiry Date` + the certificates tab
> means **document renewal tracking** needs a notification job.

**`Generate Documents`** is a template engine — offer letters, appointment letters,
experience letters, produced from the employee record. That explains the
`Signature` field in Employment Details and `Upload Signature` on the Add form:
generated letters are signed with a stored signature image.

---

## 5B. Contact Details tab

Single section: **Emergency contacts** · `+ Add new` · search.

| Column | |
|---|---|
| # · Name · Contact No. · Relationship · Action |

Child table `employee_emergency_contacts`. Multiple rows supported.

> Note the tab is named "Contact Details" but holds *only* emergency contacts —
> the employee's own phone/email live under Personal Details. Ours should name
> this tab what it contains.

---

## 5C. Banking Details tab

Three edit-able sections.

### Identity Proofs
| Field | |
|---|---|
| Aadhar Card No. | government ID |
| PAN Card No. | tax ID |

### Salary Account Information
`Bank Name` · `Salary Account No.` · `Salary IFSC Code` · `Cancelled Cheque` (file)

### Personal Account Information
`Bank Name` · `Personal Account No.` · `Personal IFSC Code` · `Cancelled Cheque` (file)

> **Two bank accounts, deliberately separated.** Salary credit goes to one;
> reimbursements or personal transfers may go to the other. Model as
> `employee_bank_accounts (employee_id, purpose 'salary'|'personal', …)` — a child
> table, because a third purpose will appear eventually.

---

## 5D. Additional Info tab — **the statutory payroll block**

| Field | |
|---|---|
| PF Number | Provident Fund account |
| UAN Number | Universal Account Number (portable PF id) |
| ESI Applicability | yes/no — Employee State Insurance eligibility |
| ESI Number | ESI account |

> **This is India statutory payroll, sitting on the HRMS employee record.**
> Together with `Configure Payroll` on the Add form, the Banking tab, and
> `Salary Grade`, it confirms the HRMS↔Payroll boundary runs *through* the
> employee record rather than around it.
>
> `ESI Applicability` is a rule, not a fact — ESI applies below a wage threshold.
> Storing it as a stored flag means it goes stale when someone's salary crosses
> the threshold. Ours should derive it and let HR override, recording the override.

---

## 5E. Overview tab — performance rollup

Three read-only tables aggregating from Performance Review.

### Ranking
Same columns as `Team Ranking` (`02-team.md §4`).

### Performance Review
| Column |
|---|
| Feedback Period · Technical Feedback · Behavioural Feedback · Overall Feedback |

> **New information.** Feedback is split into **Technical** and **Behavioural**
> plus an **Overall**, per feedback period. That's a second, separate rating
> structure from the 8-dimension Ranking — so Performance Review holds at least
> two distinct instruments. Reinforces modelling as `template → criteria → ratings`
> rather than fixed columns.

### Goals
| Column |
|---|
| Goal Name · Employee · Start Date · Target Date · Target · Priority · Status · Created By |

`Created By` implies goals can be set by a manager as well as self-set.

---

## 5F. Assets tab

`My Assets` · search · `Filter` · `Reset` · `Export CSV`

| Column |
|---|
| Asset Code · Name · Brand · Type · Allocation Date |

Confirms `More → Inventory` is an **asset register**, and this tab is the
allocation view. Model: `assets` (register) → `asset_allocations (asset_id,
employee_id, allocated_on, returned_on)`. Return date matters — exit clearance
depends on it, which links Assets → Separation.

---

## 5G. ⚠ Sensitive data — needs a deliberate access policy

This record now holds, in one place: Aadhaar number, PAN number, bank account
numbers and IFSC codes, PF/UAN/ESI numbers, date of birth, home addresses,
blood group, and marital/spouse details.

That is government-ID and financial PII for every employee in the company. The
reference product shows it on a tab like any other. Ours should not:

- **Field-level access control**, not tab-level — a manager needs the Employment
  tab, and has no business seeing bank accounts or Aadhaar.
- **Encrypt at rest** the identity and bank columns.
- **Log every read**, not just every write, for these fields. `entity_events`
  should record who viewed an Aadhaar number and when.
- Mask by default in the UI (`XXXX XXXX 4321`), reveal on explicit action.

This is a decision to make now — retrofitting field-level protection onto a
built-out employee record is far more expensive than designing it in.

> Possibly what the **eye icon** beside the edit pencil on Employment Information
> is for — field visibility. ⬜ Worth checking.

---

## 5H. What's *not* on the employee record

**No salary, CTC, or compensation figure appears on any of the 8 tabs.**

Only `Salary Grade` (a band) and the salary bank account. So actual compensation
lives entirely in the Payroll product, joined by employee. That's a clean
boundary and it validates keeping Payroll separate — HR staff can administer
people without seeing pay.

---

## 6. Field-set divergence: Add form vs detail view

The Add Employee form has ~30 fields. The detail view exposes ~55. **Roughly 25
fields exist only on the detail/edit view.**

That's a deliberate two-stage pattern: create a minimum viable employee at hire,
enrich afterwards — which is what the Profile Completion metric is nudging.

> Design consequence: our `employees` table cannot mark those extra fields
> `NOT NULL`. Required-ness is a property of *the form and the completion rules*,
> not of the column.

---

## 7. Separation (Team tab)

Page: `Manage Resignations`
Actions: `Last working Day List` · `Apply for resignation` · `+ Add Resignation`
Toolbar: `Search` · `Filter` · `Reset` · `Export CSV`

### Columns
`Employee Name` · `Date Of Resignation` · `Last Date As Per Notice Period` ·
`Requested Last Date` · `Last Date` · `Accepted Date` · `Rejected Date` ·
`Cancelled Date` · `Status` · `Actions`

> **Three distinct "last dates"** — and this is the whole business logic of notice
> periods in one row:
> 1. `Last Date As Per Notice Period` — computed from resignation date + the
>    contractual notice period
> 2. `Requested Last Date` — what the employee asked for
> 3. `Last Date` — what was actually agreed
>
> The gap between 1 and 3 is notice shortfall or buyout, which is a **payroll
> deduction**. Collapsing these into one date destroys that calculation.

Both `Apply for resignation` (self-service) and `+ Add Resignation` (HR on behalf)
exist — same record, two entry points.

Separate date columns for `Accepted` / `Rejected` / `Cancelled` alongside `Status`
is denormalised; ours uses one status + a transition log via `entity_events`.

---

## 8. Tickets (Team tab)

**Three views of one table:**

| View | Columns | Reading |
|---|---|---|
| `Employee Tickets` | Employee Name, Ticket ID, Subject, Application Date, **Branch**, Status, Priority, Responsible, Resolved By, Related to | HR-wide list |
| `Manage Tickets` | same minus Branch, **plus Actions** | the actionable queue |
| `Team Tickets` | same minus Branch, minus Actions | manager's read-only view |

Toolbar on all three: `Search` · `Filter` · `Reset` · `Export CSV`

> **`Related to` is a polymorphic link.** A ticket points at another record —
> a leave application, an attendance day, a payslip. Another concrete use of the
> `entity_links` layer rather than a nullable FK per possible target.

`Responsible` vs `Resolved By` are separate — assignee and closer differ.

---

## 9. Not yet captured

- ⬜ `Documents`, `Contact Details`, **`Banking Details`**, `Additional Info`,
  `Overview`, `Assets` tabs
- ⬜ Educational Details expanded
- ⬜ Any edit form behind the ✏ pencils
- ⬜ The eye icon on Employment Information
- ⬜ Ticket detail / create form; `Related to` target types
- ⬜ Resignation form; `Last working Day List`
- ⬜ Employee-In-Out, Admin Approvals, Pending Tasks, Admin-Regularization
