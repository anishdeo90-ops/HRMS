import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!data?.role) return NextResponse.json({ data });

  const admin = await createAdminClient();
  const { data: rolePermissions } = await admin
    .from("role_permissions")
    .select("permission_key")
    .eq("role_key", `role.${data.role}`);

  return NextResponse.json({
    data: {
      ...data,
      permissions: rolePermissions?.map((permission) => permission.permission_key) ?? [],
    },
  });
}
