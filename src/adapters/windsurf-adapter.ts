import type { ScanResult, RecommendationResult, AdapterOutput, GeneratedFile } from "../types/index.js";
import { BaseAdapter } from "./base-adapter.js";

const WINDSURF_CHAR_LIMIT = 6000;

export class WindsurfAdapter extends BaseAdapter {
  readonly tool = "windsurf" as const;
  readonly displayName = "Windsurf";

  generate(scan: ScanResult, recommendations: RecommendationResult): AdapterOutput {
    const files: GeneratedFile[] = [];
    const warnings: string[] = [];

    const rulesFile = this.generateWindsurfRules(scan, recommendations);
    files.push(rulesFile);

    if (rulesFile.content.length > WINDSURF_CHAR_LIMIT) {
      warnings.push(
        `Content is ${rulesFile.content.length} chars — exceeds Windsurf's ${WINDSURF_CHAR_LIMIT} char limit. ` +
        `Truncating to fit. Consider using fewer rules.`
      );
      // Truncate to fit
      const truncated = rulesFile.content.slice(0, WINDSURF_CHAR_LIMIT - 50) + "\n\n<!-- Truncated by dotti to fit 6k char limit -->";
      rulesFile.content = truncated;
      rulesFile.sizeBytes = Buffer.byteLength(truncated, "utf-8");
    }

    return {
      tool: "windsurf",
      files,
      totalSize: rulesFile.content.length,
      sizeUnit: "chars",
      warnings,
    };
  }

  private generateWindsurfRules(scan: ScanResult, rec: RecommendationResult): GeneratedFile {
    const lines: string[] = [];

    // Compact format for Windsurf's 6k char limit
    lines.push(`# ${scan.projectName}`);
    lines.push("");

    const techs = [
      ...scan.techStack.frameworks.map((f) => f.name),
      ...scan.techStack.languages.slice(0, 2).map((l) => l.name),
    ];
    lines.push(`Stack: ${techs.join(", ")}`);
    lines.push("");

    // Include only high-priority rules (space is limited)
    const highPriority = rec.rules.filter((r) => r.priority === "high");
    for (const rule of highPriority) {
      lines.push(rule.content);
      lines.push("");
    }

    // Add condensed agent descriptions
    if (rec.agents.length > 0) {
      lines.push("## Roles");
      for (const agent of rec.agents.slice(0, 5)) {
        lines.push(`- **${agent.name}**: ${agent.description.slice(0, 120)}`);
      }
    }

    const content = lines.join("\n");
    return {
      path: ".windsurfrules",
      content,
      description: "Project rules for Windsurf (Cascade)",
      sizeBytes: Buffer.byteLength(content, "utf-8"),
    };
  }
}
