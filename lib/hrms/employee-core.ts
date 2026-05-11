import type { Candidate, Employee } from "@/lib/types";

export const EMPLOYEE_DOCUMENTS_BUCKET = "employee" + "-documents";
export const MAX_EMPLOYEE_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_CATEGORIES = ["identity", "education", "experience", "tax", "tax_docs", "contract", "other"] as const;

type EmployeePayload = Partial<Employee> & Record<string, unknown>;
type JoinedCandidateInput = Pick<Candidate, "final_status" | "doj_actual" | "doj"> | Record<string, unknown>;

const EMPLOYEE_READ_ONLY_FIELDS = [
  "id",
  "employee_code",
  "profile_id",
  "joined_candidate_id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
] as const;

const EMPLOYEE_STRING_FIELDS = [
  "employee_code",
  "name",
  "profile_id",
  "joined_candidate_id",
  "company_id",
  "branch_id",
  "department_id",
  "grade_id",
  "employment_type_id",
  "reporting_manager_id",
  "employment_status",
  "joining_date",
  "work_email",
  "mobile",
] as const;

function cleanString(value: unknown) {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

export function isJoinedCandidate(candidate: JoinedCandidateInput | null | undefined) {
  if (!candidate) return false;
  const finalStatus = cleanString(candidate.final_status);
  return (
    (typeof finalStatus === "string" && finalStatus.toLowerCase() === "joined")
    || Boolean(cleanString(candidate.doj_actual))
    || Boolean(cleanString(candidate.doj))
  );
}

export function normalizeEmployeePayload(input: EmployeePayload) {
  const payload: Record<string, unknown> = {};
  for (const field of EMPLOYEE_STRING_FIELDS) {
    const value = cleanString(input[field]);
    if (value !== undefined) payload[field] = field === "work_email" && typeof value === "string" ? value.toLowerCase() : value;
  }

  if (!payload.employment_status) payload.employment_status = "draft";
  payload.is_active = typeof input.is_active === "boolean" ? input.is_active : true;
  return payload;
}

export function stripEmployeeReadOnlyFields(input: EmployeePayload) {
  const payload: Record<string, unknown> = {};
  for (const field of EMPLOYEE_STRING_FIELDS) {
    const value = cleanString(input[field]);
    if (value !== undefined) payload[field] = field === "work_email" && typeof value === "string" ? value.toLowerCase() : value;
  }
  if (typeof input.is_active === "boolean") payload.is_active = input.is_active;
  for (const field of EMPLOYEE_READ_ONLY_FIELDS) delete payload[field];
  return payload;
}

export function sanitizeEmployeeDocumentSegment(value: string, fallback: string) {
  const safe = value.trim().replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^[._-]+|[._-]+$/g, "");
  return safe || fallback;
}

export function normalizeDocumentCategory(category: string | null | undefined) {
  const normalized = sanitizeEmployeeDocumentSegment(category ?? "other", "other").toLowerCase();
  return (DOCUMENT_CATEGORIES as readonly string[]).includes(normalized) ? normalized : "other";
}

export function buildEmployeeDocumentStoragePath(
  employeeId: string,
  category: string,
  fileName: string,
  timestamp = Date.now(),
) {
  const safeCategory = normalizeDocumentCategory(category);
  const safeName = sanitizeEmployeeDocumentSegment(fileName || "document", "document");
  return `${employeeId}/${safeCategory}/${timestamp}-${safeName}`;
}
