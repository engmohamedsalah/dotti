import * as path from "node:path";
import { glob } from "glob";
import type {
  ExistingConfig,
  ToolTarget,
  ValidationResult,
  ValidationIssue,
} from "../types/index.js";
import { TOOL_REGISTRY } from "../types/index.js";
import { scanExistingConfigs } from "../scanner/config-scanner.js";

// ─────────────────────────────────────────────────────────────
// Frontmatter parsing
// ─────────────────────────────────────────────────────────────

interface FrontmatterResult {
  found: boolean;
  fields: Record<string, string>;
  body: string;
}

/** Parse YAML-style frontmatter from markdown content */
function parseFrontmatter(content: string): FrontmatterResult {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { found: false, fields: {}, body: content };
  }

  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      fields[key] = value;
    }
  }

  return { found: true, fields, body: match[2] };
}

// ─────────────────────────────────────────────────────────────
// Per-tool validators
// ─────────────────────────────────────────────────────────────

type ToolValidator = (
  config: ExistingConfig,
  projectRoot: string
) => ValidationIssue[];

function validateClaudeConfig(
  config: ExistingConfig,
  _projectRoot: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const content = config.content ?? "";

  // Agent files require YAML frontmatter with name + description
  const normalized = config.filePath.replace(/\\/g, "/");
  if (normalized.includes(".claude/agents/")) {
    const fm = parseFrontmatter(content);
    if (!fm.found) {
      issues.push({
        tool: "claude",
        file: config.filePath,
        severity: "error",
        message: "Claude agent file missing YAML frontmatter (---)",
        fix: "Add frontmatter with `name` and `description` fields",
      });
    } else {
      if (!fm.fields["name"]) {
        issues.push({
          tool: "claude",
          file: config.filePath,
          severity: "error",
          message: "Claude agent frontmatter missing `name` field",
          fix: "Add `name: Your Agent Name` to frontmatter",
        });
      }
      if (!fm.fields["description"]) {
        issues.push({
          tool: "claude",
          file: config.filePath,
          severity: "warning",
          message: "Claude agent frontmatter missing `description` field",
          fix: "Add `description: What this agent does` to frontmatter",
        });
      }
    }
  }

  return issues;
}

function validateCursorConfig(
  config: ExistingConfig,
  _projectRoot: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const content = config.content ?? "";

  // .mdc files require frontmatter with description, globs, alwaysApply
  if (config.filePath.endsWith(".mdc")) {
    const fm = parseFrontmatter(content);
    if (!fm.found) {
      issues.push({
        tool: "cursor",
        file: config.filePath,
        severity: "error",
        message: "Cursor .mdc file missing YAML frontmatter (---)",
        fix: "Add frontmatter with `description`, `globs`, and `alwaysApply` fields",
      });
    } else {
      if (!fm.fields["description"]) {
        issues.push({
          tool: "cursor",
          file: config.filePath,
          severity: "warning",
          message: "Cursor .mdc frontmatter missing `description` field",
          fix: "Add `description: What this rule does`",
        });
      }
      if (!fm.fields["globs"] && fm.fields["alwaysApply"] !== "true") {
        issues.push({
          tool: "cursor",
          file: config.filePath,
          severity: "warning",
          message:
            "Cursor .mdc frontmatter missing `globs` field and `alwaysApply` is not true",
          fix: "Add `globs: **/*.ts` or set `alwaysApply: true`",
        });
      }
    }
  }

  return issues;
}

function validateCodexConfig(
  config: ExistingConfig,
  _projectRoot: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // AGENTS.md must be ≤ 32KB
  if (
    config.filePath === "AGENTS.md" ||
    config.filePath === "AGENTS.override.md"
  ) {
    const limit = TOOL_REGISTRY.codex.maxContextSize!;
    if (config.sizeBytes > limit) {
      issues.push({
        tool: "codex",
        file: config.filePath,
        severity: "error",
        message: `File is ${(config.sizeBytes / 1024).toFixed(1)}KB — exceeds Codex 32KB limit`,
        fix: "Reduce content or split into subdirectory AGENTS.md files",
      });
    }
  }

  return issues;
}

function validateCopilotConfig(
  config: ExistingConfig,
  _projectRoot: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const content = config.content ?? "";

  // Instruction files need applyTo frontmatter
  if (config.filePath.endsWith(".instructions.md")) {
    const fm = parseFrontmatter(content);
    if (!fm.found) {
      issues.push({
        tool: "copilot",
        file: config.filePath,
        severity: "error",
        message: "Copilot instruction file missing YAML frontmatter",
        fix: 'Add frontmatter with `applyTo: "**/*.ts"` pattern',
      });
    } else if (!fm.fields["applyTo"]) {
      issues.push({
        tool: "copilot",
        file: config.filePath,
        severity: "warning",
        message: "Copilot instruction file missing `applyTo` field",
        fix: 'Add `applyTo: "**/*.ts"` to frontmatter',
      });
    }
  }

  // Agent files need name + description
  if (config.filePath.endsWith(".agent.md")) {
    const fm = parseFrontmatter(content);
    if (!fm.found) {
      issues.push({
        tool: "copilot",
        file: config.filePath,
        severity: "error",
        message: "Copilot agent file missing YAML frontmatter",
        fix: "Add frontmatter with `name` and `description` fields",
      });
    } else {
      if (!fm.fields["name"]) {
        issues.push({
          tool: "copilot",
          file: config.filePath,
          severity: "error",
          message: "Copilot agent frontmatter missing `name` field",
        });
      }
      if (!fm.fields["description"]) {
        issues.push({
          tool: "copilot",
          file: config.filePath,
          severity: "warning",
          message: "Copilot agent frontmatter missing `description` field",
        });
      }
    }
  }

  // Per-file size check (30k chars)
  const charLimit = TOOL_REGISTRY.copilot.maxContextSize;
  if (charLimit && content.length > charLimit) {
    issues.push({
      tool: "copilot",
      file: config.filePath,
      severity: "error",
      message: `File is ${(content.length / 1000).toFixed(1)}k chars — exceeds Copilot 30k char limit`,
      fix: "Reduce content size or split into multiple instruction files",
    });
  }

  return issues;
}

function validateWindsurfConfig(
  config: ExistingConfig,
  _projectRoot: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const content = config.content ?? "";

  // .windsurfrules must be ≤ 6000 chars
  if (config.filePath === ".windsurfrules") {
    const limit = TOOL_REGISTRY.windsurf.maxContextSize!;
    if (content.length > limit) {
      issues.push({
        tool: "windsurf",
        file: config.filePath,
        severity: "error",
        message: `File is ${content.length} chars — exceeds Windsurf 6,000 char limit`,
        fix: "Reduce content to fit within 6,000 characters",
      });
    }
  }

  return issues;
}

function validateGeminiConfig(
  config: ExistingConfig,
  _projectRoot: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Warn about nested GEMINI.md files (Gemini loads hierarchically)
  if (config.filePath !== "GEMINI.md" && config.filePath.endsWith("GEMINI.md")) {
    issues.push({
      tool: "gemini",
      file: config.filePath,
      severity: "warning",
      message:
        "Nested GEMINI.md detected — Gemini CLI loads these hierarchically which may cause context duplication",
    });
  }

  return issues;
}

function validateAmpConfig(
  config: ExistingConfig,
  _projectRoot: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // .amp/settings.json must be valid JSON with $schema
  const normalizedPath = config.filePath.replace(/\\/g, "/");
  if (normalizedPath === ".amp/settings.json") {
    const content = config.content ?? "";
    try {
      const parsed = JSON.parse(content);
      if (!parsed["$schema"]) {
        issues.push({
          tool: "amp",
          file: config.filePath,
          severity: "warning",
          message: "Amp settings.json missing `$schema` field",
          fix: 'Add `"$schema": "https://amp.dev/schemas/settings.json"`',
        });
      }
    } catch {
      issues.push({
        tool: "amp",
        file: config.filePath,
        severity: "error",
        message: "Amp settings.json is not valid JSON",
        fix: "Fix JSON syntax errors",
      });
    }
  }

  return issues;
}

const TOOL_VALIDATORS: Record<ToolTarget, ToolValidator> = {
  claude: validateClaudeConfig,
  cursor: validateCursorConfig,
  codex: validateCodexConfig,
  copilot: validateCopilotConfig,
  windsurf: validateWindsurfConfig,
  gemini: validateGeminiConfig,
  amp: validateAmpConfig,
};

// ─────────────────────────────────────────────────────────────
// Glob pattern validation
// ─────────────────────────────────────────────────────────────

/** Extract glob patterns from config frontmatter */
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

/** Check if glob patterns match any files in the project */
async function validateGlobPatterns(
  config: ExistingConfig,
  projectRoot: string
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const patterns = extractGlobPatterns(config);

  for (const pattern of patterns) {
    if (pattern === "**/*" || pattern === "**") continue; // universal patterns always match

    // Block path traversal and absolute paths
    if (pattern.includes("..") || path.isAbsolute(pattern)) {
      issues.push({
        tool: config.tool,
        file: config.filePath,
        severity: "error",
        message: `Glob pattern "${pattern}" contains path traversal or absolute path`,
        fix: "Use relative patterns within the project (e.g., src/**/*.ts)",
      });
      continue;
    }

    try {
      const fullPattern = path.join(projectRoot, pattern).replace(/\\/g, "/");
      const matches = await glob(fullPattern, { nodir: true, dot: true });
      if (matches.length === 0) {
        issues.push({
          tool: config.tool,
          file: config.filePath,
          severity: "warning",
          message: `Glob pattern "${pattern}" matches 0 files in the project`,
          fix: "Update the pattern to match actual project files, or remove if no longer needed",
        });
      }
    } catch {
      issues.push({
        tool: config.tool,
        file: config.filePath,
        severity: "warning",
        message: `Invalid glob pattern: "${pattern}"`,
        fix: "Fix the glob syntax",
      });
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────
// Main validation entry point
// ─────────────────────────────────────────────────────────────

/** Validate all existing AI tool config files in a project */
export async function validateConfigs(
  projectRoot: string
): Promise<ValidationResult> {
  const configs = await scanExistingConfigs(projectRoot);

  const allIssues: ValidationIssue[] = [];

  for (const config of configs) {
    // Run per-tool format validator
    const validator = TOOL_VALIDATORS[config.tool];
    if (validator) {
      allIssues.push(...validator(config, projectRoot));
    }

    // Run glob pattern validation for configs that have patterns
    const globIssues = await validateGlobPatterns(config, projectRoot);
    allIssues.push(...globIssues);
  }

  const errors = allIssues.filter((i) => i.severity === "error");
  const warnings = allIssues.filter((i) => i.severity === "warning");

  return {
    configsFound: configs.length,
    configsValid: configs.length - new Set(errors.map((e) => e.file)).size,
    issues: errors,
    warnings,
  };
}
