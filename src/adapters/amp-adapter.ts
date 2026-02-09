import type { ScanResult, RecommendationResult, AdapterOutput, GeneratedFile } from "../types/index.js";
import { BaseAdapter } from "./base-adapter.js";

export class AmpAdapter extends BaseAdapter {
  readonly tool = "amp" as const;
  readonly displayName = "Amp (Sourcegraph)";

  generate(scan: ScanResult, recommendations: RecommendationResult): AdapterOutput {
    const files: GeneratedFile[] = [];
    const warnings: string[] = [];

    // Amp uses AGENTS.md (same as Codex) + .amp/settings.json
    files.push(this.generateAgentsMd(scan, recommendations));
    files.push(this.generateSettings(scan));

    const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0);
    return { tool: "amp", files, totalSize, sizeUnit: "tokens", warnings };
  }

  private generateAgentsMd(scan: ScanResult, rec: RecommendationResult): GeneratedFile {
    const lines: string[] = [];
    lines.push(`# ${scan.projectName}`);
    lines.push("");

    // Project overview
    const techs = [
      ...scan.techStack.frameworks.map((f) => f.name),
      ...scan.techStack.languages.slice(0, 3).map((l) => l.name),
    ];
    lines.push(`Stack: ${techs.join(", ")}`);
    lines.push("");

    // Rules
    for (const rule of rec.rules) {
      lines.push(rule.content);
      lines.push("");
    }

    // Skills/agents
    if (rec.agents.length > 0) {
      lines.push("## Agent Roles");
      for (const agent of rec.agents) {
        lines.push(`### ${agent.name}`);
        lines.push(agent.description);
        lines.push("");
      }
    }

    const content = lines.join("\n");
    return {
      path: "AGENTS.md",
      content,
      description: "Agent instructions for Amp",
      sizeBytes: Buffer.byteLength(content, "utf-8"),
    };
  }

  private generateSettings(scan: ScanResult): GeneratedFile {
    const settings = {
      "$schema": "https://amp.dev/schemas/settings.json",
      project: {
        name: scan.projectName,
        languages: scan.techStack.languages.slice(0, 3).map((l) => l.name.toLowerCase()),
      },
    };

    const content = JSON.stringify(settings, null, 2);
    return {
      path: ".amp/settings.json",
      content,
      description: "Amp project settings",
      sizeBytes: Buffer.byteLength(content, "utf-8"),
    };
  }
}
