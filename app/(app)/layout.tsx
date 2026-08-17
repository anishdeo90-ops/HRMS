import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/supabase/server";
import Sidebar from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getAuthenticatedProfile();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile!} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
