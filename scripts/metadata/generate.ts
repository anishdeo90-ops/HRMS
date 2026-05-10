import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { flattenRegistry, GENERATED_HEADER, loadRegistry, type MetadataItem } from "./shared";
import { validateRegistry } from "./validate";

function generatedFile(body: string) {
  return `// ${GENERATED_HEADER}\n\n${body}`;
}

function sortItems(items: MetadataItem[]) {
  return [...items].sort((a, b) => a.key.localeCompare(b.key));
}

function keysFor(items: MetadataItem[], predicate: (item: MetadataItem) => boolean) {
  return sortItems(items.filter(predicate)).map((item) => item.key);
}

function constFile(constName: string, keys: string[]) {
  const typeName = constName === "METADATA_KEYS" ? "MetadataKey" : "GeneratedKey";
  return generatedFile(
    `export const ${constName} = ${JSON.stringify(keys, null, 2)} as const;\n\n` +
      `export type ${typeName} = typeof ${constName}[number];\n`,
  );
}

function sqlString(value: unknown) {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function textString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function seedSql(items: MetadataItem[]) {
  const rows = sortItems(items).map((item) => {
    return [
      textString(item.key),
      textString(item.label),
      textString(item.domain),
      textString(item.owner),
      sqlString(item.source_ref),
      String(item.introduced_in_phase),
      textString(item.db_table),
      textString(item.ts_export),
      sqlString(item.api_routes),
      sqlString(item.ui_surfaces),
      sqlString(item.tests),
    ].join(", ");
  });

  return `-- ${GENERATED_HEADER}\n\n` +
    `insert into metadata_registry (\n` +
    `  key, label, domain, owner, source_ref, introduced_in_phase,\n` +
    `  db_table, ts_export, api_routes, ui_surfaces, tests\n` +
    `) values\n` +
    rows.map((row) => `  (${row})`).join(",\n") +
    `\non conflict (key) do update set\n` +
    `  label = excluded.label,\n` +
    `  domain = excluded.domain,\n` +
    `  owner = excluded.owner,\n` +
    `  source_ref = excluded.source_ref,\n` +
    `  db_table = excluded.db_table,\n` +
    `  ts_export = excluded.ts_export,\n` +
    `  api_routes = excluded.api_routes,\n` +
    `  ui_surfaces = excluded.ui_surfaces,\n` +
    `  tests = excluded.tests;\n`;
}

async function writeGenerated(outRoot: string, path: string, contents: string) {
  const fullPath = join(outRoot, path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents);
}

export async function generateMetadataArtifacts(rootDir = process.cwd(), outRoot = rootDir) {
  const validation = validateRegistry(rootDir);
  if (!validation.valid) {
    throw new Error(validation.messages.join("\n"));
  }

  const items = flattenRegistry(loadRegistry(rootDir));
  const allKeys = keysFor(items, () => true);
  const roleKeys = keysFor(items, (item) => item.key.startsWith("role."));
  const routeKeys = keysFor(items, (item) => item.key.startsWith("route."));
  const workflowKeys = keysFor(items, (item) => item.key.startsWith("workflow."));
  const formKeys = keysFor(items, (item) => item.key.startsWith("form."));
  const reportKeys = keysFor(items, (item) => item.key.startsWith("report."));
  const permissionKeys = keysFor(items, (item) => item.key.startsWith("permission."));

  await writeGenerated(
    outRoot,
    "lib/generated/metadata.ts",
    generatedFile(
      `export const METADATA_KEYS = ${JSON.stringify(allKeys, null, 2)} as const;\n\n` +
        `export type MetadataKey = typeof METADATA_KEYS[number];\n\n` +
        `export function isMetadataKey(value: string): value is MetadataKey {\n` +
        `  return (METADATA_KEYS as readonly string[]).includes(value);\n` +
        `}\n`,
    ),
  );
  await writeGenerated(outRoot, "lib/generated/roles.ts", constFile("ROLE_KEYS", roleKeys));
  await writeGenerated(outRoot, "lib/generated/routes.ts", constFile("ROUTE_KEYS", routeKeys));
  await writeGenerated(outRoot, "lib/generated/workflows.ts", constFile("WORKFLOW_KEYS", workflowKeys));
  await writeGenerated(outRoot, "lib/generated/forms.ts", constFile("FORM_KEYS", formKeys));
  await writeGenerated(outRoot, "lib/generated/reports.ts", constFile("REPORT_KEYS", reportKeys));
  await writeGenerated(outRoot, "lib/generated/permissions.ts", constFile("PERMISSION_KEYS", permissionKeys));
  await writeGenerated(outRoot, "supabase/generated/metadata_seed.sql", seedSql(items));

  return {
    files: [
      "lib/generated/metadata.ts",
      "lib/generated/roles.ts",
      "lib/generated/routes.ts",
      "lib/generated/workflows.ts",
      "lib/generated/forms.ts",
      "lib/generated/reports.ts",
      "lib/generated/permissions.ts",
      "supabase/generated/metadata_seed.sql",
    ].map((file) => relative(process.cwd(), join(outRoot, file)).replace(/\\/g, "/")),
  };
}

export async function runGeneration() {
  try {
    await generateMetadataArtifacts();
    console.log("Metadata generation complete");
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("generate.ts")) {
  void runGeneration();
}
