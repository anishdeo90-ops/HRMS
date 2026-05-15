import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import { flattenRegistry, loadRegistry, metadataDir, type MetadataItem } from "./shared";

type LineageEntry = {
  key: string;
  domain?: string;
  source_ref?: unknown;
  requirement?: string;
  registry?: string;
  db?: string;
  typescript?: string;
  api?: string;
  ui?: string;
  tests?: string;
  audit?: string;
};

export type LineageValidationResult = {
  valid: boolean;
  messages: string[];
  entries: LineageEntry[];
};

const requiredLineageFields = [
  "source_ref",
  "requirement",
  "registry",
  "db",
  "typescript",
  "api",
  "ui",
  "tests",
  "audit",
] as const;

const reportPath = ".planning/phases/01-metadata-governance-foundation/01-METADATA-LINEAGE.md";

function readLineageOverrides(rootDir: string) {
  const file = join(metadataDir(rootDir), "lineage.yaml");
  if (!existsSync(file)) return new Map<string, LineageEntry>();
  const data = parse(readFileSync(file, "utf8"));
  const items = Array.isArray(data) ? data : data?.items ?? [];
  return new Map((items as LineageEntry[]).map((entry) => [entry.key, entry]));
}

function defaultLineage(item: MetadataItem): LineageEntry {
  const tsFileByExport: Record<string, string> = {
    ROLE_KEYS: "lib/generated/roles.ts",
    ROUTE_KEYS: "lib/generated/routes.ts",
    WORKFLOW_KEYS: "lib/generated/workflows.ts",
    FORM_KEYS: "lib/generated/forms.ts",
    REPORT_KEYS: "lib/generated/reports.ts",
    PERMISSION_KEYS: "lib/generated/permissions.ts",
  };

  return {
    key: item.key,
    domain: item.domain,
    source_ref: item.source_ref,
    requirement: "META-01",
    registry: item.source_file,
    db: item.db_table === "metadata_registry" ? "supabase/generated/metadata_seed.sql" : `${item.db_table} via supabase/generated/metadata_seed.sql`,
    typescript: tsFileByExport[item.ts_export] ?? "lib/generated/metadata.ts",
    api: item.api_routes?.[0] ?? "phase-1-metadata-contract",
    ui: item.ui_surfaces?.[0] ?? "phase-1-metadata-contract",
    tests: item.tests?.[0] ?? "tests/metadata/registry-contract.test.ts",
    audit: ".planning/phases/01-metadata-governance-foundation/01-METADATA-AUDIT.md",
  };
}

export function validateLineage(rootDir = process.cwd()): LineageValidationResult {
  const items = flattenRegistry(loadRegistry(rootDir));
  const overrides = readLineageOverrides(rootDir);
  const messages: string[] = [];
  const entries = items.map((item) => {
    const override = overrides.get(item.key);
    if (!override) return defaultLineage(item);
    return { ...override, key: item.key, domain: item.domain };
  });

  for (const entry of entries) {
    for (const field of requiredLineageFields) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === "") {
        messages.push(`BLOCKER [${entry.key}]: missing lineage: ${field}`);
      }
    }
  }

  return { valid: messages.length === 0, messages, entries };
}

export function buildLineageReport(rootDir = process.cwd()) {
  const result = validateLineage(rootDir);
  const rows = result.entries
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => {
      const status = result.messages.some((message) => message.includes(`[${entry.key}]`)) ? "BLOCKED" : "OK";
      return `| ${entry.key} | ${entry.domain ?? ""} | ${status} | ${entry.registry ?? ""} | ${entry.typescript ?? ""} |`;
    });

  const markdown = [
    "# Phase 1 Metadata Lineage",
    "",
    "| Key | Domain | Status | Registry | TypeScript |",
    "|-----|--------|--------|----------|------------|",
    ...rows,
    "",
    "## Issues",
    "",
    ...(result.messages.length > 0 ? result.messages.map((message) => `- ${message}`) : ["- None"]),
    "",
  ].join("\n");

  return { ...result, markdown };
}

export async function runLineageReport() {
  const result = buildLineageReport();
  console.log(result.markdown);
  for (const message of result.messages) console.error(message);

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, result.markdown);

  if (!result.valid) {
    process.exitCode = 1;
    return;
  }

  console.log("Metadata lineage report complete");
}

if (process.argv[1]?.endsWith("lineage-report.ts")) {
  void runLineageReport();
}
