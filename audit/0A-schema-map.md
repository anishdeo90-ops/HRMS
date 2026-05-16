# Agent 0A Schema Map

Discovery-only audit generated from `supabase/migrations/*.sql` in timestamp order. No database was queried.

## Section 1: TABLE INVENTORY

Inventory count: 114 parsed tables. Function count: 68. Trigger count: 91.

| Table | Migration | employee_id | employee FK | RLS | Policies | Columns |
|---|---|---:|---:|---:|---:|---:|
| additional_salaries | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | yes | yes | yes | 4 | 11 |
| app_routes | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 4 |
| appraisal_cycles | supabase/migrations/20260515160000_performance_management.sql | no | n/a | yes | 4 | 14 |
| appraisal_goals | supabase/migrations/20260515160000_performance_management.sql | no | n/a | yes | 4 | 13 |
| appraisal_template_goals | supabase/migrations/20260515160000_performance_management.sql | no | n/a | yes | 4 | 11 |
| appraisal_templates | supabase/migrations/20260515160000_performance_management.sql | no | n/a | yes | 4 | 10 |
| appraisals | supabase/migrations/20260515160000_performance_management.sql | yes | yes | yes | 4 | 15 |
| approval_rules | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 4 |
| approval_steps | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 5 |
| attendance_correction_requests | supabase/migrations/20260511160000_attendance_checkins_shifts.sql | yes | yes | yes | 4 | 18 |
| attendance_days | supabase/migrations/20260511160000_attendance_checkins_shifts.sql | yes | yes | yes | 4 | 14 |
| attendance_shift_locations | supabase/migrations/20260511160000_attendance_checkins_shifts.sql | no | n/a | yes | 4 | 9 |
| attendance_shift_types | supabase/migrations/20260511160000_attendance_checkins_shifts.sql | no | n/a | yes | 4 | 12 |
| automation_rules | supabase/migrations/20260506090000_followup_automation.sql | no | n/a | yes | 2 | 16 |
| automation_runs | supabase/migrations/20260506090000_followup_automation.sql | no | n/a | yes | 1 | 9 |
| automation_settings | supabase/migrations/20260506090000_followup_automation.sql | no | n/a | yes | 2 | 13 |
| candidate_followups | supabase/migrations/20260506090000_followup_automation.sql | no | n/a | yes | 2 | 11 |
| candidate_job_scores | supabase/migrations/20260506120000_resume_keywords.sql | no | n/a | yes | 2 | 7 |
| communication_logs | supabase/migrations/20260506090000_followup_automation.sql | no | n/a | yes | 1 | 16 |
| compensatory_leave_requests | supabase/migrations/20260511190000_leave_management.sql | yes | yes | yes | 4 | 16 |
| daily_work_summaries | supabase/migrations/20260515190000_employee_lifecycle.sql | yes | yes | yes | 4 | 15 |
| department_approvers | supabase/migrations/20260510220000_employee_core_organization.sql | no | n/a | yes | 4 | 10 |
| employee_advances | supabase/migrations/20260512120000_expenses_advances_travel.sql | yes | yes | yes | 4 | 17 |
| employee_benefit_applications | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | yes | yes | yes | 4 | 12 |
| employee_benefit_claims | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | yes | yes | yes | 4 | 14 |
| employee_boarding_activities | supabase/migrations/20260515190000_employee_lifecycle.sql | no | n/a | yes | 4 | 15 |
| employee_check_ins | supabase/migrations/20260511160000_attendance_checkins_shifts.sql | yes | yes | yes | 4 | 10 |
| employee_documents | supabase/migrations/20260510220000_employee_core_organization.sql | yes | yes | yes | 4 | 11 |
| employee_feedback_criteria | supabase/migrations/20260515160000_performance_management.sql | no | n/a | yes | 4 | 11 |
| employee_feedback_ratings | supabase/migrations/20260515160000_performance_management.sql | no | n/a | yes | 4 | 9 |
| employee_grievances | supabase/migrations/20260515190000_employee_lifecycle.sql | yes | yes | yes | 4 | 15 |
| employee_incentives | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | yes | yes | yes | 4 | 10 |
| employee_notifications | supabase/migrations/20260515210000_employee_self_service.sql | yes | yes | yes | 4 | 17 |
| employee_onboarding_templates | supabase/migrations/20260515190000_employee_lifecycle.sql | no | n/a | yes | 4 | 10 |
| employee_onboardings | supabase/migrations/20260515190000_employee_lifecycle.sql | yes | yes | yes | 4 | 14 |
| employee_performance_feedback | supabase/migrations/20260515160000_performance_management.sql | yes | yes | yes | 4 | 12 |
| employee_promotions | supabase/migrations/20260515190000_employee_lifecycle.sql | yes | yes | yes | 4 | 22 |
| employee_separation_templates | supabase/migrations/20260515190000_employee_lifecycle.sql | no | n/a | yes | 4 | 10 |
| employee_separations | supabase/migrations/20260515190000_employee_lifecycle.sql | yes | yes | yes | 4 | 16 |
| employee_shift_assignments | supabase/migrations/20260511160000_attendance_checkins_shifts.sql | yes | yes | yes | 4 | 10 |
| employee_tax_exemption_declarations | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | yes | yes | yes | 4 | 14 |
| employee_transfers | supabase/migrations/20260515190000_employee_lifecycle.sql | yes | yes | yes | 4 | 23 |
| employees | supabase/migrations/20260510220000_employee_core_organization.sql | no | n/a | yes | 4 | 20 |
| exit_interviews | supabase/migrations/20260515190000_employee_lifecycle.sql | yes | yes | yes | 4 | 14 |
| expense_claim_items | supabase/migrations/20260512120000_expenses_advances_travel.sql | no | n/a | yes | 4 | 11 |
| expense_claim_types | supabase/migrations/20260512120000_expenses_advances_travel.sql | no | n/a | yes | 4 | 9 |
| expense_claims | supabase/migrations/20260512120000_expenses_advances_travel.sql | yes | yes | yes | 4 | 18 |
| field_definitions | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 4 |
| form_schemas | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 3 |
| gratuity_rules | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | no | n/a | yes | 4 | 11 |
| grievance_types | supabase/migrations/20260515190000_employee_lifecycle.sql | no | n/a | yes | 4 | 10 |
| holiday_list_dates | supabase/migrations/20260511190000_leave_management.sql | no | n/a | yes | 4 | 7 |
| holiday_lists | supabase/migrations/20260511190000_leave_management.sql | no | n/a | yes | 4 | 11 |
| hr_branches | supabase/migrations/20260510220000_employee_core_organization.sql | no | n/a | yes | 4 | 9 |
| hr_companies | supabase/migrations/20260510220000_employee_core_organization.sql | no | n/a | yes | 4 | 8 |
| hr_departments | supabase/migrations/20260510220000_employee_core_organization.sql | no | n/a | yes | 4 | 10 |
| hr_employment_types | supabase/migrations/20260510220000_employee_core_organization.sql | no | n/a | yes | 4 | 7 |
| hr_grades | supabase/migrations/20260510220000_employee_core_organization.sql | no | n/a | yes | 4 | 8 |
| hrms_automation_notifications | supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql | no | n/a | yes | 4 | 7 |
| hrms_automation_runs | supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql | no | n/a | yes | 4 | 14 |
| hrms_automation_schedules | supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql | no | n/a | yes | 4 | 16 |
| hrms_dashboard_layouts | supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql | no | n/a | yes | 4 | 17 |
| hrms_dashboard_widgets | supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql | no | n/a | yes | 4 | 12 |
| hrms_notification_rules | supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql | no | n/a | yes | 4 | 15 |
| hrms_report_exports | supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql | no | n/a | yes | 4 | 10 |
| hrms_report_runs | supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql | yes | yes | yes | 4 | 20 |
| income_tax_slabs | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | no | n/a | yes | 4 | 11 |
| leave_allocations | supabase/migrations/20260511190000_leave_management.sql | yes | yes | yes | 4 | 12 |
| leave_applications | supabase/migrations/20260511190000_leave_management.sql | yes | yes | yes | 4 | 19 |
| leave_block_list_dates | supabase/migrations/20260511190000_leave_management.sql | no | n/a | yes | 4 | 7 |
| leave_block_lists | supabase/migrations/20260511190000_leave_management.sql | no | n/a | yes | 4 | 13 |
| leave_encashments | supabase/migrations/20260511190000_leave_management.sql | yes | yes | yes | 4 | 16 |
| leave_ledger_entries | supabase/migrations/20260511190000_leave_management.sql | yes | yes | yes | 2 | 18 |
| leave_periods | supabase/migrations/20260511190000_leave_management.sql | no | n/a | yes | 4 | 9 |
| leave_policies | supabase/migrations/20260511190000_leave_management.sql | no | n/a | yes | 4 | 10 |
| leave_policy_assignments | supabase/migrations/20260511190000_leave_management.sql | yes | yes | yes | 4 | 9 |
| leave_policy_details | supabase/migrations/20260511190000_leave_management.sql | no | n/a | yes | 4 | 13 |
| leave_types | supabase/migrations/20260511190000_leave_management.sql | no | n/a | yes | 5 | 15 |
| message_templates | supabase/migrations/20260506090000_followup_automation.sql | no | n/a | yes | 2 | 12 |
| metadata_lineage | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 10 |
| metadata_registry | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 13 |
| metadata_versions | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 5 |
| overtime_records | supabase/migrations/20260511160000_attendance_checkins_shifts.sql | yes | yes | yes | 4 | 18 |
| payroll_entries | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | yes | yes | yes | 4 | 11 |
| payroll_periods | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | no | n/a | yes | 4 | 10 |
| performance_goals | supabase/migrations/20260515160000_performance_management.sql | yes | yes | yes | 4 | 15 |
| performance_kras | supabase/migrations/20260515160000_performance_management.sql | yes | yes | yes | 4 | 13 |
| permissions | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 4 |
| recruitment_appointment_letter_templates | supabase/migrations/20260516030000_recruitment_unification.sql | no | n/a | yes | 4 | 13 |
| recruitment_appointment_letters | supabase/migrations/20260516030000_recruitment_unification.sql | no | n/a | yes | 4 | 21 |
| recruitment_onboarding_handoffs | supabase/migrations/20260516030000_recruitment_unification.sql | yes | yes | yes | 4 | 19 |
| recruitment_status_mappings | supabase/migrations/20260516030000_recruitment_unification.sql | no | n/a | yes | 4 | 14 |
| report_definitions | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 3 |
| role_permissions | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 3 |
| roles | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 4 |
| salary_components | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 5 | 7 |
| salary_slip_lines | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | no | n/a | yes | 4 | 9 |
| salary_slips | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | yes | yes | yes | 4 | 15 |
| salary_structure_assignments | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | yes | yes | yes | 4 | 11 |
| salary_structure_details | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | no | n/a | yes | 4 | 9 |
| salary_structures | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | no | n/a | yes | 4 | 11 |
| salary_withholdings | supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql | yes | yes | yes | 4 | 10 |
| shift_requests | supabase/migrations/20260511160000_attendance_checkins_shifts.sql | yes | yes | yes | 4 | 14 |
| shift_roster_entries | supabase/migrations/20260511160000_attendance_checkins_shifts.sql | yes | yes | yes | 4 | 9 |
| training_events | supabase/migrations/20260515190000_employee_lifecycle.sql | no | n/a | yes | 4 | 14 |
| training_feedback | supabase/migrations/20260515190000_employee_lifecycle.sql | yes | yes | yes | 4 | 12 |
| training_programs | supabase/migrations/20260515190000_employee_lifecycle.sql | no | n/a | yes | 4 | 12 |
| travel_itineraries | supabase/migrations/20260512120000_expenses_advances_travel.sql | no | n/a | yes | 4 | 11 |
| travel_requests | supabase/migrations/20260512120000_expenses_advances_travel.sql | yes | yes | yes | 4 | 18 |
| vehicle_logs | supabase/migrations/20260512120000_expenses_advances_travel.sql | yes | yes | yes | 4 | 14 |
| vehicle_services | supabase/migrations/20260512120000_expenses_advances_travel.sql | yes | yes | yes | 4 | 13 |
| workflow_definitions | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 3 |
| workflow_states | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 5 |
| workflow_transitions | supabase/migrations/20260510000000_metadata_governance.sql | no | n/a | yes | 1 | 6 |

### Functions Extracted

- set_automation_updated_at (supabase/migrations/20260506090000_followup_automation.sql)
- has_metadata_permission (supabase/migrations/20260510000000_metadata_governance.sql)
- has_role (supabase/migrations/20260510220000_employee_core_organization.sql)
- has_permission (supabase/migrations/20260510220000_employee_core_organization.sql)
- can_manage_employee_core (supabase/migrations/20260510220000_employee_core_organization.sql)
- is_reporting_manager (supabase/migrations/20260510220000_employee_core_organization.sql)
- can_view_employee (supabase/migrations/20260510220000_employee_core_organization.sql)
- can_manage_employee_document (supabase/migrations/20260510220000_employee_core_organization.sql)
- has_permission (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- can_manage_attendance (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- can_manage_shifts (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- can_view_attendance (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- can_check_in (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- can_approve_attendance (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- has_permission (supabase/migrations/20260511190000_leave_management.sql)
- can_manage_leave (supabase/migrations/20260511190000_leave_management.sql)
- can_view_leave (supabase/migrations/20260511190000_leave_management.sql)
- can_apply_leave (supabase/migrations/20260511190000_leave_management.sql)
- can_approve_leave (supabase/migrations/20260511190000_leave_management.sql)
- has_permission (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- current_employee_id (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- can_manage_expenses (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- can_view_expense_record (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- can_approve_expense_record (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- can_create_expense_record (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- can_manage_expense_attachment (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- has_permission (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- can_manage_payroll (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- can_manage_salary_structure (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- can_view_payroll_record (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- can_view_salary_slip (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- can_manage_tax_benefits (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- has_permission (supabase/migrations/20260515160000_performance_management.sql)
- can_manage_performance (supabase/migrations/20260515160000_performance_management.sql)
- can_manage_performance_setup (supabase/migrations/20260515160000_performance_management.sql)
- can_view_performance_record (supabase/migrations/20260515160000_performance_management.sql)
- can_review_performance_record (supabase/migrations/20260515160000_performance_management.sql)
- can_submit_performance_feedback (supabase/migrations/20260515160000_performance_management.sql)
- has_permission (supabase/migrations/20260515190000_employee_lifecycle.sql)
- can_manage_lifecycle (supabase/migrations/20260515190000_employee_lifecycle.sql)
- can_manage_lifecycle_setup (supabase/migrations/20260515190000_employee_lifecycle.sql)
- can_view_lifecycle_record (supabase/migrations/20260515190000_employee_lifecycle.sql)
- can_review_lifecycle_record (supabase/migrations/20260515190000_employee_lifecycle.sql)
- can_manage_grievance (supabase/migrations/20260515190000_employee_lifecycle.sql)
- can_manage_training (supabase/migrations/20260515190000_employee_lifecycle.sql)
- can_view_training (supabase/migrations/20260515190000_employee_lifecycle.sql)
- can_submit_daily_work_summary (supabase/migrations/20260515190000_employee_lifecycle.sql)
- can_view_grievance (supabase/migrations/20260515190000_employee_lifecycle.sql)
- can_use_self_service (supabase/migrations/20260515210000_employee_self_service.sql)
- can_view_self_service_profile (supabase/migrations/20260515210000_employee_self_service.sql)
- can_manage_employee_notifications (supabase/migrations/20260515210000_employee_self_service.sql)
- can_view_employee_notification (supabase/migrations/20260515210000_employee_self_service.sql)
- can_acknowledge_employee_notification (supabase/migrations/20260515210000_employee_self_service.sql)
- has_permission (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- can_manage_reports (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- can_view_report_key (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- can_view_dashboard_layout (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- can_manage_dashboard_layout (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- can_manage_hrms_automation (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- can_view_hrms_automation_run (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- has_permission (supabase/migrations/20260516030000_recruitment_unification.sql)
- can_manage_recruitment (supabase/migrations/20260516030000_recruitment_unification.sql)
- can_view_recruitment_candidate (supabase/migrations/20260516030000_recruitment_unification.sql)
- can_manage_recruitment_candidate (supabase/migrations/20260516030000_recruitment_unification.sql)
- can_manage_appointment_letters (supabase/migrations/20260516030000_recruitment_unification.sql)
- can_view_appointment_letter (supabase/migrations/20260516030000_recruitment_unification.sql)
- can_manage_recruitment_handoffs (supabase/migrations/20260516030000_recruitment_unification.sql)
- can_view_recruitment_handoff (supabase/migrations/20260516030000_recruitment_unification.sql)

### Triggers Extracted

- trg_message_templates_updated_at on message_templates (supabase/migrations/20260506090000_followup_automation.sql)
- trg_automation_rules_updated_at on automation_rules (supabase/migrations/20260506090000_followup_automation.sql)
- trg_candidate_followups_updated_at on candidate_followups (supabase/migrations/20260506090000_followup_automation.sql)
- trg_automation_settings_updated_at on automation_settings (supabase/migrations/20260506090000_followup_automation.sql)
- hr_companies_updated_at on hr_companies (supabase/migrations/20260510220000_employee_core_organization.sql)
- hr_branches_updated_at on hr_branches (supabase/migrations/20260510220000_employee_core_organization.sql)
- hr_departments_updated_at on hr_departments (supabase/migrations/20260510220000_employee_core_organization.sql)
- hr_grades_updated_at on hr_grades (supabase/migrations/20260510220000_employee_core_organization.sql)
- hr_employment_types_updated_at on hr_employment_types (supabase/migrations/20260510220000_employee_core_organization.sql)
- employees_updated_at on employees (supabase/migrations/20260510220000_employee_core_organization.sql)
- department_approvers_updated_at on department_approvers (supabase/migrations/20260510220000_employee_core_organization.sql)
- employee_documents_updated_at on employee_documents (supabase/migrations/20260510220000_employee_core_organization.sql)
- attendance_shift_types_updated_at on attendance_shift_types (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- attendance_shift_locations_updated_at on attendance_shift_locations (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- employee_shift_assignments_updated_at on employee_shift_assignments (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- shift_roster_entries_updated_at on shift_roster_entries (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- attendance_days_updated_at on attendance_days (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- attendance_correction_requests_updated_at on attendance_correction_requests (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- shift_requests_updated_at on shift_requests (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- overtime_records_updated_at on overtime_records (supabase/migrations/20260511160000_attendance_checkins_shifts.sql)
- leave_types_updated_at on leave_types (supabase/migrations/20260511190000_leave_management.sql)
- leave_periods_updated_at on leave_periods (supabase/migrations/20260511190000_leave_management.sql)
- leave_policies_updated_at on leave_policies (supabase/migrations/20260511190000_leave_management.sql)
- leave_policy_details_updated_at on leave_policy_details (supabase/migrations/20260511190000_leave_management.sql)
- leave_policy_assignments_updated_at on leave_policy_assignments (supabase/migrations/20260511190000_leave_management.sql)
- leave_allocations_updated_at on leave_allocations (supabase/migrations/20260511190000_leave_management.sql)
- leave_applications_updated_at on leave_applications (supabase/migrations/20260511190000_leave_management.sql)
- holiday_lists_updated_at on holiday_lists (supabase/migrations/20260511190000_leave_management.sql)
- leave_block_lists_updated_at on leave_block_lists (supabase/migrations/20260511190000_leave_management.sql)
- compensatory_leave_requests_updated_at on compensatory_leave_requests (supabase/migrations/20260511190000_leave_management.sql)
- leave_encashments_updated_at on leave_encashments (supabase/migrations/20260511190000_leave_management.sql)
- expense_claim_types_updated_at on expense_claim_types (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- expense_claims_updated_at on expense_claims (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- expense_claim_items_updated_at on expense_claim_items (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- employee_advances_updated_at on employee_advances (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- travel_requests_updated_at on travel_requests (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- travel_itineraries_updated_at on travel_itineraries (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- vehicle_logs_updated_at on vehicle_logs (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- vehicle_services_updated_at on vehicle_services (supabase/migrations/20260512120000_expenses_advances_travel.sql)
- salary_components_updated_at on salary_components (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- salary_structures_updated_at on salary_structures (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- salary_structure_details_updated_at on salary_structure_details (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- salary_structure_assignments_updated_at on salary_structure_assignments (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- payroll_periods_updated_at on payroll_periods (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- payroll_entries_updated_at on payroll_entries (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- salary_slips_updated_at on salary_slips (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- salary_slip_lines_updated_at on salary_slip_lines (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- additional_salaries_updated_at on additional_salaries (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- employee_incentives_updated_at on employee_incentives (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- salary_withholdings_updated_at on salary_withholdings (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- income_tax_slabs_updated_at on income_tax_slabs (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- employee_tax_exemption_declarations_updated_at on employee_tax_exemption_declarations (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- employee_benefit_applications_updated_at on employee_benefit_applications (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- employee_benefit_claims_updated_at on employee_benefit_claims (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- gratuity_rules_updated_at on gratuity_rules (supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql)
- performance_goals_updated_at on performance_goals (supabase/migrations/20260515160000_performance_management.sql)
- performance_kras_updated_at on performance_kras (supabase/migrations/20260515160000_performance_management.sql)
- appraisal_templates_updated_at on appraisal_templates (supabase/migrations/20260515160000_performance_management.sql)
- appraisal_template_goals_updated_at on appraisal_template_goals (supabase/migrations/20260515160000_performance_management.sql)
- appraisal_cycles_updated_at on appraisal_cycles (supabase/migrations/20260515160000_performance_management.sql)
- appraisals_updated_at on appraisals (supabase/migrations/20260515160000_performance_management.sql)
- appraisal_goals_updated_at on appraisal_goals (supabase/migrations/20260515160000_performance_management.sql)
- employee_performance_feedback_updated_at on employee_performance_feedback (supabase/migrations/20260515160000_performance_management.sql)
- employee_feedback_criteria_updated_at on employee_feedback_criteria (supabase/migrations/20260515160000_performance_management.sql)
- employee_feedback_ratings_updated_at on employee_feedback_ratings (supabase/migrations/20260515160000_performance_management.sql)
- employee_onboarding_templates_updated_at on employee_onboarding_templates (supabase/migrations/20260515190000_employee_lifecycle.sql)
- employee_onboardings_updated_at on employee_onboardings (supabase/migrations/20260515190000_employee_lifecycle.sql)
- employee_boarding_activities_updated_at on employee_boarding_activities (supabase/migrations/20260515190000_employee_lifecycle.sql)
- employee_separation_templates_updated_at on employee_separation_templates (supabase/migrations/20260515190000_employee_lifecycle.sql)
- employee_separations_updated_at on employee_separations (supabase/migrations/20260515190000_employee_lifecycle.sql)
- employee_promotions_updated_at on employee_promotions (supabase/migrations/20260515190000_employee_lifecycle.sql)
- employee_transfers_updated_at on employee_transfers (supabase/migrations/20260515190000_employee_lifecycle.sql)
- grievance_types_updated_at on grievance_types (supabase/migrations/20260515190000_employee_lifecycle.sql)
- employee_grievances_updated_at on employee_grievances (supabase/migrations/20260515190000_employee_lifecycle.sql)
- exit_interviews_updated_at on exit_interviews (supabase/migrations/20260515190000_employee_lifecycle.sql)
- training_programs_updated_at on training_programs (supabase/migrations/20260515190000_employee_lifecycle.sql)
- training_events_updated_at on training_events (supabase/migrations/20260515190000_employee_lifecycle.sql)
- training_feedback_updated_at on training_feedback (supabase/migrations/20260515190000_employee_lifecycle.sql)
- daily_work_summaries_updated_at on daily_work_summaries (supabase/migrations/20260515190000_employee_lifecycle.sql)
- employee_notifications_updated_at on employee_notifications (supabase/migrations/20260515210000_employee_self_service.sql)
- hrms_report_runs_updated_at on hrms_report_runs (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- hrms_report_exports_updated_at on hrms_report_exports (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- hrms_dashboard_layouts_updated_at on hrms_dashboard_layouts (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- hrms_dashboard_widgets_updated_at on hrms_dashboard_widgets (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- hrms_notification_rules_updated_at on hrms_notification_rules (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- hrms_automation_schedules_updated_at on hrms_automation_schedules (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- hrms_automation_runs_updated_at on hrms_automation_runs (supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql)
- recruitment_status_mappings_updated_at on recruitment_status_mappings (supabase/migrations/20260516030000_recruitment_unification.sql)
- recruitment_appointment_letter_templates_updated_at on recruitment_appointment_letter_templates (supabase/migrations/20260516030000_recruitment_unification.sql)
- recruitment_appointment_letters_updated_at on recruitment_appointment_letters (supabase/migrations/20260516030000_recruitment_unification.sql)
- recruitment_onboarding_handoffs_updated_at on recruitment_onboarding_handoffs (supabase/migrations/20260516030000_recruitment_unification.sql)

## Section 2: MISSING FOREIGN KEYS

Missing *_id reference count: 4. Severity is CRITICAL for employee_id and HIGH for other domain keys.

| Severity | Table | Column | Migration |
|---|---|---|---|
| HIGH | communication_logs | provider_message_id | supabase/migrations/20260506090000_followup_automation.sql |
| HIGH | employee_notifications | source_id | supabase/migrations/20260515210000_employee_self_service.sql |
| HIGH | hrms_automation_notifications | source_id | supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql |
| HIGH | leave_ledger_entries | source_id | supabase/migrations/20260511190000_leave_management.sql |

## Section 3: RLS GAPS

Tables with RLS enabled but zero parsed policies: 0. Tables with no parsed RLS enablement: 0.

### RLS Enabled With Zero Policies

- None found.

### No ENABLE ROW LEVEL SECURITY Found

- None found.
