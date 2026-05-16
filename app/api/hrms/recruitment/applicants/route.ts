import { NextRequest } from "next/server";
import { listRecruitmentApplicants } from "@/app/api/hrms/recruitment/_shared";

export async function GET(req: NextRequest) {
  return listRecruitmentApplicants(req);
}
