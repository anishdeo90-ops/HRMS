import { NextRequest } from "next/server";
import { LIFECYCLE_RESOURCES, createLifecycleResource, listLifecycleResource } from "@/app/api/hrms/lifecycle/_resources";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest) {
  return listLifecycleResource(req, LIFECYCLE_RESOURCES.trainingFeedback);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return createLifecycleResource(req, LIFECYCLE_RESOURCES.trainingFeedback, { event_id: id });
}
