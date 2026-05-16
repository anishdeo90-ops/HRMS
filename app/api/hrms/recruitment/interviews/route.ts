import { NextRequest } from "next/server";
import { listRecruitmentInterviews } from "@/app/api/hrms/recruitment/_shared";

export async function GET(req: NextRequest) {
  return listRecruitmentInterviews(req);
}
