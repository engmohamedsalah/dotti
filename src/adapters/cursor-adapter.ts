import type { ScanResult, RecommendationResult, AdapterOutput, GeneratedFile } from "../types/index.js";
import { BaseAdapter } from "./base-adapter.js";

export class CursorAdapter extends BaseAdapter {
  readonly tool = "cursor" as const;
  readonly displayName = "Cursor";

  generate(scan: ScanResult, recommendations: RecommendationResult): AdapterOutput {
    const files: GeneratedFile[] = [];
    const warnings: string[] = [];

    // Cursor uses .cursor/rules/*.mdc files with glob-based activation
    for (const rule of recommendations.rules) {
      const mdcContent = this.generateMdcFile(rule);
      files.push(mdcContent);
    }

    // Generate AGENTS.md if agents recommended (Cursor supports this too)
    if (recommendations.agents.length > 0) {
      files.push(this.generateAgentsMd(scan, recommendations));
    }

    const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);

    return { tool: "cursor", files, totalSize, sizeUnit: "chars", warnings };
  }

  private generateMdcFile(rule: import("../types/index.js").RuleRecommendation): GeneratedFile {
    // .mdc format: YAML frontmatter with globs, then markdown content
    const lines: string[] = [];
    lines.push("---");
    lines.push(`description: ${rule.title}`);
    lines.push(`globs: ${rule.appliesTo.join(", ")}`);
    lines.push(`alwaysApply: ${rule.priority === "high" ? "true" : "false"}`);
    lines.push("---");
    lines.push("");
    lines.push(rule.content);

    const content = lines.join("\n");
    const fileName = `${rule.id}.mdc`;

    return {
      path: `.cursor/rules/${fileName}`,
      content,
      description: `${rule.title} rule for Cursor`,
      sizeBytes: Buffer.byteLength(content, "utf-8"),
    };
  }

  private generateAgentsMd(scan: ScanResult, rec: RecommendationResult): GeneratedFile {
    const lines: string[] = [];
    lines.push(`# ${scan.projectName} — Agent Instructions`);
    lines.push("");

    for (const agent of rec.agents) {
      lines.push(`## ${agent.name}`);
      lines.push(agent.description);
      lines.push("");
      lines.push(`**Triggers:** ${agent.triggers.join(", ")}`);
      lines.push("");
    }

    const content = lines.join("\n");
    return {
      path: "AGENTS.md",
      content,
      description: "Agent instructions for Cursor",
      sizeBytes: Buffer.byteLength(content, "utf-8"),
    };
  }
}
