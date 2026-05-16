-- Employee Self-Service Portal
-- Adds Phase 8 self-service notifications with helper-backed, fail-closed RLS.

begin;

create table if not exists public.employee_notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  body text,
  category text not null default 'system' check (category in ('profile', 'attendance', 'leave', 'expenses', 'payroll', 'performance', 'lifecycle', 'system')),
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'critical')),
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  source_key text,
  source_table text,
  source_id uuid,
  action_href text,
  due_at timestamptz,
  read_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (read_at is null or status in ('read', 'archived')),
  check (archived_at is null or status = 'archived')
);

create index if not exists employee_notifications_employee_status_idx
  on public.employee_notifications(employee_id, status, created_at desc);

create index if not exists employee_notifications_due_at_idx
  on public.employee_notifications(due_at)
  where due_at is not null;

create or replace function public.can_use_self_service(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('role.admin')
      or public.has_role('role.hr_manager')
      or public.has_permission('permission.self_service.view')
      or coalesce((
        select e.profile_id = auth.uid()
          and e.is_active = true
          and (
            public.has_role('role.employee')
            or public.has_permission('permission.self_service.view')
          )
        from public.employees e
        where e.id = target_employee_id
      ), false);
$$;

create or replace function public.can_view_self_service_profile(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('role.admin')
      or public.has_role('role.hr_manager')
      or coalesce((
        select e.profile_id = auth.uid()
          and e.is_active = true
          and (
            public.has_role('role.employee')
            or public.has_permission('permission.self_service.profile.view')
          )
        from public.employees e
        where e.id = target_employee_id
      ), false);
$$;

create or replace function public.can_manage_employee_notifications()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('role.admin')
      or public.has_role('role.hr_manager')
      or public.has_permission('permission.self_service.notifications.manage');
$$;

create or replace function public.can_view_employee_notification(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_employee_notifications()
      or coalesce((
        select e.profile_id = auth.uid()
          and e.is_active = true
          and (
            public.has_role('role.employee')
            or public.has_permission('permission.self_service.notifications.view')
          )
        from public.employees e
        where e.id = target_employee_id
      ), false);
$$;

create or replace function public.can_acknowledge_employee_notification(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_employee_notifications()
      or coalesce((
        select e.profile_id = auth.uid()
          and e.is_active = true
          and (
            public.has_role('role.employee')
            or public.has_permission('permission.self_service.notifications.acknowledge')
          )
        from public.employees e
        where e.id = target_employee_id
      ), false);
$$;

drop trigger if exists employee_notifications_updated_at on public.employee_notifications;
create trigger employee_notifications_updated_at before update on public.employee_notifications
for each row execute function public.touch_updated_at();

alter table public.employee_notifications enable row level security;

drop policy if exists "employee_notifications_select" on public.employee_notifications;
create policy "employee_notifications_select" on public.employee_notifications for select to authenticated
  using (public.can_view_employee_notification(employee_id));

drop policy if exists "employee_notifications_insert" on public.employee_notifications;
create policy "employee_notifications_insert" on public.employee_notifications for insert to authenticated
  with check (public.can_manage_employee_notifications());

drop policy if exists "employee_notifications_update" on public.employee_notifications;
create policy "employee_notifications_update" on public.employee_notifications for update to authenticated
  using (public.can_acknowledge_employee_notification(employee_id))
  with check (public.can_acknowledge_employee_notification(employee_id));

drop policy if exists "employee_notifications_delete" on public.employee_notifications;
create policy "employee_notifications_delete" on public.employee_notifications for delete to authenticated
  using (public.has_role('role.admin'));

commit;
