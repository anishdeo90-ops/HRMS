import { NextRequest, NextResponse } from "next/server";
import { authed, errorStatus, rpc } from "../_utils";

export async function GET() {
  return rpc("hrms_team_reports");
}

const REPORT_NAMES = {
  "left": "Employee Left Reports",
  "joining": "Employee Joining Reports",
  "leave_approval": "Leave Approval",
  "leave_balance": "Leave Balance",
  "register": "Attendance Register",
  "monthly": "Monthly Register",
  "in_out": "In - Out Register",
  "regularization": "Attendance Regularization",
  "punch_rejection": "Punch Rejection Report",
} as const;

type ReportKey = keyof typeof REPORT_NAMES;
type EmployeeRow = {
  id: string;
  employee_code?: string | null;
  name?: string | null;
  department?: string | null;
  branch?: string | null;
  designation?: string | null;
  status?: string | null;
  date_of_joining?: string | null;
};
type ReportRow = Record<string, string | number | boolean | null>;

function filename(report: ReportKey, format: string) {
  const name = REPORT_NAMES[report].toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${name}.${format === "csv" ? "csv" : "xlsx"}`;
}

function employeeFields(employee?: EmployeeRow): ReportRow {
  return {
    "Employee Code": employee?.employee_code ?? null,
    "Employee Name": employee?.name ?? null,
    "Department": employee?.department ?? null,
    "Branch": employee?.branch ?? null,
    "Designation": employee?.designation ?? null,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const report = body.report as ReportKey;
  const fromDate = String(body.from_date ?? "");
  const toDate = String(body.to_date ?? "");
  const format = String(body.format ?? "xlsx");

  if (!Object.hasOwn(REPORT_NAMES, report) || !fromDate || !toDate) {
    return NextResponse.json({ error: "Invalid report filters" }, { status: 400 });
  }

  const { supabase, response } = await authed();
  if (response) return response;

  let employeeQuery = supabase
    .from("hrms_employee_directory")
    .select("id,employee_code,name,department,branch,designation,status,date_of_joining");
  if (body.branch) employeeQuery = employeeQuery.eq("branch", body.branch);
  if (body.department) employeeQuery = employeeQuery.eq("department", body.department);

  const { data: employees, error: employeeError } = await employeeQuery;
  if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: errorStatus(employeeError) });

  const byId = new Map((employees ?? []).map((employee) => [employee.id, employee as EmployeeRow]));
  const employeeIds = Array.from(byId.keys());
  let rows: ReportRow[];
  try {
    rows = employeeIds.length ? await reportRows(report, fromDate, toDate, employeeIds, byId, supabase) : [];
  } catch (error) {
    const err = error as { message?: string; code?: string };
    return NextResponse.json({ error: err.message ?? "Report failed" }, { status: errorStatus(err) });
  }

  return NextResponse.json({ data: { filename: filename(report, format), rows } });
}

async function reportRows(
  report: ReportKey,
  fromDate: string,
  toDate: string,
  employeeIds: string[],
  byId: Map<string, EmployeeRow>,
  supabase: Awaited<ReturnType<typeof authed>>["supabase"]
): Promise<ReportRow[]> {
  if (report === "joining") {
    const { data, error } = await supabase.schema("hrms").from("employee_assignments").select("employee_id,effective_from").in("employee_id", employeeIds).gte("effective_from", fromDate).lte("effective_from", toDate).order("effective_from");
    if (error) throw error;
    return (data ?? []).map((row) => ({ ...employeeFields(byId.get(row.employee_id)), "Joining Date": row.effective_from }));
  }

  if (report === "left") {
    const { data, error } = await supabase.schema("hrms").from("separations").select("employee_id,separation_type,resignation_date,last_working_date,status,reason").in("employee_id", employeeIds).gte("last_working_date", fromDate).lte("last_working_date", toDate).order("last_working_date");
    if (error) throw error;
    return (data ?? []).map((row) => ({ ...employeeFields(byId.get(row.employee_id)), "Separation Type": row.separation_type, "Resignation Date": row.resignation_date, "Last Working Date": row.last_working_date, "Status": row.status, "Reason": row.reason }));
  }

  if (report === "leave_balance") {
    const [{ data: types, error: typeError }, { data: leaves, error: leaveError }] = await Promise.all([
      supabase.schema("hrms").from("leave_types").select("id,name,annual_quota_days").eq("is_active", true),
      supabase.schema("hrms").from("leave_requests").select("employee_id,leave_type_id,days,status").in("employee_id", employeeIds).gte("from_date", fromDate).lte("from_date", toDate),
    ]);
    if (typeError) throw typeError;
    if (leaveError) throw leaveError;
    return employeeIds.flatMap((employeeId) => (types ?? []).map((type) => {
      const used = (leaves ?? []).filter((leave) => leave.employee_id === employeeId && leave.leave_type_id === type.id && ["pending", "approved"].includes(leave.status)).reduce((sum, leave) => sum + Number(leave.days ?? 0), 0);
      const accrued = Number(type.annual_quota_days ?? 0);
      return { ...employeeFields(byId.get(employeeId)), "Leave Type": type.name, "Accrued": accrued, "Used": used, "Balance": Math.max(accrued - used, 0) };
    }));
  }

  if (report === "leave_approval" || report === "regularization") {
    const requestType = report === "leave_approval" ? "leave" : "regularization";
    const { data, error } = await supabase.schema("hrms").from("approval_requests").select("request_code,request_type,employee_id,subject,from_date,to_date,days,reason,status,created_at").eq("request_type", requestType).in("employee_id", employeeIds).gte("created_at", `${fromDate}T00:00:00`).lte("created_at", `${toDate}T23:59:59.999`).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({ "Request Code": row.request_code, ...employeeFields(byId.get(row.employee_id)), "Subject": row.subject, "From Date": row.from_date, "To Date": row.to_date, "Days": row.days, "Status": row.status, "Reason": row.reason, "Applied At": row.created_at }));
  }

  if (report === "in_out" || report === "punch_rejection") {
    let query = supabase.schema("hrms").from("attendance_punches").select("employee_id,punched_at,direction,source,location,is_rejected,rejection_reason").in("employee_id", employeeIds).gte("punched_at", `${fromDate}T00:00:00`).lte("punched_at", `${toDate}T23:59:59.999`).order("punched_at");
    if (report === "punch_rejection") query = query.eq("is_rejected", true);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => ({ ...employeeFields(byId.get(row.employee_id)), "Punched At": row.punched_at, "Direction": row.direction, "Source": row.source, "Location": row.location, "Rejected": row.is_rejected, "Rejection Reason": row.rejection_reason }));
  }

  const { data, error } = await supabase.schema("hrms").from("attendance_days").select("employee_id,work_date,shift_name,first_in,last_out,worked_minutes,extra_minutes,day_status,payable_fraction,penalty_reason,is_regularized").in("employee_id", employeeIds).gte("work_date", fromDate).lte("work_date", toDate).order("work_date");
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...employeeFields(byId.get(row.employee_id)), "Work Date": row.work_date, "Shift": row.shift_name, "First In": row.first_in, "Last Out": row.last_out, "Worked Minutes": row.worked_minutes, "Extra Minutes": row.extra_minutes, "Status": row.day_status, "Payable": row.payable_fraction, "Regularized": row.is_regularized, "Penalty Reason": row.penalty_reason }));
}
