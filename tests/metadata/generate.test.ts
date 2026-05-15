import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { generateMetadataArtifacts } from "../../scripts/metadata/generate";
import { GENERATED_HEADER } from "../../scripts/metadata/shared";

describe("metadata generation", () => {
  it("writes deterministic TypeScript constants and SQL seed output", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "metadata-generated-"));

    await generateMetadataArtifacts(process.cwd(), outDir);

    const metadataTs = await readFile(join(outDir, "lib/generated/metadata.ts"), "utf8");
    const rolesTs = await readFile(join(outDir, "lib/generated/roles.ts"), "utf8");
    const sql = await readFile(join(outDir, "supabase/generated/metadata_seed.sql"), "utf8");

    assert.ok(metadataTs.startsWith(`// ${GENERATED_HEADER}`));
    assert.match(rolesTs, /ROLE_KEYS/);
    assert.match(rolesTs, /role\.hr_manager/);
    assert.match(sql, /insert into metadata_registry/);
    assert.match(sql, /on conflict/);
  });
});
