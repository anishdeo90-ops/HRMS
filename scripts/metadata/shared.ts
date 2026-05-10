import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import fg from "fast-glob";
import { parse } from "yaml";

export const GENERATED_HEADER = "AUTO-GENERATED FILE. DO NOT EDIT.";

export type SourceRef = {
  system: string;
  module: string;
  artifact: string;
  field_or_state?: string;
};

export type MetadataItem = {
  key: string;
  label: string;
  domain: string;
  kind?: string;
  owner: string;
  source_ref: SourceRef;
  introduced_in_phase: number;
  db_table: string;
  ts_export: string;
  api_routes: string[];
  ui_surfaces: string[];
  tests: string[];
  source_file?: string;
  [key: string]: unknown;
};

export type MetadataRegistry = {
  rootDir: string;
  files: string[];
  items: MetadataItem[];
};

export function metadataDir(rootDir = process.cwd()) {
  return join(rootDir, "metadata");
}

export function readYamlItems(filePath: string): MetadataItem[] {
  const data = parse(readFileSync(filePath, "utf8"));
  if (Array.isArray(data)) return data as MetadataItem[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: MetadataItem[] }).items;
  }
  return [];
}

export function loadRegistry(rootDir = process.cwd()): MetadataRegistry {
  const cwd = metadataDir(rootDir);
  const files = fg.sync("**/*.{yaml,yml}", {
    cwd,
    absolute: true,
    ignore: ["metadata/allowlists/**", "allowlists/**", "lineage.yaml"],
  });

  const items = files.flatMap((file) =>
    readYamlItems(file).map((item) => ({
      ...item,
      source_file: relative(rootDir, file).replace(/\\/g, "/"),
    })),
  );

  return { rootDir, files, items };
}

export function flattenRegistry(registry: MetadataRegistry): MetadataItem[] {
  return [...registry.items];
}

export function assertUniqueKeys(items: MetadataItem[]): void {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (seen.has(item.key)) {
      throw new Error(`duplicate metadata key ${item.key} in ${item.source_file} and ${seen.get(item.key)}`);
    }
    seen.set(item.key, item.source_file ?? "unknown");
  }
}

export function getAllowlist(rootDir = process.cwd()) {
  const file = join(metadataDir(rootDir), "allowlists", "legacy-ats-literals.yaml");
  if (!existsSync(file)) return [];
  return readYamlItems(file);
}
