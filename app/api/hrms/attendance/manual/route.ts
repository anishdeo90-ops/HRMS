import { NextRequest } from "next/server";
import { rpc } from "../../_utils";

export async function POST(req: NextRequest) {
  return rpc("hrms_record_manual_attendance", { payload: await req.json() }, 201);
}
