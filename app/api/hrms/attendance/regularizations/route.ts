import { NextRequest } from "next/server";
import { rpc } from "../../_utils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  return rpc("hrms_create_approval_request", {
    payload: { ...body, request_type: body.request_type ?? "regularization" },
  }, 201);
}
