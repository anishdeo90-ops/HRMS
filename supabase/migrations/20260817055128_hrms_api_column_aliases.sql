alter table hrms.asset_assignments
  add column if not exists condition text;

alter table hrms.expense_claims
  add column if not exists notes text;
