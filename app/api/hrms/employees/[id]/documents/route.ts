import { NextRequest, NextResponse } from "next/server";
import { canManageEmployeeDocuments, type HrmsProfile } from "@/lib/hrms/authorization";
import {
  buildEmployeeDocumentStoragePath,
  DOCUMENT_CATEGORIES,
  EMPLOYEE_DOCUMENTS_BUCKET,
  MAX_EMPLOYEE_DOCUMENT_BYTES,
  normalizeDocumentCategory,
} from "@/lib/hrms/employee-core";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

// Private Supabase bucket: employee-documents

async function currentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).single();
  return { user, profile: profile as HrmsProfile | null };
}

async function signedRows(rows: Record<string, unknown>[]) {
  const admin = await createAdminClient();
  return Promise.all(rows.map(async (row) => {
    const storagePath = typeof row.storage_path === "string" ? row.storage_path : "";
    const { data: urlData } = await admin.storage.from(EMPLOYEE_DOCUMENTS_BUCKET).createSignedUrl(storagePath, 3600);
    return { ...row, signed_url: urlData?.signedUrl ?? null };
  }));
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("employee_documents")
    .select("*, uploaded_by_profile:profiles(name)")
    .eq("employee_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: await signedRows(data ?? []) });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageEmployeeDocuments(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const category = normalizeDocumentCategory(formData.get("category") as string | null);
  const visibility = (formData.get("visibility") as string | null) ?? "hr_only";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!DOCUMENT_CATEGORIES.includes(category as (typeof DOCUMENT_CATEGORIES)[number])) {
    return NextResponse.json({ error: "Unsupported category" }, { status: 400 });
  }
  if (!["hr_only", "employee", "manager"].includes(visibility)) {
    return NextResponse.json({ error: "Unsupported visibility" }, { status: 400 });
  }
  if (file.size > MAX_EMPLOYEE_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const storagePath = buildEmployeeDocumentStoragePath(id, category, file.name || "document");
  const admin = await createAdminClient();
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from(EMPLOYEE_DOCUMENTS_BUCKET)
    .upload(storagePath, Buffer.from(bytes), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data, error } = await supabase
    .from("employee_documents")
    .insert({
      employee_id: id,
      document_type: category,
      file_name: file.name || "document",
      storage_path: storagePath,
      visibility,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    await admin.storage.from(EMPLOYEE_DOCUMENTS_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const [withUrl] = await signedRows([data]);
  return NextResponse.json({ data: withUrl });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageEmployeeDocuments(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const documentId = new URL(req.url).searchParams.get("document_id");
  if (!documentId) return NextResponse.json({ error: "document_id required" }, { status: 400 });

  const { data: row, error: rowError } = await supabase
    .from("employee_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("employee_id", id)
    .single();

  if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 });

  const admin = await createAdminClient();
  if (row?.storage_path) await admin.storage.from(EMPLOYEE_DOCUMENTS_BUCKET).remove([row.storage_path]);

  const { error } = await supabase.from("employee_documents").delete().eq("id", documentId).eq("employee_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
