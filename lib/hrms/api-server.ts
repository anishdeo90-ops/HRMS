import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function hrmsContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: member, error } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!member) return { error: NextResponse.json({ error: "No HRMS organization membership" }, { status: 403 }) };

  return { supabase, user, orgId: member.org_id as string };
}

export function status(error: { code?: string }) {
  return error.code === "42501" ? 403 : 500;
}

export async function event(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: {
    org_id: string;
    product_key?: string;
    entity_type: string;
    entity_id: string;
    event_type: string;
    summary: string;
    metadata?: Record<string, unknown>;
    actor_profile_id?: string;
  }
) {
  await supabase.from("entity_events").insert({
    product_key: "hrms",
    metadata: {},
    ...row,
  });
}

export async function link(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: {
    org_id: string;
    source_product: string;
    source_entity_type: string;
    source_entity_id: string;
    target_product: string;
    target_entity_type: string;
    target_entity_id: string;
    link_type: string;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("entity_links").upsert({ metadata: {}, ...row }, {
    onConflict: "org_id,source_product,source_entity_type,source_entity_id,target_product,target_entity_type,target_entity_id,link_type",
  });
}
