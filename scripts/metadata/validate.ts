import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv/dist/2020";
import { assertUniqueKeys, flattenRegistry, loadRegistry, type MetadataItem } from "./shared";

export type ValidationResult = {
  valid: boolean;
  messages: string[];
};

const schemaPath = join(process.cwd(), "metadata", "registry.schema.json");

function labelFor(item: MetadataItem) {
  return item.key ?? item.source_file ?? "unknown";
}

export function validateRegistry(rootDir = process.cwd()): ValidationResult {
  const messages: string[] = [];
  const registry = loadRegistry(rootDir);
  const items = flattenRegistry(registry);
  const ajv = new Ajv({ allErrors: true, strict: false });
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const validate = ajv.compile(schema);

  try {
    assertUniqueKeys(items);
  } catch (error) {
    messages.push(`BLOCKER [registry]: ${(error as Error).message}`);
  }

  for (const item of items) {
    const ok = validate(item);
    if (!ok) {
      for (const error of validate.errors ?? []) {
        const path = error.instancePath || "/";
        messages.push(`BLOCKER [${labelFor(item)}]: ${path} ${error.message}`);
      }
    }
  }

  return { valid: messages.length === 0, messages };
}

export function runValidation(rootDir = process.cwd()) {
  const result = validateRegistry(rootDir);
  if (result.valid) {
    console.log("Metadata validation passed");
    return;
  }

  for (const message of result.messages) {
    console.error(message);
  }
  process.exitCode = 1;
}

if (process.argv[1]?.endsWith("validate.ts")) {
  runValidation();
}
