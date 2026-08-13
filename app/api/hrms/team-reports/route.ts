import { rpc } from "../_utils";

export async function GET() {
  return rpc("hrms_team_reports");
}
