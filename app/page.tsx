import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { landingPathForRole } from "@/lib/landing";
import type { Profile } from "@/lib/types";

/**
 * The one place that decides where a signed-in user lands. Middleware and the
 * login form both send people here rather than guessing a product, so the rule
 * lives in `lib/landing.ts` alone.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(landingPathForRole((profile as Pick<Profile, "role"> | null)?.role));
}
