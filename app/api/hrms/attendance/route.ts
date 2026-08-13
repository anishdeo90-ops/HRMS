import { NextRequest } from "next/server";
import { rpc } from "../_utils";

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  return rpc("hrms_attendance", {
    payload: {
      scope: p.get("scope") ?? "me",
      month: p.get("month") ?? "",
      work_date: p.get("work_date") ?? "",
    },
  });
}
