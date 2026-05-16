import { NextRequest } from "next/server";
import { listRecruitmentOffers } from "@/app/api/hrms/recruitment/_shared";

export async function GET(req: NextRequest) {
  return listRecruitmentOffers(req);
}
