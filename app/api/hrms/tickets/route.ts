import { NextRequest } from "next/server";
import { rpc } from "../_utils";

export async function GET() {
  return rpc("hrms_tickets", { payload: {} });
}

export async function POST(req: NextRequest) {
  return rpc("hrms_create_ticket", { payload: await req.json() }, 201);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  return rpc("hrms_update_ticket", { ticket_id: body.id, payload: body });
}
