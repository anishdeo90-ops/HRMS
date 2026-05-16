-- Wave 2A integrity fixes.
-- Adds the schema surface required for expense claim to employee advance settlement.
-- Existing applied migrations are intentionally left untouched.

begin;

-- FIX-017 decision: these are intentional external or polymorphic references.
-- They cannot be safely represented as single-table foreign keys.
comment on column public.communication_logs.provider_message_id is
  'External provider message identifier; intentionally not a local foreign key.';
comment on column public.employee_notifications.source_id is
  'Polymorphic source row id paired with source_table/source_key; producer routes enforce source semantics.';
comment on column public.hrms_automation_notifications.source_id is
  'Polymorphic source row id paired with source_table for automation-generated notifications.';
comment on column public.leave_ledger_entries.source_id is
  'Polymorphic ledger source id paired with source_type and source_action; application_id remains the FK for leave applications.';

alter table public.employee_advances
  add column if not exists settled_by uuid references public.profiles(id) on delete set null,
  add column if not exists settled_amount numeric(12,2),
  add column if not exists outstanding_amount numeric(12,2);

update public.employee_advances
set settled_amount = case
    when status = 'settled' then coalesce(settled_amount, approved_amount, requested_amount, 0)
    else settled_amount
  end,
  outstanding_amount = case
    when status in ('settled', 'rejected', 'cancelled') then 0
    else greatest(coalesce(approved_amount, requested_amount, 0) - coalesce(settled_amount, 0), 0)
  end
where outstanding_amount is null
   or (status = 'settled' and settled_amount is null);

alter table public.employee_advances
  alter column outstanding_amount set default 0,
  alter column outstanding_amount set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'employee_advances_settlement_amounts_check'
      and conrelid = 'public.employee_advances'::regclass
  ) then
    alter table public.employee_advances
      add constraint employee_advances_settlement_amounts_check
      check (
        (settled_amount is null or settled_amount >= 0)
        and outstanding_amount >= 0
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'employee_advances_id_employee_unique'
      and conrelid = 'public.employee_advances'::regclass
  ) then
    alter table public.employee_advances
      add constraint employee_advances_id_employee_unique unique (id, employee_id);
  end if;
end $$;

create or replace function public.sync_employee_advance_settlement_totals()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  approved_total numeric(12,2);
begin
  approved_total := coalesce(new.approved_amount, new.requested_amount, 0);

  if new.status = 'settled' then
    new.settled_amount := coalesce(new.settled_amount, approved_total);
    new.outstanding_amount := 0;
    new.settled_at := coalesce(new.settled_at, now());
  elsif new.outstanding_amount is null then
    new.outstanding_amount := greatest(approved_total - coalesce(new.settled_amount, 0), 0);
  end if;

  return new;
end;
$$;

drop trigger if exists employee_advances_settlement_totals on public.employee_advances;
create trigger employee_advances_settlement_totals
before insert or update on public.employee_advances
for each row execute function public.sync_employee_advance_settlement_totals();

alter table public.expense_claims
  add column if not exists settlement_advance_id uuid,
  add column if not exists settlement_amount numeric(12,2),
  add column if not exists settlement_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'expense_claims_settlement_amount_check'
      and conrelid = 'public.expense_claims'::regclass
  ) then
    alter table public.expense_claims
      add constraint expense_claims_settlement_amount_check
      check (
        (
          settlement_advance_id is null
          and settlement_amount is null
        )
        or (
          settlement_advance_id is not null
          and settlement_amount is not null
          and settlement_amount > 0
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'expense_claims_settlement_advance_employee_fkey'
      and conrelid = 'public.expense_claims'::regclass
  ) then
    alter table public.expense_claims
      add constraint expense_claims_settlement_advance_employee_fkey
      foreign key (settlement_advance_id, employee_id)
      references public.employee_advances(id, employee_id)
      on delete restrict;
  end if;
end $$;

create index if not exists expense_claims_settlement_advance_idx
  on public.expense_claims(settlement_advance_id)
  where settlement_advance_id is not null;

create index if not exists employee_advances_outstanding_idx
  on public.employee_advances(employee_id, status, outstanding_amount)
  where outstanding_amount > 0;

comment on column public.expense_claims.settlement_advance_id is
  'Employee advance settled by this expense claim; composite FK enforces the same employee_id.';
comment on column public.expense_claims.settlement_amount is
  'Amount from this expense claim applied to the linked employee advance.';
comment on column public.employee_advances.outstanding_amount is
  'Remaining approved advance amount after linked expense claim settlements.';
comment on column public.employee_advances.settled_amount is
  'Total amount settled against this employee advance.';

commit;
