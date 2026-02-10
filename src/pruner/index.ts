import * as path from "node:path";
import { glob } from "glob";
import type { ExistingConfig, ToolTarget } from "../types/index.js";
import { scanExistingConfigs } from "../scanner/config-scanner.js";
import { parseFrontmatter } from "../utils/frontmatter.js";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface PruneTarget {
  tool: ToolTarget;
  file: string;
  reason: "dead-globs" | "empty-content";
  message: string;
  sizeBytes: number;
}

export interface PruneResult {
  configsScanned: number;
  pruneTargets: PruneTarget[];
}

// ─────────────────────────────────────────────────────────────
// Detection: dead glob patterns
// ─────────────────────────────────────────────────────────────

/** Extract glob patterns from a config's frontmatter */
function extractGlobPatterns(config: ExistingConfig): string[] {
  const content = config.content ?? "";
  const fm = parseFrontmatter(content);
  if (!fm.found) return [];

  const patterns: string[] = [];

  // Cursor: globs field
  if (fm.fields["globs"]) {
    patterns.push(...fm.fields["globs"].split(",").map((g) => g.trim()));
  }

  // Copilot: applyTo field
  if (fm.fields["applyTo"]) {
    const applyTo = fm.fields["applyTo"].replace(/^"(.*)"$/, "$1");
    patterns.push(...applyTo.split(",").map((g) => g.trim()));
  }

  return patterns.filter(Boolean);
}

/** Check if a config's glob patterns match any files */
async function checkDeadGlobs(
  config: ExistingConfig,
  projectRoot: string
): Promise<PruneTarget | null> {
  const patterns = extractGlobPatterns(config);
  if (patterns.length === 0) return null;

  // Skip universal patterns
  const specificPatterns = patterns.filter((p) => p !== "**/*" && p !== "**");
  if (specificPatterns.length === 0) return null;

  let totalMatches = 0;
  for (const pattern of specificPatterns) {
    // Skip path traversal patterns
    if (pattern.includes("..") || path.isAbsolute(pattern)) continue;

    try {
      const fullPattern = path.join(projectRoot, pattern).replace(/\\/g, "/");
      const matches = await glob(fullPattern, { nodir: true, dot: true });
      totalMatches += matches.length;
    } catch {
      // invalid glob — already caught by validate
    }
  }

  if (totalMatches === 0) {
    return {
      tool: config.tool,
      file: config.filePath,
      reason: "dead-globs",
      message: `All glob patterns match 0 files: ${specificPatterns.join(", ")}`,
      sizeBytes: config.sizeBytes,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Detection: empty content
// ─────────────────────────────────────────────────────────────

/** Check if a config file has no meaningful content */
function checkEmptyContent(config: ExistingConfig): PruneTarget | null {
  const content = config.content ?? "";
  const fm = parseFrontmatter(content);

  // Get the body (content after frontmatter)
  const body = fm.found ? fm.body : content;

  // Strip whitespace and check length
  const meaningful = body.replace(/\s/g, "");
  if (meaningful.length < 10) {
    return {
      tool: config.tool,
      file: config.filePath,
      reason: "empty-content",
      message: `Config has ${meaningful.length} chars of content (effectively empty)`,
      sizeBytes: config.sizeBytes,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Main prune entry point
// ─────────────────────────────────────────────────────────────

/** Find config files that are candidates for removal */
export async function findPruneTargets(
  projectRoot: string
): Promise<PruneResult> {
  const configs = await scanExistingConfigs(projectRoot);
  const pruneTargets: PruneTarget[] = [];

  for (const config of configs) {
    // Check for empty content
    const emptyResult = checkEmptyContent(config);
    if (emptyResult) {
      pruneTargets.push(emptyResult);
      continue; // Don't double-flag
    }

    // Check for dead glob patterns
    const deadGlobResult = await checkDeadGlobs(config, projectRoot);
    if (deadGlobResult) {
      pruneTargets.push(deadGlobResult);
    }
  }

  return {
    configsScanned: configs.length,
    pruneTargets,
  };
}
