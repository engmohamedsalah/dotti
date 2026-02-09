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
      // Normalize to forward slashes for cross-platform glob compatibility
      const fullPattern = path.join(projectRoot, pattern).replace(/\\/g, "/");

      try {
        const matches = await glob(fullPattern, { nodir: true, dot: true });

        for (const match of matches) {
          const relativePath = path.relative(projectRoot, match);
          if (seen.has(relativePath)) continue;
          seen.add(relativePath);

          let sizeBytes = 0;
          let content: string | undefined;
          const MAX_CONFIG_READ_SIZE = 10 * 1024 * 1024; // 10MB safety limit
          try {
            const stat = fs.statSync(match);
            sizeBytes = stat.size;
            if (sizeBytes <= MAX_CONFIG_READ_SIZE) {
              content = fs.readFileSync(match, "utf-8");
            }
          } catch {
            // ignore
          }

          configs.push({
            tool,
            filePath: relativePath,
            sizeBytes,
            content,
            isValid: true, // validation happens in src/validator/
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
