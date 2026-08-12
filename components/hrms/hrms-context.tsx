"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/lib/types";

/**
 * The signed-in user, made available to the HRMS client tree.
 *
 * Role drives which modules, tabs and actions render. It is read from the
 * session in the layout — never from the URL — per `§2.1` of the foundation
 * spec, so a user cannot widen their own scope by editing a path.
 */
const HrmsContext = createContext<Profile | null>(null);

export function HrmsProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return <HrmsContext.Provider value={profile}>{children}</HrmsContext.Provider>;
}

export function useHrmsProfile(): Profile {
  const profile = useContext(HrmsContext);
  if (!profile) throw new Error("useHrmsProfile must be used inside HrmsProvider");
  return profile;
}

/** Convenience — the two roles that administer the org. */
export function useIsHrAdmin(): boolean {
  const { role } = useHrmsProfile();
  return role === "admin" || role === "hr_manager";
}
