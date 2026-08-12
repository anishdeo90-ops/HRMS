import type { Role } from "@/lib/types";

/**
 * Where a role lands after sign-in.
 *
 * HR managers and admins run the org, so they open in the HRMS and switch to the
 * ATS through the waffle. Recruiters and HODs live in the pipeline, so they keep
 * landing in the ATS. Candidates never reach the app shell.
 */
export function landingPathForRole(role: Role | null | undefined): string {
  switch (role) {
    case "admin":
    case "hr_manager":
      return "/hrms";
    default:
      return "/dashboard";
  }
}
