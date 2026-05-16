const NOTIFICATION_CATEGORIES = new Set(["profile", "attendance", "leave", "expenses", "payroll", "performance", "lifecycle", "system"]);
const NOTIFICATION_SEVERITIES = new Set(["info", "success", "warning", "critical"]);
const NOTIFICATION_STATUSES = new Set(["unread", "read", "archived"]);

export type EmployeeNotificationStatus = "unread" | "read" | "archived";

export function normalizeNotificationPayload(input: Record<string, unknown>) {
  const status = typeof input.status === "string" && NOTIFICATION_STATUSES.has(input.status)
    ? input.status as EmployeeNotificationStatus
    : "unread";
  const category = typeof input.category === "string" && NOTIFICATION_CATEGORIES.has(input.category) ? input.category : "system";
  const severity = typeof input.severity === "string" && NOTIFICATION_SEVERITIES.has(input.severity) ? input.severity : "info";
  const readAt = status === "read" || status === "archived" ? input.read_at ?? new Date().toISOString() : null;
  const archivedAt = status === "archived" ? input.archived_at ?? new Date().toISOString() : null;

  return {
    employee_id: input.employee_id,
    title: String(input.title ?? "").trim(),
    body: typeof input.body === "string" && input.body.trim() ? input.body.trim() : null,
    category,
    severity,
    status,
    source_key: typeof input.source_key === "string" && input.source_key.trim() ? input.source_key.trim() : null,
    source_table: typeof input.source_table === "string" && input.source_table.trim() ? input.source_table.trim() : null,
    source_id: typeof input.source_id === "string" && input.source_id.trim() ? input.source_id.trim() : null,
    action_href: typeof input.action_href === "string" && input.action_href.trim() ? input.action_href.trim() : null,
    due_at: typeof input.due_at === "string" && input.due_at.trim() ? input.due_at.trim() : null,
    read_at: readAt,
    archived_at: archivedAt,
  };
}

export function notificationStatusPatch(status: string) {
  if (status === "read") return { status: "read", read_at: new Date().toISOString(), archived_at: null };
  if (status === "archived") {
    const now = new Date().toISOString();
    return { status: "archived", read_at: now, archived_at: now };
  }
  if (status === "unread") return { status: "unread", read_at: null, archived_at: null };
  return null;
}

export function selfServiceTargetFromEmployee(employee: any) {
  return {
    employee_id: employee?.id ?? employee?.employee_id ?? null,
    profile_id: employee?.profile_id ?? employee?.employee?.profile_id ?? null,
  };
}
