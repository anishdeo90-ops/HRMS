"use client";

import { usePathname } from "next/navigation";
import { moduleForPathname } from "@/lib/hrms/nav";
import { TabStrip } from "@/components/hrms/ui";
import { useHrmsProfile } from "@/components/hrms/hrms-context";

/**
 * The module name and its tab strip, rendered once by the layout.
 *
 * The reference product shows the same pages in a left rail and in a horizontal
 * strip; both are driven by `HRMS_NAV`, so they cannot drift.
 */
export default function ModuleHeader({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  const profile = useHrmsProfile();
  const activeModule = moduleForPathname(pathname);

  if (!activeModule) return null;

  return (
    <div className="mb-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{orgName}</p>
      <h1 className="mt-0.5 text-xl font-bold text-gray-900">{activeModule.label}</h1>
      <div className="mt-4">
        <TabStrip tabs={activeModule.tabs} role={profile.role} />
      </div>
    </div>
  );
}
