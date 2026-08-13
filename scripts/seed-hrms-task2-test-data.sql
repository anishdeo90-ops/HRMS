do $$
declare
  org uuid;
  actor uuid;
begin
  insert into public.organizations (id, name, slug)
  values ('10000000-0000-4000-8000-000000000001', 'HireRabbits', 'hirerabbits')
  on conflict (slug) do update set name = excluded.name, is_active = true
  returning id into org;

  select id into actor
  from public.profiles
  where is_active and role in ('admin', 'hr_manager', 'recruiter')
  order by case role when 'admin' then 1 when 'hr_manager' then 2 else 3 end, created_at
  limit 1;

  insert into public.organization_products (org_id, product_key, is_enabled)
  values (org, 'ats', true), (org, 'hrms', true)
  on conflict (org_id, product_key) do update set is_enabled = true;

  insert into public.org_members (org_id, profile_id, role_key)
  select org, p.id, coalesce(nullif(p.role, ''), 'employee')
  from public.profiles p
  where p.is_active
  on conflict (org_id, profile_id) do update set role_key = excluded.role_key, is_active = true;

  insert into public.masters (id, type, name, code, sort_order, is_active, created_by)
  values
    ('20000000-0000-4000-8000-000000000001','designation','Seed Senior Backend Engineer','SBE',901,true,actor),
    ('20000000-0000-4000-8000-000000000002','designation','Seed Payroll Manager','PAYM',902,true,actor),
    ('20000000-0000-4000-8000-000000000003','designation','Seed HR Operations Executive','HROE',903,true,actor),
    ('20000000-0000-4000-8000-000000000011','site','Seed Ahmedabad HQ','AHQ',901,true,actor),
    ('20000000-0000-4000-8000-000000000012','site','Seed Remote','REMOTE',902,true,actor),
    ('20000000-0000-4000-8000-000000000021','source','Seed Referral','REF',901,true,actor)
  on conflict (id) do update set name = excluded.name, code = excluded.code, is_active = true;

  insert into public.jobs (
    id, title, job_type, status, designation_id, site_id, department, headcount, priority,
    description, requirements, min_salary, max_salary, opened_at, target_doj,
    candidates_pipeline, candidates_shortlisted, candidates_appointed, candidates_joined,
    created_by, is_deleted
  )
  values
    ('30000000-0000-4000-8000-000000000001','Seed Senior Backend Engineer','internal','open','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000011','Engineering',3,'urgent','Task 2 seed ATS job','Node, Postgres, APIs',1800000,2600000,current_date - 5,current_date + 25,8,4,1,0,actor,false),
    ('30000000-0000-4000-8000-000000000002','Seed Payroll Manager','internal','on_hold','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000011','Finance',1,'normal','Task 2 seed ATS job','Payroll and compliance',1400000,1900000,current_date - 20,current_date + 15,5,2,1,0,actor,false),
    ('30000000-0000-4000-8000-000000000003','Seed HR Operations Executive','internal','closed','20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000012','People Ops',1,'low','Task 2 seed closed ATS job','Onboarding operations',600000,900000,current_date - 45,current_date - 5,12,5,1,1,actor,false)
  on conflict (id) do update set
    title = excluded.title, status = excluded.status, headcount = excluded.headcount,
    priority = excluded.priority, candidates_pipeline = excluded.candidates_pipeline,
    candidates_shortlisted = excluded.candidates_shortlisted, candidates_appointed = excluded.candidates_appointed,
    candidates_joined = excluded.candidates_joined, updated_at = now(), is_deleted = false;

  insert into public.candidates (
    id, hr_id, month, application_date, name, current_designation, designation_id, site_id,
    mobile, email, current_location, source_id, present_salary, expected_salary, offered_salary,
    notice_period_days, shortlist_by_hr, shortlisted_for_pi, gf_issued, shortlisted_by_mgmt,
    final_status, final_action, doj, doj_potential, job_id, custom_data, created_by, updated_by, is_deleted
  )
  values
    ('40000000-0000-4000-8000-000000000001',actor,to_char(current_date,'Mon YYYY'),current_date - 10,'Seed Asha Patel','Backend Engineer','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000011','9000000001','seed.asha.patel@example.test','Ahmedabad','20000000-0000-4000-8000-000000000021',1600000,2400000,2200000,30,'Yes','Yes','Yes','Yes','Offered','Offer accepted',current_date + 10,current_date + 10,'30000000-0000-4000-8000-000000000001','{"seed":"hrms-task2"}',actor,actor,false),
    ('40000000-0000-4000-8000-000000000002',actor,to_char(current_date,'Mon YYYY'),current_date - 8,'Seed Rohan Mehta','Payroll Lead','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000011','9000000002','seed.rohan.mehta@example.test','Surat','20000000-0000-4000-8000-000000000021',1300000,1800000,1700000,45,'Yes','Yes','Yes','Yes','Offered','Documents pending',current_date + 18,current_date + 18,'30000000-0000-4000-8000-000000000002','{"seed":"hrms-task2"}',actor,actor,false),
    ('40000000-0000-4000-8000-000000000003',actor,to_char(current_date,'Mon YYYY'),current_date - 6,'Seed Nisha Shah','HR Coordinator','20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000012','9000000003','seed.nisha.shah@example.test','Remote','20000000-0000-4000-8000-000000000021',550000,800000,750000,15,'Yes','Yes','Yes','Yes','Offered','Joined',current_date - 4,current_date - 4,'30000000-0000-4000-8000-000000000003','{"seed":"hrms-task2"}',actor,actor,false),
    ('40000000-0000-4000-8000-000000000004',actor,to_char(current_date,'Mon YYYY'),current_date - 4,'Seed Kabir Khan','Backend Engineer','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000011','9000000004','seed.kabir.khan@example.test','Vadodara','20000000-0000-4000-8000-000000000021',1500000,2300000,2100000,60,'Yes','Yes','Yes','No','Rejected','Offer declined',current_date + 22,current_date + 22,'30000000-0000-4000-8000-000000000001','{"seed":"hrms-task2"}',actor,actor,false)
  on conflict (id) do update set
    name = excluded.name, email = excluded.email, job_id = excluded.job_id, final_status = excluded.final_status,
    final_action = excluded.final_action, doj = excluded.doj, doj_potential = excluded.doj_potential,
    offered_salary = excluded.offered_salary, updated_at = now(), is_deleted = false;

  insert into public.candidate_offers (
    id, candidate_id, annual_ctc, ctc_data, ctc_sent_at, ctc_confirmed_at, offer_sent_at,
    offer_confirmed_at, joining_date, joined_at, designation, site, reporting_to,
    probation_months, status, notes, is_deleted, created_by, updated_by, ctc_confirm_method, offer_confirm_notes
  )
  values
    ('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',2200000,'{"seed":"hrms-task2"}',now() - interval '5 days',now() - interval '4 days',now() - interval '4 days',now() - interval '3 days',current_date + 10,null,'Seed Senior Backend Engineer','Seed Ahmedabad HQ','Seed Manager',6,'offer_confirmed','Task 2 seed accepted offer',false,actor,actor,'email','Accepted by email'),
    ('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002',1700000,'{"seed":"hrms-task2"}',now() - interval '3 days',now() - interval '2 days',now() - interval '2 days',null,current_date + 18,null,'Seed Payroll Manager','Seed Ahmedabad HQ','Seed Finance Head',6,'offer_sent','Task 2 seed offer sent',false,actor,actor,'email',null),
    ('50000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000003',750000,'{"seed":"hrms-task2"}',now() - interval '15 days',now() - interval '14 days',now() - interval '14 days',now() - interval '13 days',current_date - 4,current_date - 4,'Seed HR Operations Executive','Seed Remote','Seed HR Head',3,'joined','Task 2 seed joined offer',false,actor,actor,'email','Joined'),
    ('50000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000004',2100000,'{"seed":"hrms-task2"}',now() - interval '2 days',null,now() - interval '1 day',null,current_date + 22,null,'Seed Senior Backend Engineer','Seed Ahmedabad HQ','Seed Manager',6,'withdrawn','Task 2 seed declined offer',false,actor,actor,'email','Declined')
  on conflict (id) do update set
    annual_ctc = excluded.annual_ctc, status = excluded.status, joining_date = excluded.joining_date,
    joined_at = excluded.joined_at, notes = excluded.notes, updated_at = now(), is_deleted = false;

  insert into hrms.branches (id, org_id, name, code, timezone, is_active)
  values ('60000000-0000-4000-8000-000000000001',org,'Seed Ahmedabad HQ','AHQ','Asia/Kolkata',true)
  on conflict (org_id, name) do update set code = excluded.code, is_active = true;

  insert into hrms.business_units (id, org_id, name, code, is_active)
  values ('60000000-0000-4000-8000-000000000002',org,'Seed Corporate','CORP',true)
  on conflict (org_id, name) do update set code = excluded.code, is_active = true;

  insert into hrms.departments (id, org_id, business_unit_id, name, code, is_active)
  values
    ('60000000-0000-4000-8000-000000000003',org,'60000000-0000-4000-8000-000000000002','Seed Engineering','ENG',true),
    ('60000000-0000-4000-8000-000000000004',org,'60000000-0000-4000-8000-000000000002','Seed People Ops','POPS',true),
    ('60000000-0000-4000-8000-000000000005',org,'60000000-0000-4000-8000-000000000002','Seed Finance','FIN',true)
  on conflict (org_id, name) do update set code = excluded.code, business_unit_id = excluded.business_unit_id, is_active = true;

  insert into hrms.designations (id, org_id, name, code, is_active)
  values
    ('60000000-0000-4000-8000-000000000006',org,'Seed Senior Backend Engineer','SBE',true),
    ('60000000-0000-4000-8000-000000000007',org,'Seed HR Operations Executive','HROE',true),
    ('60000000-0000-4000-8000-000000000008',org,'Seed Payroll Manager','PAYM',true)
  on conflict (org_id, name) do update set code = excluded.code, is_active = true;

  insert into hrms.employees (
    id, org_id, employee_code, first_name, last_name, full_name, work_email, mobile,
    date_of_joining, date_of_birth, status, source_candidate_id, created_by
  )
  values
    ('70000000-0000-4000-8000-000000000001',org,'SEED-HR-001','Priya','Nair','Seed Priya Nair','seed.priya.nair@example.test','9100000001',current_date - 400,'1990-08-20','active',null,actor),
    ('70000000-0000-4000-8000-000000000002',org,'SEED-HR-002','Arjun','Rao','Seed Arjun Rao','seed.arjun.rao@example.test','9100000002',current_date - 200,'1988-09-05','active',null,actor),
    ('70000000-0000-4000-8000-000000000003',org,'SEED-HR-003','Meera','Iyer','Seed Meera Iyer','seed.meera.iyer@example.test','9100000003',current_date - 30,'1994-08-28','probation',null,actor),
    ('70000000-0000-4000-8000-000000000004',org,'SEED-HR-004','Nisha','Shah','Seed Nisha Shah','seed.nisha.shah@example.test','9000000003',current_date - 4,'1996-10-12','probation','40000000-0000-4000-8000-000000000003',actor)
  on conflict (org_id, work_email) do update set
    full_name = excluded.full_name, status = excluded.status, source_candidate_id = excluded.source_candidate_id, updated_at = now();

  insert into hrms.employee_assignments (id, org_id, employee_id, branch_id, business_unit_id, department_id, designation_id, employment_type_id, effective_from, is_primary)
  values
    ('71000000-0000-4000-8000-000000000001',org,'70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000007',(select id from hrms.employment_types where org_id = org and name = 'Permanent' limit 1),current_date - 400,true),
    ('71000000-0000-4000-8000-000000000002',org,'70000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000006',(select id from hrms.employment_types where org_id = org and name = 'Permanent' limit 1),current_date - 200,true),
    ('71000000-0000-4000-8000-000000000003',org,'70000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000005','60000000-0000-4000-8000-000000000008',(select id from hrms.employment_types where org_id = org and name = 'Permanent' limit 1),current_date - 30,true),
    ('71000000-0000-4000-8000-000000000004',org,'70000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000007',(select id from hrms.employment_types where org_id = org and name = 'Permanent' limit 1),current_date - 4,true)
  on conflict do nothing;

  insert into hrms.onboarding_cases (id, org_id, case_code, ats_candidate_id, ats_job_id, status, proposed_doj, actual_doj, decline_reason, created_by, updated_by)
  values
    ('80000000-0000-4000-8000-000000000001',org,'SEED-ONB-001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','pending_approval',current_date + 10,null,null,actor,actor),
    ('80000000-0000-4000-8000-000000000002',org,'SEED-ONB-002','40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','documents_pending',current_date + 18,null,null,actor,actor),
    ('80000000-0000-4000-8000-000000000003',org,'SEED-ONB-003','40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','joined',current_date - 4,current_date - 4,null,actor,actor),
    ('80000000-0000-4000-8000-000000000004',org,'SEED-ONB-004','40000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','offer_declined',current_date + 22,null,'Candidate accepted another offer',actor,actor)
  on conflict (org_id, ats_candidate_id) do update set status = excluded.status, proposed_doj = excluded.proposed_doj, actual_doj = excluded.actual_doj, decline_reason = excluded.decline_reason, updated_at = now();

  insert into hrms.document_types (org_id, name, category, is_mandatory, requires_expiry, applies_to, created_by, updated_by)
  values
    (org,'Seed PAN Card','Identity',true,false,'all',actor,actor),
    (org,'Seed Bank Proof','Payroll',true,false,'all',actor,actor),
    (org,'Seed Education Certificate','Education',true,false,'all',actor,actor)
  on conflict (org_id, name) do update set is_active = true, is_mandatory = true;

  insert into hrms.onboarding_forms (org_id, form_name, applies_to, sections, documents_required, is_active, created_by, updated_by)
  values
    (org,'Seed Joining Kit','all',4,3,true,actor,actor),
    (org,'Seed Payroll Setup','all',2,1,true,actor,actor)
  on conflict (org_id, form_name) do update set is_active = true, sections = excluded.sections, documents_required = excluded.documents_required;

  delete from hrms.employee_documents ed
  using hrms.onboarding_cases oc, hrms.document_types dt
  where ed.org_id = org
    and ed.onboarding_case_id = oc.id
    and ed.document_type_id = dt.id
    and oc.org_id = org
    and oc.case_code in ('SEED-ONB-002','SEED-ONB-003')
    and dt.org_id = org
    and dt.name in ('Seed PAN Card','Seed Bank Proof','Seed Education Certificate');

  insert into hrms.employee_documents (org_id, onboarding_case_id, document_type_id, file_name, uploaded_at, status, remarks, created_by, updated_by)
  select org, oc.id, dt.id,
         case dt.name when 'Seed PAN Card' then 'pan.pdf' when 'Seed Bank Proof' then 'bank.pdf' else 'education.pdf' end,
         now() - interval '1 day',
         case when oc.case_code = 'SEED-ONB-002' and dt.name = 'Seed Education Certificate' then 'pending' else 'verified' end,
         'Task 2 seed document',
         actor,
         actor
  from hrms.onboarding_cases oc
  join hrms.document_types dt on dt.org_id = org and dt.name in ('Seed PAN Card','Seed Bank Proof','Seed Education Certificate')
  where oc.org_id = org and oc.case_code in ('SEED-ONB-002','SEED-ONB-003');

  insert into hrms.assets (id, org_id, asset_code, category, make, model, serial_number, purchase_date, status, created_by, updated_by)
  values
    ('90000000-0000-4000-8000-000000000001',org,'SEED-LAP-001','Laptop','Lenovo','ThinkPad T14','SEEDSN001',current_date - 300,'allocated',actor,actor),
    ('90000000-0000-4000-8000-000000000002',org,'SEED-PHN-001','Phone','Samsung','A55','SEEDSN002',current_date - 90,'in_stock',actor,actor),
    ('90000000-0000-4000-8000-000000000003',org,'SEED-LAP-002','Laptop','Dell','Latitude 5440','SEEDSN003',current_date - 120,'in_repair',actor,actor)
  on conflict (org_id, asset_code) do update set status = excluded.status, make = excluded.make, model = excluded.model, updated_at = now();

  insert into hrms.asset_assignments (org_id, asset_id, employee_id, allocated_on, remarks, created_by)
  values (org,'90000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002',current_date - 60,'Task 2 seed allocation',actor)
  on conflict do nothing;

  insert into hrms.announcement_categories (org_id, name, is_active)
  values (org,'Seed Policy',true), (org,'Seed Payroll',true)
  on conflict (org_id, name) do update set is_active = true;

  insert into hrms.announcements (id, org_id, title, body, category_id, audience_scope, is_pinned, published_at, expires_at, created_by, updated_by)
  values
    ('91000000-0000-4000-8000-000000000001',org,'Seed HRMS policy update','Task 2 seed announcement for dashboard and More.',(select id from hrms.announcement_categories where org_id = org and name = 'Seed Policy' limit 1),'organization',true,now() - interval '1 day',now() + interval '30 days',actor,actor),
    ('91000000-0000-4000-8000-000000000002',org,'Seed reimbursement cutoff','Submit claims by Friday.',(select id from hrms.announcement_categories where org_id = org and name = 'Seed Payroll' limit 1),'organization',false,now() - interval '2 hours',now() + interval '10 days',actor,actor)
  on conflict (id) do update set title = excluded.title, body = excluded.body, is_pinned = excluded.is_pinned, updated_at = now();

  insert into hrms.expense_types (org_id, name, code, is_active)
  values (org,'Seed Travel','STRV',true), (org,'Seed Meals','SML',true)
  on conflict (org_id, name) do update set code = excluded.code, is_active = true;

  insert into hrms.expense_claims (id, org_id, claim_code, employee_id, claim_date, status, reason, created_by, updated_by)
  values
    ('92000000-0000-4000-8000-000000000001',org,'SEED-EXP-001','70000000-0000-4000-8000-000000000002',current_date - 2,'pending','Client visit travel',actor,actor),
    ('92000000-0000-4000-8000-000000000002',org,'SEED-EXP-002','70000000-0000-4000-8000-000000000003',current_date - 7,'approved','Team meal',actor,actor),
    ('92000000-0000-4000-8000-000000000003',org,'SEED-EXP-003','70000000-0000-4000-8000-000000000004',current_date - 5,'rejected','Missing receipt',actor,actor)
  on conflict (org_id, claim_code) do update set status = excluded.status, reason = excluded.reason, updated_at = now();

  delete from hrms.expense_claim_lines where org_id = org and claim_id in (
    '92000000-0000-4000-8000-000000000001',
    '92000000-0000-4000-8000-000000000002',
    '92000000-0000-4000-8000-000000000003'
  );

  insert into hrms.expense_claim_lines (org_id, claim_id, expense_type_id, expense_date, amount_paise, description, has_receipt)
  values
    (org,'92000000-0000-4000-8000-000000000001',(select id from hrms.expense_types where org_id = org and name = 'Seed Travel' limit 1),current_date - 2,245000,'Cab to client office',true),
    (org,'92000000-0000-4000-8000-000000000001',(select id from hrms.expense_types where org_id = org and name = 'Seed Meals' limit 1),current_date - 2,85000,'Client lunch',true),
    (org,'92000000-0000-4000-8000-000000000002',(select id from hrms.expense_types where org_id = org and name = 'Seed Meals' limit 1),current_date - 7,132000,'Team dinner',true),
    (org,'92000000-0000-4000-8000-000000000003',(select id from hrms.expense_types where org_id = org and name = 'Seed Travel' limit 1),current_date - 5,65000,'Auto fare',false);

  insert into public.entity_links (org_id, source_product, source_entity_type, source_entity_id, target_product, target_entity_type, target_entity_id, link_type, metadata, created_by)
  values
    (org,'ats','candidate','40000000-0000-4000-8000-000000000001','hrms','onboarding_case','80000000-0000-4000-8000-000000000001','converted_to_onboarding','{"seed":"hrms-task2"}',actor),
    (org,'ats','candidate','40000000-0000-4000-8000-000000000002','hrms','onboarding_case','80000000-0000-4000-8000-000000000002','converted_to_onboarding','{"seed":"hrms-task2"}',actor),
    (org,'ats','candidate','40000000-0000-4000-8000-000000000003','hrms','onboarding_case','80000000-0000-4000-8000-000000000003','converted_to_onboarding','{"seed":"hrms-task2"}',actor),
    (org,'ats','candidate','40000000-0000-4000-8000-000000000004','hrms','onboarding_case','80000000-0000-4000-8000-000000000004','converted_to_onboarding','{"seed":"hrms-task2"}',actor),
    (org,'ats','job','30000000-0000-4000-8000-000000000001','hrms','onboarding_case','80000000-0000-4000-8000-000000000001','hiring_for','{"seed":"hrms-task2"}',actor),
    (org,'ats','job','30000000-0000-4000-8000-000000000002','hrms','onboarding_case','80000000-0000-4000-8000-000000000002','hiring_for','{"seed":"hrms-task2"}',actor),
    (org,'ats','candidate','40000000-0000-4000-8000-000000000003','hrms','employee','70000000-0000-4000-8000-000000000004','joined_as_employee','{"seed":"hrms-task2"}',actor),
    (org,'hrms','expense_claim','92000000-0000-4000-8000-000000000002','payroll','payable_fact','92000000-0000-4000-8000-000000000002','payable_when_approved','{"seed":"hrms-task2"}',actor)
  on conflict (org_id, source_product, source_entity_type, source_entity_id, target_product, target_entity_type, target_entity_id, link_type) do update set metadata = excluded.metadata;

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  select org, v.product_key, v.entity_type, v.entity_id, v.event_type, v.summary, '{"seed":"hrms-task2"}'::jsonb, actor
  from (values
    ('ats','job','30000000-0000-4000-8000-000000000001','seed.job.upserted','Seed Senior Backend Engineer planted'),
    ('ats','job','30000000-0000-4000-8000-000000000002','seed.job.upserted','Seed Payroll Manager planted'),
    ('ats','candidate','40000000-0000-4000-8000-000000000001','seed.candidate.upserted','Seed Asha Patel planted'),
    ('ats','candidate','40000000-0000-4000-8000-000000000002','seed.candidate.upserted','Seed Rohan Mehta planted'),
    ('ats','candidate','40000000-0000-4000-8000-000000000003','seed.candidate.upserted','Seed Nisha Shah planted'),
    ('hrms','employee','70000000-0000-4000-8000-000000000001','seed.employee.upserted','Seed Priya Nair planted'),
    ('hrms','employee','70000000-0000-4000-8000-000000000002','seed.employee.upserted','Seed Arjun Rao planted'),
    ('hrms','onboarding_case','80000000-0000-4000-8000-000000000001','seed.onboarding.upserted','Pending approval onboarding planted'),
    ('hrms','onboarding_case','80000000-0000-4000-8000-000000000002','seed.onboarding.upserted','Documents pending onboarding planted'),
    ('hrms','asset','90000000-0000-4000-8000-000000000001','seed.asset.upserted','Allocated laptop planted'),
    ('hrms','announcement','91000000-0000-4000-8000-000000000001','seed.announcement.upserted','Policy announcement planted'),
    ('hrms','expense_claim','92000000-0000-4000-8000-000000000001','seed.expense.upserted','Pending expense claim planted'),
    ('hrms','expense_claim','92000000-0000-4000-8000-000000000002','seed.expense.upserted','Approved expense claim planted')
  ) as v(product_key, entity_type, entity_id, event_type, summary)
  where not exists (
    select 1 from public.entity_events e
    where e.org_id = org and e.product_key = v.product_key and e.entity_type = v.entity_type
      and e.entity_id = v.entity_id and e.event_type = v.event_type and e.metadata->>'seed' = 'hrms-task2'
  );
end $$;
