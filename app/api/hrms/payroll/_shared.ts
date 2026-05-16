import type { PayrollAccessTarget, PayrollProfile, PayrollRecordScope } from "@/lib/hrms/payroll-authorization";
import {
  normalizeBenefitApplicationPayload,
  normalizeBenefitClaimPayload,
  normalizeGratuityRulePayload,
  normalizePayrollEntries,
  normalizePayrollEntryPayload,
  normalizePayrollPeriodPayload,
  normalizeSalaryComponentPayload,
  normalizeSalarySlipLines,
  normalizeSalarySlipPayload,
  normalizeSalaryStructureDetails,
  normalizeSalaryStructurePayload,
  normalizeTaxDeclarationPayload,
  normalizeTaxSlabPayload,
} from "@/lib/hrms/payroll";
import {
  canManagePayroll,
  canManagePayrollRecord,
  canManageSalaryStructures,
  canManageTaxBenefits,
  canRunPayroll,
  canViewPayroll,
  canViewPayrollRecord,
} from "@/lib/hrms/payroll-authorization";

export {
  canManagePayroll,
  canManagePayrollRecord,
  canManageSalaryStructures,
  canManageTaxBenefits,
  canRunPayroll,
  canViewPayroll,
  canViewPayrollRecord,
  normalizeBenefitApplicationPayload,
  normalizeBenefitClaimPayload,
  normalizeGratuityRulePayload,
  normalizePayrollEntries,
  normalizePayrollEntryPayload,
  normalizePayrollPeriodPayload,
  normalizeSalaryComponentPayload,
  normalizeSalarySlipLines,
  normalizeSalarySlipPayload,
  normalizeSalaryStructureDetails,
  normalizeSalaryStructurePayload,
  normalizeTaxDeclarationPayload,
  normalizeTaxSlabPayload,
};

export type { PayrollAccessTarget, PayrollProfile, PayrollRecordScope };

export function targetFromPayrollRecord(record: any): PayrollAccessTarget {
  return {
    employee_id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_id: record.employee?.reporting_manager_id,
    reporting_manager_profile_id: record.employee?.reporting_manager_profile_id,
  };
}
