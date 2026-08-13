import { NextRequest } from "next/server";
import { rpc } from "../_utils";

export async function GET() {
  return rpc("hrms_separations");
}

export async function POST(req: NextRequest) {
  return rpc("hrms_create_separation", { payload: await req.json() }, 201);
}
