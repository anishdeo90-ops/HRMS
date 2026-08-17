import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import { HrmsProvider } from "@/components/hrms/hrms-context";
import ModuleHeader from "@/components/hrms/module-header";

/**
 * HRMS shell. The ATS `(app)` layout above this one already handles auth and
 * renders the sidebar — the sidebar swaps its nav when the path is under
 * `/hrms`, so this layout only adds the module header and the role context.
 *
 * Role gating here is navigational, not a security boundary. The real boundary
 * is RLS plus the permission checks on `/api/hrms/*`, which are Codex's.
 */
export default async function HrmsLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getAuthenticatedProfile();

  if (!user) redirect("/login");

  // TODO: read from `organizations` once the tenancy tables land.
  const orgName = "HireRabbits";

  return (
    <HrmsProvider profile={profile!}>
      <div className="p-6">
        <ModuleHeader orgName={orgName} />
        {children}
      </div>
    </HrmsProvider>
  );
}
