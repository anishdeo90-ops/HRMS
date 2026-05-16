import { NextRequest } from "next/server";
import { LIFECYCLE_RESOURCES, listLifecycleResource } from "@/app/api/hrms/lifecycle/_resources";
import { PATCH as patchSeparation, POST as postSeparation } from "@/app/api/hrms/lifecycle/separations/route";

export async function GET(req: NextRequest) {
  return listLifecycleResource(req, LIFECYCLE_RESOURCES.separations);
}

export async function POST(req: NextRequest) {
  return postSeparation(req);
}

export async function PATCH(req: NextRequest) {
  return patchSeparation(req);
}
