import type { ScanResult, RecommendationResult, AdapterOutput, GeneratedFile } from "../types/index.js";
import { BaseAdapter } from "./base-adapter.js";

export class CopilotAdapter extends BaseAdapter {
  readonly tool = "copilot" as const;
  readonly displayName = "GitHub Copilot";

  generate(scan: ScanResult, recommendations: RecommendationResult): AdapterOutput {
    const files: GeneratedFile[] = [];
    const warnings: string[] = [];

    // 1. Main copilot-instructions.md (repo-wide)
    files.push(this.generateMainInstructions(scan, recommendations));

    // 2. Per-context instruction files
    for (const rule of recommendations.rules) {
      if (rule.appliesTo.length > 0 && rule.appliesTo[0] !== "**/*") {
        files.push(this.generateInstructionFile(rule));
      }
    }

    // 3. Agent files (.github/agents/*.agent.md)
    for (const agent of recommendations.agents.slice(0, 5)) {
      files.push(this.generateAgentFile(agent));
    }

    const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);
    if (totalSize > 30000) {
      warnings.push("Total instruction size exceeds Copilot 30k char limit per file.");
    }

    return { tool: "copilot", files, totalSize, sizeUnit: "chars", warnings };
  }

  private generateMainInstructions(scan: ScanResult, rec: RecommendationResult): GeneratedFile {
    const lines: string[] = [];
    lines.push(`# Copilot Instructions — ${scan.projectName}`);
    lines.push("");

    const techs = [
      ...scan.techStack.frameworks.map((f) => f.name),
      ...scan.techStack.languages.slice(0, 3).map((l) => l.name),
    ];
    lines.push(`This project uses: ${techs.join(", ")}`);
    lines.push("");

    // Include high-priority rules
    for (const rule of rec.rules.filter((r) => r.priority === "high")) {
      lines.push(rule.content);
      lines.push("");
    }

    const content = lines.join("\n");
    return {
      path: ".github/copilot-instructions.md",
      content,
      description: "Repo-wide instructions for GitHub Copilot",
      sizeBytes: Buffer.byteLength(content, "utf-8"),
    };
  }

  private generateInstructionFile(rule: import("../types/index.js").RuleRecommendation): GeneratedFile {
    const lines: string[] = [];
    lines.push("---");
    lines.push(`applyTo: "${rule.appliesTo.join(", ")}"`);
    lines.push("---");
    lines.push("");
    lines.push(rule.content);

    const content = lines.join("\n");
    return {
      path: `.github/instructions/${rule.id}.instructions.md`,
      content,
      description: `${rule.title} instructions for Copilot`,
      sizeBytes: Buffer.byteLength(content, "utf-8"),
    };
  }

  private generateAgentFile(agent: import("../types/index.js").AgentRecommendation): GeneratedFile {
    const lines: string[] = [];
    lines.push("---");
    lines.push(`name: ${agent.name}`);
    lines.push(`description: ${agent.description}`);
    lines.push("---");
    lines.push("");
    lines.push(`# ${agent.name}`);
    lines.push("");
    lines.push(agent.description);
    lines.push("");
    lines.push("## Capabilities");
    for (const cap of agent.capabilities) {
      lines.push(`- ${cap}`);
    }

    const content = lines.join("\n");
    return {
      path: `.github/agents/${agent.id}.agent.md`,
      content,
      description: `${agent.name} agent for GitHub Copilot`,
      sizeBytes: Buffer.byteLength(content, "utf-8"),
    };
  }
}
