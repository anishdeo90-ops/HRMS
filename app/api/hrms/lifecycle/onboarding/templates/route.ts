import { NextRequest } from "next/server";
import { LIFECYCLE_RESOURCES, createLifecycleResource, listLifecycleResource } from "@/app/api/hrms/lifecycle/_resources";

export async function GET(req: NextRequest) {
  return listLifecycleResource(req, LIFECYCLE_RESOURCES.onboardingTemplates);
}

export async function POST(req: NextRequest) {
  return createLifecycleResource(req, LIFECYCLE_RESOURCES.onboardingTemplates);
}
