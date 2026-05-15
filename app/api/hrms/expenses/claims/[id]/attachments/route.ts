import { NextRequest, NextResponse } from "next/server";
import { canApproveExpenseRecord, canManageExpenses, canViewExpenseRecord } from "@/lib/hrms/expense-authorization";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { buildExpenseAttachmentPath } from "@/lib/hrms/expenses";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const CLAIM_SELECT = [
  "id, employee_id",
  "employee:employees(id, profile_id, department_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id))",
].join(",");

function targetFromRecord(record: any) {
  return {
    employee_id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_profile_id: record.employee?.reporting_manager?.profile_id,
  };
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: claim, error: claimError } = await supabase.from("expense_claims").select(CLAIM_SELECT).eq("id", id).single();
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  const claimRecord = claim as any;
  const target = targetFromRecord(claimRecord);
  if (!canViewExpenseRecord(profile, target) && !canApproveExpenseRecord(profile, target, "expense_claim") && !canManageExpenses(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attachment file is required" }, { status: 400 });

  const path = buildExpenseAttachmentPath(claimRecord.employee_id, claimRecord.id, file.name);
  const admin = await createAdminClient();
  const { error: uploadError } = await admin.storage.from("expense-attachments").upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: signed, error: signedError } = await admin.storage.from("expense-attachments").createSignedUrl(path, 60 * 10);
  if (signedError) return NextResponse.json({ error: signedError.message }, { status: 500 });
  return NextResponse.json({ data: { path, signedUrl: signed.signedUrl } }, { status: 201 });
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: claim, error: claimError } = await supabase.from("expense_claims").select(CLAIM_SELECT).eq("id", id).single();
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  const claimRecord = claim as any;
  const target = targetFromRecord(claimRecord);
  if (!canViewExpenseRecord(profile, target) && !canApproveExpenseRecord(profile, target, "expense_claim") && !canManageExpenses(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const admin = await createAdminClient();
  const prefix = buildExpenseAttachmentPath(claimRecord.employee_id, claimRecord.id, "attachment").replace(/\/attachment$/, "");
  const { data: files, error: listError } = await admin.storage.from("expense-attachments").list(prefix);
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const data = await Promise.all((files ?? []).map(async (file) => {
    const path = `${prefix}/${file.name}`;
    const { data: signed } = await admin.storage.from("expense-attachments").createSignedUrl(path, 60 * 10);
    return { ...file, path, signedUrl: signed?.signedUrl ?? null };
  }));
  return NextResponse.json({ data });
}
