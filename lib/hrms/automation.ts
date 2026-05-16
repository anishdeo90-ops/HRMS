type AutomationPayload = Record<string, unknown>;

export type AutomationRuleStatus = "draft" | "active" | "paused" | "archived";
export type NotificationRuleStatus = "draft" | "active" | "paused" | "archived";
export type AutomationExecutionStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

const CALLER_WRITABLE_RULE_STATUSES = new Set<AutomationRuleStatus>(["draft", "active", "paused"]);
const CALLER_WRITABLE_NOTIFICATION_STATUSES = new Set<NotificationRuleStatus>(["draft", "active", "paused"]);
const CALLER_WRITABLE_EXECUTION_STATUSES = new Set<AutomationExecutionStatus>(["queued"]);

const READ_ONLY_FIELDS = [
  "id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "last_run_at",
  "last_run_status",
  "started_at",
  "finished_at",
  "completed_at",
  "failed_at",
  "cancelled_at",
  "locked_at",
  "locked_by",
] as const;

const AUTOMATION_RULE_FIELDS = [
  "key",
  "name",
  "description",
  "category",
  "trigger_type",
  "schedule",
  "status",
  "is_active",
  "conditions",
  "actions",
  "next_run_at",
] as const;

const NOTIFICATION_RULE_FIELDS = [
  "key",
  "name",
  "description",
  "category",
  "event_key",
  "audience",
  "channel",
  "severity",
  "status",
  "is_active",
  "conditions",
  "template",
] as const;

const EXECUTION_FIELDS = [
  "automation_rule_id",
  "rule_key",
  "status",
  "scope",
  "input",
  "result",
] as const;

function cleanString(value: unknown) {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStatus<T extends string>(value: unknown, allowed: Set<T>, fallback: T) {
  const cleaned = cleanString(value);
  if (typeof cleaned !== "string") return fallback;
  const normalized = cleaned.toLowerCase().replace(/[\s-]+/g, "_") as T;
  return allowed.has(normalized) ? normalized : fallback;
}

function pickCleanFields(input: AutomationPayload, fields: readonly string[]) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = cleanString(input[field]);
    if (value !== undefined && value !== null) payload[field] = value;
  }
  return payload;
}

function normalizeObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined && item !== ""));
}

function normalizeKey(value: unknown) {
  const cleaned = cleanString(value);
  if (typeof cleaned !== "string") return undefined;
  return cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function stripAutomationReadOnlyFields(input: AutomationPayload) {
  const payload = { ...input };
  for (const field of READ_ONLY_FIELDS) delete payload[field];
  return payload;
}

export function normalizeAutomationRulePayload(input: AutomationPayload) {
  const source = { ...stripAutomationReadOnlyFields(input) };
  if (source.rule_key && !source.key) source.key = source.rule_key;
  if (source.title && !source.name) source.name = source.title;
  const payload = pickCleanFields(source, AUTOMATION_RULE_FIELDS);
  const key = normalizeKey(payload.key);
  if (key) payload.key = key;
  payload.conditions = normalizeObject(source.conditions);
  payload.actions = normalizeObject(source.actions);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_RULE_STATUSES, "draft");
  payload.is_active = payload.status === "active";
  return payload;
}

export function normalizeNotificationRulePayload(input: AutomationPayload) {
  const source = { ...stripAutomationReadOnlyFields(input) };
  if (source.rule_key && !source.key) source.key = source.rule_key;
  if (source.title && !source.name) source.name = source.title;
  const payload = pickCleanFields(source, NOTIFICATION_RULE_FIELDS);
  const key = normalizeKey(payload.key);
  if (key) payload.key = key;
  payload.conditions = normalizeObject(source.conditions);
  payload.template = normalizeObject(source.template);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_NOTIFICATION_STATUSES, "draft");
  payload.is_active = payload.status === "active";
  return payload;
}

export function normalizeAutomationExecutionPayload(input: AutomationPayload) {
  const source = { ...stripAutomationReadOnlyFields(input) };
  if (source.automation_id && !source.automation_rule_id) source.automation_rule_id = source.automation_id;
  if (source.key && !source.rule_key) source.rule_key = source.key;
  const payload = pickCleanFields(source, EXECUTION_FIELDS);
  payload.scope = normalizeObject(source.scope);
  payload.input = normalizeObject(source.input);
  payload.result = normalizeObject(source.result);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_EXECUTION_STATUSES, "queued");
  return payload;
}
