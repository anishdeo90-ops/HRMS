import { NextRequest } from "next/server";
import { TAX_BENEFIT_RESOURCES, updatePayrollTaxResource } from "@/app/api/hrms/payroll/_tax-resources";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return updatePayrollTaxResource(req, id, TAX_BENEFIT_RESOURCES.benefitClaims);
}
