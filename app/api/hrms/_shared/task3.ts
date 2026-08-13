import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function status(error: { code?: string }) {
  if (error.code === "42501") return 403;
  if (error.code === "22023") return 400;
  return 500;
}

async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? supabase : null;
}

export function settingsRoute(resource: string) {
  return {
    async GET() {
      const supabase = await authed();
      if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const { data, error } = await supabase.rpc("hrms_settings_resource", { resource_key: resource });
      if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
      return NextResponse.json({ data });
    },
    async POST(req: NextRequest) {
      const supabase = await authed();
      if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const { data, error } = await supabase.rpc("hrms_save_settings_resource", {
        resource_key: resource,
        payload: await req.json(),
      });
      if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
      return NextResponse.json({ data });
    },
    async PATCH(req: NextRequest) {
      const supabase = await authed();
      if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const { data, error } = await supabase.rpc("hrms_save_settings_resource", {
        resource_key: resource,
        payload: await req.json(),
      });
      if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
      return NextResponse.json({ data });
    },
  };
}

export function performanceRoute(resource: string) {
  return {
    async GET() {
      const supabase = await authed();
      if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const { data, error } = await supabase.rpc("hrms_performance_resource", { resource_key: resource });
      if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
      return NextResponse.json({ data });
    },
    async POST(req: NextRequest) {
      const supabase = await authed();
      if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const { data, error } = await supabase.rpc("hrms_save_performance_resource", {
        resource_key: resource,
        payload: await req.json(),
      });
      if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
      return NextResponse.json({ data });
    },
    async PATCH(req: NextRequest) {
      const supabase = await authed();
      if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const { data, error } = await supabase.rpc("hrms_save_performance_resource", {
        resource_key: resource,
        payload: await req.json(),
      });
      if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
      return NextResponse.json({ data });
    },
  };
}
