import { NextRequest } from "next/server";
import { createPayrollTaxResource, listPayrollTaxResource, TAX_BENEFIT_RESOURCES } from "@/app/api/hrms/payroll/_tax-resources";

export function GET(req: NextRequest) {
  return listPayrollTaxResource(req, TAX_BENEFIT_RESOURCES.benefitApplications);
}

export function POST(req: NextRequest) {
  return createPayrollTaxResource(req, TAX_BENEFIT_RESOURCES.benefitApplications);
}
