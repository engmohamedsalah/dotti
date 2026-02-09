import type {
  ScanResult,
  RecommendationResult,
  AdapterOutput,
  GeneratedFile,
} from "../types/index.js";
import { BaseAdapter } from "./base-adapter.js";

export class ClaudeAdapter extends BaseAdapter {
  readonly tool = "claude" as const;
  readonly displayName = "Claude Code";

  generate(scan: ScanResult, recommendations: RecommendationResult): AdapterOutput {
    const files: GeneratedFile[] = [];
    const warnings: string[] = [];

    // 1. Generate CLAUDE.md (project context file)
    const claudeMd = this.generateClaudeMd(scan, recommendations);
    files.push(claudeMd);

    // 2. Generate agent files in .claude/agents/
    for (const agent of recommendations.agents) {
      files.push(this.generateAgentFile(agent));
    }

    const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0);

    return { tool: "claude", files, totalSize, sizeUnit: "tokens", warnings };
  }

  private generateClaudeMd(scan: ScanResult, rec: RecommendationResult): GeneratedFile {
    const lines: string[] = [];

    // Project header
    lines.push(`# ${scan.projectName}`);
    lines.push("");

    // Tech stack
    lines.push("## Tech Stack");
    for (const lang of scan.techStack.languages.slice(0, 3)) {
      lines.push(`- **${lang.name}** (${lang.fileCount} files)`);
    }
    for (const fw of scan.techStack.frameworks) {
      lines.push(`- ${fw.name}${fw.version ? ` ${fw.version}` : ""}`);
    }
    for (const bt of scan.techStack.buildTools) {
      lines.push(`- ${bt.name}${bt.version ? ` ${bt.version}` : ""}`);
    }
    for (const t of scan.techStack.testing) {
      lines.push(`- ${t.name} (${t.type} testing)`);
    }
    for (const db of scan.techStack.database) {
      lines.push(`- ${db.name}`);
    }
    for (const s of scan.techStack.styling) {
      lines.push(`- ${s.name}`);
    }
    lines.push("");

    // Rules
    if (rec.rules.length > 0) {
      for (const rule of rec.rules) {
        lines.push(rule.content);
        lines.push("");
      }
    }

    // Project structure note
    if (scan.fileTree.hasMonorepo) {
      lines.push("## Monorepo Structure");
      lines.push(`This is a monorepo with packages: ${scan.fileTree.monorepoPackages?.join(", ") || "multiple"}`);
      lines.push("");
    }

    const content = lines.join("\n");
    return {
      path: "CLAUDE.md",
      content,
      description: "Project context and coding conventions for Claude Code",
      sizeBytes: Buffer.byteLength(content, "utf-8"),
    };
  }

  private generateAgentFile(agent: import("../types/index.js").AgentRecommendation): GeneratedFile {
    const lines: string[] = [];

    // YAML frontmatter (Claude Code agent format)
    lines.push("---");
    lines.push(`name: ${agent.name}`);
    lines.push(`description: ${agent.description}`);
    lines.push("---");
    lines.push("");

    // Agent instructions
    lines.push(`# ${agent.name}`);
    lines.push("");
    lines.push(agent.description);
    lines.push("");

    // Capabilities
    lines.push("## Capabilities");
    for (const cap of agent.capabilities) {
      lines.push(`- ${cap}`);
    }
    lines.push("");

    // Trigger instructions
    lines.push("## When to activate");
    lines.push(`Activate this agent when the user mentions: ${agent.triggers.join(", ")}`);
    lines.push("");

    // Relevant files
    if (agent.relevantFiles.length > 0) {
      lines.push("## Relevant files");
      lines.push(`Focus on: ${agent.relevantFiles.join(", ")}`);
    }

    const content = lines.join("\n");
    const fileName = `${agent.id}.md`;

    return {
      path: `.claude/agents/${fileName}`,
      content,
      description: `${agent.name} agent for Claude Code`,
      sizeBytes: Buffer.byteLength(content, "utf-8"),
    };
  }
}
