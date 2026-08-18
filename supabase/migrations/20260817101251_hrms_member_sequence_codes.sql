drop policy if exists "public_sequences_insert_member" on public.sequences;
create policy "public_sequences_insert_member" on public.sequences
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.org_members m
      where m.org_id = sequences.org_id
        and m.profile_id = (select auth.uid())
        and m.is_active
    )
  );

drop policy if exists "public_sequences_update_member" on public.sequences;
create policy "public_sequences_update_member" on public.sequences
  for update to authenticated
  using (
    exists (
      select 1
      from public.org_members m
      where m.org_id = sequences.org_id
        and m.profile_id = (select auth.uid())
        and m.is_active
    )
  )
  with check (
    exists (
      select 1
      from public.org_members m
      where m.org_id = sequences.org_id
        and m.profile_id = (select auth.uid())
        and m.is_active
    )
  );
