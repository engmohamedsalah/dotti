import * as fs from "node:fs";
import * as path from "node:path";
import { glob } from "glob";
import type { ExistingConfig, ToolTarget } from "../types/index.js";
import { fileExists } from "../utils/fs-helpers.js";

/** Config file patterns for each tool */
const CONFIG_PATTERNS: Record<ToolTarget, string[]> = {
  claude: ["CLAUDE.md", ".claude/agents/*.md", ".claude/settings.local.json"],
  cursor: [".cursor/rules/*.mdc", ".cursorrules", "AGENTS.md"],
  codex: ["AGENTS.md", "AGENTS.override.md", "**/AGENTS.md"],
  copilot: [
    ".github/copilot-instructions.md",
    ".github/instructions/*.instructions.md",
    ".github/agents/*.agent.md",
  ],
  windsurf: [".windsurfrules", ".windsurf/rules/*.md"],
  gemini: ["GEMINI.md", "**/GEMINI.md"],
  amp: ["AGENTS.md", ".amp/settings.json"],
};

/** Scan for existing AI tool config files */
export async function scanExistingConfigs(projectRoot: string): Promise<ExistingConfig[]> {
  const configs: ExistingConfig[] = [];
  const seen = new Set<string>();

  for (const [tool, patterns] of Object.entries(CONFIG_PATTERNS) as Array<[ToolTarget, string[]]>) {
    for (const pattern of patterns) {
      const fullPattern = path.join(projectRoot, pattern);

      try {
        const matches = await glob(fullPattern, { nodir: true, dot: true });

        for (const match of matches) {
          const relativePath = path.relative(projectRoot, match);
          if (seen.has(relativePath)) continue;
          seen.add(relativePath);

          let sizeBytes = 0;
          try {
            sizeBytes = fs.statSync(match).size;
          } catch {
            // ignore
          }

          configs.push({
            tool,
            filePath: relativePath,
            sizeBytes,
            isValid: true, // TODO: add format validation per tool
            issues: [],
          });
        }
      } catch {
        // glob pattern might not match anything
      }
    }
  }

  return configs;
}

/** Detect which AI tools are currently configured */
export function detectConfiguredTools(configs: ExistingConfig[]): ToolTarget[] {
  const tools = new Set<ToolTarget>();
  for (const config of configs) {
    tools.add(config.tool);
  }
  return Array.from(tools);
}
