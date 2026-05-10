import { readFileSync } from "node:fs";
import { relative } from "node:path";
import fg from "fast-glob";
import { flattenRegistry, getAllowlist, loadRegistry } from "./shared";

export type HardcodingFinding = {
  severity: "BLOCKER" | "WARNING";
  file: string;
  line: number;
  literal: string;
  reason: string;
  message: string;
};

export type HardcodingResult = {
  blockers: HardcodingFinding[];
  warnings: HardcodingFinding[];
};

const scanPatterns = [
  "app/**/*.{ts,tsx}",
  "components/**/*.{ts,tsx}",
  "lib/**/*.{ts,tsx}",
  "supabase/migrations/**/*.sql",
];

const ignorePatterns = [
  "lib/generated/**",
  "metadata/**",
  "tests/**",
  ".next/**",
  "node_modules/**",
];

const hrmsLiteralPatterns = [
  /\bbenefits_admin\b/i,
  /\bemployee\b/i,
  /\bhr_user\b/i,
  /\bleave_approver\b/i,
  /\bexpense_approver\b/i,
  /\bpayroll_manager\b/i,
  /\bLeave Application\b/i,
  /\bExpense Claim\b/i,
  /\bSalary Register\b/i,
  /\bEarned Leave\b/i,
  /\bDepartment Head Approval\b/i,
];

function lineNumberFor(content: string, index: number) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function stringLiterals(content: string) {
  const matches: { literal: string; index: number }[] = [];
  const regex = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) {
    matches.push({ literal: match[2], index: match.index });
  }
  return matches;
}

function isSuspiciousHrmsLiteral(literal: string) {
  return hrmsLiteralPatterns.some((pattern) => pattern.test(literal));
}

function formatFinding(finding: Omit<HardcodingFinding, "message">) {
  return {
    ...finding,
    message: `${finding.severity} ${finding.file}:${finding.line} ${JSON.stringify(finding.literal)} ${finding.reason}`,
  };
}

export async function scanHardcoding(rootDir = process.cwd()): Promise<HardcodingResult> {
  const files = await fg(scanPatterns, {
    cwd: rootDir,
    absolute: true,
    ignore: ignorePatterns,
  });

  const registryKeys = new Set(flattenRegistry(loadRegistry(process.cwd())).map((item) => item.key));
  const allowlist = getAllowlist(process.cwd()).map((entry) => ({
    literal: String(entry.literal),
    file: String(entry.file).replace(/\\/g, "/"),
  }));

  const blockers: HardcodingFinding[] = [];
  const warnings: HardcodingFinding[] = [];

  for (const file of files) {
    const relFile = relative(rootDir, file).replace(/\\/g, "/");
    const content = readFileSync(file, "utf8");
    for (const match of stringLiterals(content)) {
      const line = lineNumberFor(content, match.index);
      const literal = match.literal;

      const allowed = allowlist.some((entry) => entry.literal === literal && entry.file === relFile);
      if (allowed) {
        warnings.push(formatFinding({
          severity: "WARNING",
          file: relFile,
          line,
          literal,
          reason: "legacy ATS literal is allowlisted",
        }));
        continue;
      }

      if (!isSuspiciousHrmsLiteral(literal)) continue;

      const normalizedKey = literal.includes(".") ? literal : `role.${literal}`;
      if (registryKeys.has(normalizedKey) || registryKeys.has(literal)) continue;

      blockers.push(formatFinding({
        severity: "BLOCKER",
        file: relFile,
        line,
        literal,
        reason: "unregistered_metadata",
      }));
    }
  }

  return { blockers, warnings };
}

export async function runHardcodingCheck() {
  const result = await scanHardcoding();
  for (const warning of result.warnings) console.warn(warning.message);
  for (const blocker of result.blockers) console.error(blocker.message);

  if (result.blockers.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log("Metadata hardcoding check passed");
}

if (process.argv[1]?.endsWith("check-hardcoding.ts")) {
  void runHardcodingCheck();
}
