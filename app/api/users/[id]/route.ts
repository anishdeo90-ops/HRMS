import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/lib/types";

const VALID_PROFILE_ROLES = new Set(ROLES.filter((role) => role.value !== "candidate").map((role) => role.value));

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  if ("role" in body && !VALID_PROFILE_ROLES.has(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  const allowed = ["name", "role", "department", "is_active", "is_external_recruiter"];
  const updates: Record<string, unknown> = {};
  allowed.forEach(k => { if (k in body) updates[k] = body[k]; });

  const { error } = await supabase.from("profiles").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
