import { NextRequest } from "next/server";
import { rpc } from "../../_utils";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return rpc("hrms_update_leave", { request_id: params.id, payload: await req.json() });
}
