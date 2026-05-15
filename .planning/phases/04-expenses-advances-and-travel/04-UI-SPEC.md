# Phase 4 UI Spec: Expenses, Advances, and Travel

## Product Frame

This is an internal HRMS finance workflow, not a marketing page. The UI should be dense, calm, and operational, matching the existing HireRabbits dashboard style.

## Navigation

Add a sidebar group for authorized users:

- Group label: `Finance`
- Routes:
  - `/expenses` - overview and claim list
  - `/expenses/claims` - expense claim workspace
  - `/expenses/advances` - employee advances
  - `/travel` - travel requests and itineraries
  - `/vehicles` - vehicle logs and services

Do not show Finance routes to ATS-only recruiters or inactive users.

## Page Contracts

### `/expenses`

Purpose: Finance overview and pending work queue.

Required sections:

- Compact KPI strip: submitted claims, approved unpaid claims, open advances, pending travel.
- Filterable claims table.
- Pending approvals table.
- Quick links to claims, advances, travel, and vehicles.

### `/expenses/claims`

Purpose: Create and manage expense claims.

Required controls:

- Claim form with title, claim type, expense date, amount, currency default, description, and attachment upload.
- Line-item editor for multiple expense rows.
- Status filter.
- Decision controls for authorized approvers: approve, reject, cancel, mark paid.

### `/expenses/advances`

Purpose: Request and manage employee advances.

Required controls:

- Advance form with amount, required date, purpose, repayment/settlement note, and attachment upload.
- Status table.
- Decision controls for authorized approvers: approve, reject, cancel, mark settled.

### `/travel`

Purpose: Request and manage employee travel.

Required controls:

- Travel request form with destination, purpose, start date, end date, estimated amount, and notes.
- Itinerary row editor with date, origin, destination, mode, and estimated cost.
- Approval status table.

### `/vehicles`

Purpose: Track vehicle expenses.

Required controls:

- Vehicle log form with vehicle identifier, trip date, odometer, route, purpose, and expense amount.
- Service form with service date, vendor, amount, notes, and attachment.
- Table filters by employee, date, and status.

## Visual Rules

- Use compact page headers, tabs or segmented controls, tables, and inline panels.
- Keep cards only for repeated data summaries or form panels; do not nest cards.
- Use lucide icons for navigation and action buttons.
- Keep text sizes appropriate for operational pages.
- Preserve the existing sidebar and layout conventions.

## Empty, Loading, and Error States

- Empty tables should show a single restrained row or panel with the action to create the first record.
- Loading states should not change table dimensions.
- Error banners must be visible near the failed form or table.

## Browser Verification

After implementation:

```text
npm.cmd run dev
agent-browser.cmd open "http://localhost:3000/expenses"
agent-browser.cmd wait --load networkidle
agent-browser.cmd errors
agent-browser.cmd snapshot -i
```

Repeat for `/expenses/claims`, `/expenses/advances`, `/travel`, and `/vehicles`.
