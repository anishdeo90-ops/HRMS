import { NextRequest } from "next/server";
import { listRecruitmentJobs } from "@/app/api/hrms/recruitment/_shared";

export async function GET(req: NextRequest) {
  return listRecruitmentJobs(req);
}
