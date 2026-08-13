import { NextRequest } from "next/server";
import { rpc } from "../../_utils";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  return rpc("hrms_decide_approval", {
    request_id: params.id,
    decision: body.decision,
    comment: body.comment ?? null,
  });
}
