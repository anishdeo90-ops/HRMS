import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type CookieItem = { name: string; value: string; options: CookieOptions };

function readLocalEnvValue(key: string) {
  try {
    const envPath = join(process.cwd(), ".env.local");
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    const line = lines.find((entry) => entry.trim().startsWith(`${key} `) || entry.trim().startsWith(`${key}=`));
    if (!line || !line.includes("=")) return undefined;
    return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

function getSupabaseServerKey() {
  return (
    process.env.SUPABASE_SECRET_API_KEY
    || process.env.SECRET_API_KEY
    || readLocalEnvValue("Secret Api Key")
    || process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: CookieItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export async function createAdminClient() {
  const serviceKey = getSupabaseServerKey();
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: { persistSession: false },
    }
  );
}
