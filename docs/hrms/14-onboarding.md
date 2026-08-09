# HRMS — Onboarding module

Captured: 2026-08-10 · batch 14
Left rail → `Onboarding`

Tabs: **Document Master · Onboarding Form Master · Candidate Approval ·
Candidate Approval List · Onboarding Initiation · Documents Approval list ·
New Joinees**

> ⚠ **This is the ATS → HRMS boundary**, and the single most important module for
> our build. It is also where the reference's data duplication is worst — the same
> person is typed in **three times** across three forms (§3, §5), none of which
> read from the recruiting system.

---

## 0. The pipeline

```
Candidate Approval (form)
   → Candidate Approval List        approve / reject, bulk
   → Onboarding Initiation          invite + document deadline
   → candidate fills the onboarding form   (shape defined by Form Master)
   → Documents Approval list        HR verifies each upload
   → New Joinees                    joined / did not join + reason
   → Employee Directory
```

Six stages, six screens, one person. In the reference each stage is a fresh form.
**Ours is one `onboarding_cases` row that moves through stages**, seeded from the
ATS candidate and ending as an `hrms.employees` row — with `entity_links` at both
joins so the trail runs both ways.

```sql
hrms.onboarding_cases
  id, org_id,
  ats_candidate_id  uuid,          -- via entity_links, never a cross-schema FK
  employee_id       uuid NULL,     -- set at conversion
  stage text,   -- 'candidate_approval'|'approved'|'initiated'|'docs_submitted'
                -- |'docs_approved'|'joined'|'not_joined'|'rejected'
  ...
```

---

## 1. Document Master — *company* document assets

> ⚠ **Not the same screen as `Settings → Document Master`** (`08-masters.md §2`).
> That one holds letter *templates*; this holds the **values their merge variables
> resolve to**. Two screens, one name.

Title: `Company Document Master` — *"Manage company contacts and document assets."*

**Management contacts** — each a select + a `Work email` text field:
`CEO` · `Director` · `HR` · `Admin`

**Signatures & photos** — all `Upload (.jpg/.png only)`:
`CEO Signature` · `CEO Photo` · `Stamp Duty` · `Director Signature` ·
`Director Photo` · `Designated Partner Signature` · `HR Signature` · `HR Photo`

**Company details:** `PAN number` (`ABCDE1234F`) · `Company address` ·
`Company location` (City / place)

### 1.1 ✅ Closes the loop on generated documents

`08-masters.md §2` established that Settings → Document Master holds templates with
`Dynamic Variables`. This screen is the **other half**: an offer letter's
`{{company.pan}}`, `{{ceo.signature}}` and `{{hr.name}}` resolve from here.

### 1.2 ⚠ Signatory roles are hardcoded

`CEO`, `Director`, `HR`, `Admin`, `Designated Partner` are fixed field names. A
firm with two directors, a Managing Partner, or a Company Secretary has nowhere to
put them — and an LLP has no CEO at all.

**Ours makes signatories data:**

```sql
document_signatories
  id, org_id, role_key text,        -- 'ceo'|'director'|'hr'|'partner'|<custom>
  label text,
  employee_id fk,                   -- name + work email derive from here
  signature_asset_id fk, photo_asset_id fk,
  sort_order, is_active
```

### 1.3 ⚠ Three fields duplicated from data that already exists

| Field here | Already lives in |
|---|---|
| `Work email` ×4 | `employees.work_email` — the person is *selected from a dropdown of employees* |
| `PAN number` | Settings → Company Profile (`07-settings.md`) |
| `Company address` / `location` | Settings → Company Profile |

Typing a signatory's work email next to a dropdown that already identifies them is
guaranteed drift. **Ours derives all three** — signatory contact from the employee
record, company details from `organizations`.

`Stamp Duty` as an image is a franking/e-stamp impression applied to letters —
legitimate, and it belongs with the other assets.

---

## 2. ⭐ Onboarding Form Master — resolves the document-checklist question

Title: `On-boarding Form Builder` · buttons `+ Add Section` · `+ Add Custom Field`

Section: **`Personal & Document Information`** — badge **`Predefined (read-only)`**

### 2.1 Predefined fields

| Group | Fields |
|---|---|
| Identity | First Name ✱ · Last Name ✱ · Gender ✱ · Marital Status · Birth Date ✱ |
| Statutory ID | **Aadhar Card** ✱ ⟨toggle⟩ + file · Aadhar Card Number ✱ · **PAN Card** ✱ ⟨toggle⟩ + file · PAN Number ✱ |
| Present address | Country ✱ · State ✱ · District ✱ · City/Village ✱ · Address ✱ · Pin Code ✱ |
| | ☐ `Same as present address` |
| Permanent address | Country ✱ · State ✱ · District ✱ · City/Village ✱ · Address ✱ · Pin Code ✱ |
| Family | Father's Name ✱ · Mother's Name ✱ |
| Prior employment | **Last month salary slip (exp. only)** ⟨toggle⟩ · **Last Appraisal Documents** ⟨toggle⟩ · **Bank Statement (Exp. only)** ⟨toggle⟩ |
| Banking | Bank Name ✱ · Account Holder Name ✱ · Bank Branch Name ✱ · IFSC Code ✱ · Bank Account Number ✱ · Cheque Number |
| Other docs | **Latest Education Certificate** ✱ ⟨toggle⟩ · **Electricity Bill** ✱ ⟨toggle⟩ · **Latest Photograph** ✱ ⟨toggle⟩ |
| Misc | Any Hidden Talent |

### 2.2 ✅ **This is where the document checklist is configured**

`08-masters.md §2` recorded — as a correction — that the employee document
checklist is **not** seeded from Settings → Document Master, and left its true
source as ⬜ unknown.

**It is here.** Each document is a predefined field with its own **toggle**, and
the toggle is what makes it part of the required set. The six documents on the
employee record's Documents tab (`05-employee-record.md §5A`) are exactly the
toggled-on entries: Aadhar, PAN, Education Certificate, Electricity Bill,
Photograph, plus the experienced-only trio.

So the checklist is a property of the **onboarding form**, not a standalone master.
That is a defensible design — it keeps collection and requirement in one place —
and our `document_types` should be driven from it:

```sql
document_types
  id, org_id, key, name,
  applies_to text,       -- 'all' | 'experienced_only' | 'fresher_only'
  is_required bool,      -- the toggle
  has_expiry bool, sort_order, is_active
```

`applies_to` is ours, made explicit: the reference encodes it in the **label**
(*"(exp. only)"*, *"(Exp. only)"* — two spellings), which means the rule is
invisible to any query and can only be enforced by whoever reads the caption.

### 2.3 `Predefined (read-only)` + custom fields

The core section cannot be edited or reordered — only whole new sections and
custom fields can be added. Reasonable, since these map 1:1 onto `employees`
columns, but it means a field that does not apply cannot be switched off. (Not
every jurisdiction wants `Father's Name`; `Any Hidden Talent` being *predefined*
while genuinely optional data must be a custom field is an odd pair of choices.)

**Ours: predefined fields may be hidden or made optional, never deleted.** The
column stays; the form stops asking.

```sql
onboarding_form_sections
  id, org_id, name, sequence, is_predefined bool
onboarding_form_fields
  id, section_id fk, key, label, field_type, sequence,
  is_required bool, is_visible bool,
  maps_to text NULL          -- 'employees.father_name' — NULL for custom fields
onboarding_field_values
  onboarding_case_id fk, field_id fk, value jsonb, file_asset_id fk NULL
```

`maps_to` is the important column: it is what makes conversion to an employee
record **declarative** rather than a hand-written field-by-field copy. Custom
fields have no mapping and stay on the onboarding case.

⬜ Not captured: `+ Add Section` / `+ Add Custom Field` forms — specifically
whether a custom field can declare a mapping.

---

## 3. ⚠ Candidate Approval — the ATS seam, as a re-entry form

| Field | Req |
|---|---|
| First Name · Last Name · Email | ✱ |
| Business Unit · Business Head | |
| Interview Feedback | textarea |
| Fresher/Exp. · Designation · Department | ✱ |
| Sub-Department · Function/role | |
| Interview Date | ✱ |
| Current Annual Salary (₹) | |
| **Offered Annual Salary** | ✱ |
| **Salary Hike (%)** | **disabled — derived** |

Buttons: `Clear` · `Save`

### 3.1 This is the whole problem, on one screen

Name, email, interview date, interview feedback, designation, department — **all
of it already exists in the recruiting system**. Here it is typed in again, by
hand, with no link back to the candidate it came from.

That is precisely the duplication this project exists to remove. Every downstream
question — *"which requisition did this hire come from?"*, *"how long from first
interview to joining?"*, *"which source produces hires that stay?"* — is
unanswerable, because the join was never recorded.

**Ours replaces this form with a promotion action inside the ATS.** The candidate
record is the source; this screen becomes a thin panel that adds only what
recruiting does not already know — offered salary, business unit, joining
intent — and writes:

```
entity_links: ats.candidate  ──promoted_to──▶  hrms.onboarding_case
              hrms.onboarding_case ──became──▶  hrms.employees
```

Bidirectional, so the employee record can always answer *"where did this person
come from"* and the candidate record can answer *"what happened to them"*
(`10-foundation-spec.md §6`).

### 3.2 ✅ `Salary Hike (%)` is derived — done correctly

Greyed out, computed from Current vs Offered. A rare instance of the reference
refusing to store a derivable value. Worth noting because §1.3 and §5 do the
opposite three times over.

### 3.3 ✅ Salary enters at the offer, and stays out of the employee spine

`Current Annual Salary` and `Offered Annual Salary` appear **here**, not on the
employee record — which matches the decision in `10-foundation-spec.md §4.1` to
keep CTC out of `hrms.employees` entirely.

So the offered figure is captured on the onboarding case and becomes the **seed
for the payroll record** at conversion, linked rather than copied:

```
onboarding_case.offered_annual_salary
   → payroll.salary_structures (effective from date_of_joining)
   → entity_links: onboarding_case ──seeded──▶ salary_structure
```

The employee spine still holds no salary. Compensation history lives in Payroll,
where revisions, arrears and statutory splits belong.

---

## 4. Candidate Approval List

`☐ · Candidate Name · Email · Experience · Interview Date · **BH** · **BU** ·
Status · Actions` — toolbar `Filter` · `Reset` · **`Approve`** · **`Reject`**

Bulk approve/reject, exactly like Admin Approvals — but on its own screen with its
own status vocabulary. **That is the tenth request type built separately** (after
the seven HR requests and goal approval, `13-performance-review.md §2.2`).

Ours: `request_type = 'candidate_approval'` in the one approval engine, so a
Business Head sees candidate approvals and leave approvals in the same queue.

⚠ `BH` / `BU` abbreviated in column headers while every other screen spells them
out. Do-not-reproduce.

---

## 5. Onboarding Initiation Process

Button: `Approved Candidate` (presumably prefills from §4)

| Group | Fields |
|---|---|
| Identity | First Name ✱ · Last Name ✱ · Email ✱ · Gender ✱ · Birthdate · Phone Number ✱ (+91, country selector) |
| Org | Business Unit · Business Head · Employee Type ✱ · Designation ✱ · Department ✱ · Sub-Department · Function/role |
| Recruiting | **TPO Email** · Experience ✱ (In Year) · CV ✱ (file) · Fresher/Exp. ✱ · Qualifications (`Masters / Bachelors`) · Hobbies |
| Process | **Document Submission Deadline** ✱ · Cheque Recieved (Yes/No) · **Pay Revision Applicable** (Yes/No) |
| **Emergency Contacts** | Emergency Number (+91) · Relation · **`+ Add Emergency Contact`** |

### 5.1 ⚠ The same person, entered a third time

First/Last/Email/Gender/Business Unit/Business Head/Designation/Department/
Sub-Department/Function all appear **again**, having been typed on Candidate
Approval (§3). The `Approved Candidate` button may prefill them, but the fields
are still present and editable, so the two records can silently disagree — and
nothing indicates which is authoritative.

**Ours: one case, progressive disclosure.** Initiation adds only what is genuinely
new — deadline, joining logistics, emergency contacts — and shows the rest
read-only with a link to edit at source.

### 5.2 Three fields worth keeping

- **`Document Submission Deadline`** — drives reminders and escalation. Another
  `job_definitions` entry (`10-foundation-spec.md §9a`), and an
  `entity_events` trail when it is missed.
- **`TPO Email`** — Training & Placement Officer: campus hiring is supported, and
  the TPO is notified of the candidate's progress. Ours keeps it as a
  `source_contact` on the case rather than a bare email column, so agency and
  referral sources fit the same field.
- **`Pay Revision Applicable`** — a payroll flag set at onboarding. Travels with
  the salary seed in §3.3.

### 5.3 `+ Add Emergency Contact` — repeatable, correctly

The only repeatable group in the entire capture. Confirms
`employee_emergency_contacts` as a child table (`10-foundation-spec.md §4.2`)
rather than the two flat columns the employee record's Contact tab suggested.

⚠ `Cheque Recieved` — misspelling, and it duplicates `Cheque Number` from the
onboarding form (§2.1). Two screens asking about the same cancelled cheque.

---

## 6. Documents Approval list

Title: `Document Approval`
`Candidate Name · Candidate Email · Candidate Contact · Department ·
Sub-Department · Designation · Experience · Employee Status`

HR verifies each uploaded document. This confirms `employee_documents.status`
(`08-masters.md §2`) is a **review workflow**, not a boolean:

```sql
employee_documents
  ...
  status text,        -- 'pending'|'submitted'|'approved'|'rejected'|'expired'
  reviewed_by, reviewed_at, rejection_reason
```

A rejected document must be re-requestable — *"Aadhaar is illegible, upload
again"* — which means the deadline in §5.2 can be extended and the event trail
must show both attempts.

⚠ The list is keyed to the *candidate*, not to individual documents, so there is
no visible per-document approve/reject on this screen. ⬜ Presumably in a row
drill-in.

---

## 7. New Joinees

`Employee Name · Branch · Exp/Fresher · Department Name · Date of Joining ⇅ ·
**Reason for not joining** · Status · **Employee Status** ⇅ · Actions`

### 7.1 ✅ `Reason for not joining` — offer-to-join is not guaranteed

An accepted offer does not become an employee. Candidates renege, counter-offers
win, joining dates slip. The reference models the outcome, and so must we:

```sql
onboarding_cases
  ...
  stage 'joined' | 'not_joined',
  date_of_joining date,
  not_joining_reason_id fk,     -- a master, not free text
  not_joining_notes text
```

`not_joining_reason_id` as a lookup rather than prose is what makes offer-decline
analysis possible — *"we lost nine of eleven to counter-offers"* is a hiring
signal, and the ATS is the system that needs to hear it. So this writes back
across the seam:

```
entity_events on the ATS candidate: 'offer_declined', reason
```

That is the **backward tracking** half of the linkage requirement — HRMS informing
recruiting, not just consuming from it.

### 7.2 ⚠ `Status` and `Employee Status` again

Two status columns on one row, for the third time (after Admin-Regularization
`06-approvals.md §5.2` and WeekOff Approval `06-approvals.md §8.1`). Ours: one
`stage` on the case, one `status` on the employee, never both on one grid.

---

## 8. What this module settles

| Question | Answer |
|---|---|
| Where is the document checklist configured? | **Onboarding Form Master** (§2.2) — closes `08-masters.md §2` |
| Where do generated documents get company values? | **Onboarding → Document Master** (§1.1) |
| Where does salary enter? | **Candidate Approval**, as offered CTC — and stays out of `employees` (§3.3) |
| Are emergency contacts repeatable? | **Yes** (§5.3) |
| Is `employee_documents.status` a workflow? | **Yes** (§6) |
| Does the ATS link to HRMS today? | **No — three manual re-entries** (§3.1, §5.1). This is the gap we exist to close. |

## 9. Not yet captured

- ⬜ `+ Add Section` / `+ Add Custom Field` forms — can a custom field declare a mapping? (§2.3)
- ⬜ `Approved Candidate` picker on Onboarding Initiation — does it prefill or copy?
- ⬜ Documents Approval row drill-in — per-document approve/reject (§6)
- ⬜ `Reason for not joining` options — master or free text? (§7.1)
- ⬜ The candidate-facing onboarding form itself (what the new hire actually sees)
