drop policy if exists "hrms_expense_claims_insert_member" on hrms.expense_claims;
create policy "hrms_expense_claims_insert_member" on hrms.expense_claims
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and updated_by = (select auth.uid())
    and exists (
      select 1
      from public.org_members m
      where m.org_id = expense_claims.org_id
        and m.profile_id = (select auth.uid())
        and m.is_active
    )
    and exists (
      select 1
      from hrms.employees e
      where e.id = expense_claims.employee_id
        and e.org_id = expense_claims.org_id
        and e.profile_id = (select auth.uid())
    )
  );

drop policy if exists "hrms_expense_claim_lines_insert_member" on hrms.expense_claim_lines;
create policy "hrms_expense_claim_lines_insert_member" on hrms.expense_claim_lines
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.org_members m
      where m.org_id = expense_claim_lines.org_id
        and m.profile_id = (select auth.uid())
        and m.is_active
    )
    and exists (
      select 1
      from hrms.expense_claims c
      where c.id = expense_claim_lines.claim_id
        and c.org_id = expense_claim_lines.org_id
        and c.created_by = (select auth.uid())
    )
  );
