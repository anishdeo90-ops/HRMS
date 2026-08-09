# HRMS — Settings (General)

Captured: 2026-08-08 · batch 7
Menu: ⚙ top bar → `GENERAL` column

| Item | Captured |
|---|---|
| Company Profile | ✅ §1 |
| System Settings | ✅ §2 |
| Policy Setup | ✅ §3 |
| Permission Management | ✅ §4 — **the big one** |
| Email Master | ⬜ |
| Document Master | ⬜ |
| Cron Master | ⬜ |
| Leave Settings | ⬜ |
| Holiday Calendar | ⬜ |
| Achievements | ⬜ |
| Activity Logs | ⬜ |
| Face Identity Vault | ⬜ |

---

## 1. Company Profile

### List view
| Column | Value |
|---|---|
| Company Name | `COSMOS Staffing And Facility Services LLC` |
| Company Slug | `797621` |
| Total Employees | `6` |
| Created At | `23-07-2026` |
| Actions | ✏ edit |

> **It's a list, not a single record.** One login can administer multiple
> companies — independent confirmation of the multi-tenant decision (`10-foundation-spec.md §2.1`).

### Edit Company modal

| Field | Type | Req | Value / helper |
|---|---|---|---|
| Company Name | text | ✱ | `COSMOS Staffing and Facility Services LLC` |
| Company Slug | text | ✱ | `797621` — *"This will be used to create your company's unique domain. Only lowercase letters, numbers, and hyphens are allowed."* |
| Company Code | text | ✱ | `79` |
| Logo | file | | |
| Favicon | file | | |

### ⚠ Correction to earlier notes
Every previous doc recorded `797621` in the URL as *"the org id"*. **It is the
company slug** — a user-editable, human-chosen string that happens to look numeric
here. The tenant's real id is never exposed.

That's actually the better design and we should copy it:

```sql
organizations
  id    uuid   -- internal, never in a URL
  slug  text   -- unique, user-editable, [a-z0-9-]
  code  text   -- short code, distinct from slug
```

`Company Code` (`79`) is separate from the slug and is **not** the employee-code
prefix — those are `EMP2…EMP6`. ⬜ Its purpose is unconfirmed; likely a prefix for
generated document numbers.

**Per-tenant logo and favicon = white-labelling.** Each org's branding is theirs.
Worth deciding whether we support that at launch; it changes how the app shell
loads branding (per-request, not build-time constant).

---

## 2. System Settings

Tabs: **`Email Configuration`** (captured) · `Biometric Device` ⬜

### 2.1 Email Configuration

**Provider choice:** `Google / Custom SMTP` (selected) | `Outlook / Microsoft 365`

**Manual SMTP Configuration**

| Field | Type | Req | Placeholder / value |
|---|---|---|---|
| SMTP Host | text | ✱ | `smtp.gmail.com` |
| Port | number | ✱ | `465` |
| Security Protocol | select | ✱ | ⬜ options not captured |
| From Name | text | | `SMTP Notifications` |
| Email Address | email | | `anishdeo90@gmail.com` |
| App Password | password | ✱ | masked, 👁 reveal toggle |

Actions: `Reset to Default` · `💾 Test & Save Configuration`

Their own tips panel states: *"Settings are verified against the server before saving."*

> **Two things to carry over, one to fix.**
>
> **Carry over — test before save.** Storing SMTP credentials that don't work is
> worse than storing none: every notification fails silently. Verify the connection,
> then persist.
>
> **Carry over — per-tenant sending identity.** Each org sends from its own domain.
> Notifications from `noreply@ourplatform.com` land in spam and look wrong.
>
> **Fix — this is a stored secret.** An SMTP app password grants send-as rights
> over that mailbox. It must be encrypted at rest, never returned by any API
> (write-only field, read back as `••••`), and never logged. The reference shows
> it behind a reveal toggle, which means it round-trips to the browser. Ours should not.

### 2.2 File Upload Limits

| Field | Value | Helper |
|---|---|---|
| Maximum File Size (MB) | `1` ✱ | *Maximum size per file* |
| Allowed File Types | multi-select | *Example: PDF, PNG, JPEG, DOCX* |
| Maximum Files Per Upload | `10` | *Files allowed in one upload* |

*"These limits apply across the system for all uploads."*

Org-level config → `organization_settings` key/value, enforced server-side.
A 1 MB cap against scanned Aadhaar cards and cancelled cheques is tight; note it
as a default worth raising.

---

## 3. Policy Setup

`+ Add Policy` · search · `Filter` · `Reset` · `Delete` (bulk, checkbox column)

| Column |
|---|
| Policy Name · Department · Actions |

`Total Records Count is 0`

> **Policies are scoped by department**, not org-wide. So `policies (org_id,
> name, department_id, document_url, effective_from, version)`. Department is
> nullable for org-wide policies.
>
> ⬜ Whether acknowledgement is tracked (did the employee read it?) is unknown.
> If it is, that's a child table and an onboarding checklist item.

---

## 4. Permission Management — the authorisation model

### 4.1 Roles list

Stat cards: `TOTAL ROLES 12` · `ACTIVE USERS 1` · `LAST UPDATED 23-07-2026`

| Role | Users | Last Updated |
|---|---|---|
| Account Team | 0 | 23-07-2026 |
| Admin | 1 | 23-07-2026 |
| Assistance Reporting Manager | 0 | 23-07-2026 |
| Auditor | 0 | 23-07-2026 |
| FRS Admin | 0 | 25-07-2025 |
| HR | 0 | 23-07-2026 |
| Intern | 0 | 23-07-2026 |
| Network Team | 0 | 23-07-2026 |
| Recruiter | 0 | 25-07-2025 |
| Reporting Manager | 0 | 23-07-2026 |
| Superadmin | 0 | 08-07-2021 |
| User | 0 | 23-07-2026 |

Action per row: `Manage Access`.

**Readings:**
- **Roles are data, not an enum.** 12 seeded per tenant, editable, with a user count.
- `FRS Admin` = Face Recognition System admin → pairs with `Face Identity Vault`.
- `Superadmin` last updated `08-07-2021`, long before this tenant existed
  (`23-07-2026`) — a **system role** seeded globally, not org-created. So roles
  need an `is_system` flag; system roles can't be deleted or renamed.
- `Reporting Manager` and `Assistance Reporting Manager` exist as **roles** as well
  as being **relationships** on the employee record. Two different things wearing
  one name — ours should keep the relationship (`manager_id`) as the source of
  truth and let the role grant only the *screens*, never the *scope*.

### 4.2 Permission matrix

Screen: `<Role> Permission List`, e.g. `Account Team Permission List`.
Search · `Collapse` · `Save Permissions`.

**16 accordion groups:**

| | |
|---|---|
| 360 DEGREE FEEDBACK | OPERATIONS & ADMINISTRATION |
| ASSETS | PERFORMANCE & GOALS |
| ATTENDANCE & REGULARIZATION | PERFORMANCE MODULE |
| AUDIT | RECRUITMENT |
| EMPLOYEE MANAGEMENT | REPORTS |
| FINANCE & REIMBURSEMENT | TICKETS & SUPPORT |
| LEARNING MANAGEMENT | OTHER |
| LEAVE MANAGEMENT | |
| ONBOARDING & SEPARATION | |

Each group expands to a table: **`Module` × `Read` / `Create` / `Update` / `Delete` / `All`**,
plus a `Select All` per group.

#### ATTENDANCE & REGULARIZATION (observed state)
| Module | R | C | U | D |
|---|---|---|---|---|
| On-Duty Regularization | | | | |
| Attendance Regularization | ✅ | ✅ | ✅ | ✅ |
| Employee in-out | | | | |
| Attendance Report | ✅ | | | |
| Admin Regularization | | | | |
| Team Regularization | | | | |
| Holidays | | | | |
| Shifts | | | | |

#### EMPLOYEE MANAGEMENT (observed state)
| Module | R | C | U | D |
|---|---|---|---|---|
| Employee Master | ✅ | | | |
| Employee Ranking | | | | |
| Employee Docs | ✅ | | | |
| Employee Details | ✅ | | | |
| Employee Contact Tab | | | | |
| Employee Detail Tab | | | | |
| **Employee Personal Detail Tab** | ✅ | | | |
| **Employee Banking Tab** | ✅ | | | |
| **Employee Additional Info Tab** | ✅ | | | |

### 4.3 What this settles

**1. Permissions reach individual tabs of the employee record.**
`Employee Banking Tab` and `Employee Additional Info Tab` are separately
permissioned. That directly validates the sensitive-data concern in
`10-foundation-spec.md §7` — the reference already accepts that bank details and
statutory numbers need their own gate.

Ours goes one level finer: **field-level**, so a role can see the Banking tab
without seeing the full account number. Tab-level is a subset of field-level, so
this is compatible, not a conflict.

**2. The permission key format is confirmed.**
```
<group>.<module>.<action>      e.g.  employee.banking_tab.read
                                     attendance.regularization.update
```
Matching `permissions.key` in the foundation spec. `All` is a UI convenience, not
a stored permission — expand it to the four actions on save.

**3. Two groups that need a decision, not a copy.**

- **`RECRUITMENT` is a permission group inside HRMS.** But recruitment is our ATS,
  a separate product with its own entitlement. Ours should **not** duplicate ATS
  permissions inside HRMS — the waffle switcher plus `organization_products`
  already governs who reaches the ATS. Drop this group.
- **`PERFORMANCE & GOALS` and `PERFORMANCE MODULE` are two separate groups.**
  Near-certainly legacy duplication in the reference (as are `Employee Details`
  and `Employee Detail Tab` in the same list). Ours has one performance group.

**4. `360 DEGREE FEEDBACK` is a module with no navigation entry.**
It appears in permissions but nowhere in the sidebar. Either unreleased, or hidden
behind an entitlement this tenant lacks. Worth asking whether you want it —
360 feedback is a genuinely different instrument from the 8-dimension Ranking and
the Technical/Behavioural review already found in `05-employee-record.md §5E`.

---

## 5. Open question #6 — still open, now narrowed

`Salary Grade` and `Experience Grade` appear on the employee form but are **not**
in the Settings menu, and this batch confirms they're not under GENERAL either.
Remaining candidates: the `ORGANIZATION STRUCTURE → General Settings` page, or
hardcoded in the reference product.

---

## 6. Not yet captured

- ⬜ `Biometric Device` tab under System Settings
- ⬜ Email Master · Document Master · Cron Master
- ⬜ Leave Settings · Holiday Calendar
- ⬜ Achievements · Activity Logs · Face Identity Vault
- ⬜ `Add Policy` form
- ⬜ Remaining 14 permission groups expanded
- ⬜ Security Protocol dropdown options
- ⬜ Whole `ORGANIZATION STRUCTURE` column
