import type { ExistingConfig, ToolTarget } from "../types/index.js";
import { scanExistingConfigs } from "../scanner/config-scanner.js";
import { parseFrontmatter } from "../utils/frontmatter.js";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ParsedAgent {
  tool: ToolTarget;
  file: string;
  name: string;
  description: string;
  triggers: string[];
}

export interface FixIssue {
  type: "overlap" | "vague" | "duplicate";
  severity: "error" | "warning";
  agents: string[]; // file paths involved
  message: string;
  suggestion?: string;
}

export interface FixResult {
  agents: ParsedAgent[];
  issues: FixIssue[];
}

// ─────────────────────────────────────────────────────────────
// Agent extraction — parse agents from config files
// ─────────────────────────────────────────────────────────────

/** File patterns that indicate agent configs (not rules/instructions) */
function isAgentFile(config: ExistingConfig): boolean {
  const p = config.filePath.replace(/\\/g, "/");
  return (
    p.includes(".claude/agents/") ||
    p.endsWith(".agent.md") || // Copilot agents
    (p === "AGENTS.md" && (config.tool === "codex" || config.tool === "amp" || config.tool === "cursor"))
  );
}

/** Extract agent info from a single-agent file (Claude, Copilot) */
function parseAgentFromFile(config: ExistingConfig): ParsedAgent | null {
  const content = config.content ?? "";
  const fm = parseFrontmatter(content);

  const name = fm.fields["name"] || extractNameFromHeading(content) || config.filePath;
  const description = fm.fields["description"] || extractFirstParagraph(fm.body);
  const triggers = extractTriggers(content);

  if (!name && !description) return null;

  return {
    tool: config.tool,
    file: config.filePath,
    name,
    description,
    triggers,
  };
}

/** Extract multiple agents from an AGENTS.md file (Codex, Amp, Cursor) */
function parseAgentsFromAgentsMd(config: ExistingConfig): ParsedAgent[] {
  const content = config.content ?? "";
  const agents: ParsedAgent[] = [];

  // Split by ## or ### headings
  const sections = content.split(/^#{2,3}\s+/m).slice(1);

  for (const section of sections) {
    const lines = section.split(/\r?\n/);
    const name = lines[0]?.trim() || "";
    if (!name) continue;

    // Skip non-agent headings
    const lowerName = name.toLowerCase();
    if (["project overview", "tech stack", "rules", "conventions"].some((s) => lowerName.includes(s))) {
      continue;
    }

    const body = lines.slice(1).join("\n").trim();
    const description = extractFirstParagraph(body);
    const triggers = extractTriggersFromBody(body);

    agents.push({
      tool: config.tool,
      file: config.filePath,
      name,
      description,
      triggers,
    });
  }

  return agents;
}

/** Extract the first heading from markdown */
function extractNameFromHeading(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || "";
}

/** Extract first non-empty paragraph from body */
function extractFirstParagraph(body: string): string {
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("-") && !trimmed.startsWith("*")) {
      return trimmed;
    }
  }
  return "";
}

/** Extract trigger words from frontmatter or body content */
function extractTriggers(content: string): string[] {
  // Look for explicit "Triggers:" or "When to activate" sections
  const triggersMatch = content.match(/(?:triggers?|when to activate)[:\s]*(.+)/i);
  if (triggersMatch) {
    return triggersMatch[1]
      .split(/[,;]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }
  return extractTriggersFromBody(content);
}

/** Infer trigger words from body text */
function extractTriggersFromBody(body: string): string[] {
  // Extract keywords from bold text and heading-like patterns
  const boldWords = [...body.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].toLowerCase().trim());
  return boldWords.filter((w) => w.length > 2 && w.length < 30);
}

// ─────────────────────────────────────────────────────────────
// Detection rules
// ─────────────────────────────────────────────────────────────

/** Detect overlapping triggers between agents */
function detectOverlaps(agents: ParsedAgent[]): FixIssue[] {
  const issues: FixIssue[] = [];

  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i];
      const b = agents[j];

      if (a.triggers.length === 0 || b.triggers.length === 0) continue;

      const setA = new Set(a.triggers);
      const setB = new Set(b.triggers);
      const shared = a.triggers.filter((t) => setB.has(t));

      const minSize = Math.min(setA.size, setB.size);
      if (minSize > 0 && shared.length / minSize > 0.5) {
        issues.push({
          type: "overlap",
          severity: "warning",
          agents: [a.file, b.file],
          message: `"${a.name}" and "${b.name}" share ${shared.length} trigger words: ${shared.join(", ")}`,
          suggestion: `Differentiate triggers so each agent has a unique activation pattern`,
        });
      }
    }
  }

  return issues;
}

/** Detect vague or too-short descriptions */
function detectVagueDescriptions(agents: ParsedAgent[]): FixIssue[] {
  const issues: FixIssue[] = [];
  const ACTION_VERBS = [
    "review", "write", "create", "build", "test", "fix", "optimize",
    "design", "manage", "audit", "deploy", "generate", "analyze",
    "check", "implement", "refactor", "debug", "document", "maintain",
  ];

  for (const agent of agents) {
    const desc = agent.description;

    if (desc.length < 30) {
      issues.push({
        type: "vague",
        severity: "warning",
        agents: [agent.file],
        message: `"${agent.name}" has a very short description (${desc.length} chars)`,
        suggestion: `Expand to 50+ chars describing what the agent does, when to use it, and which technologies it covers`,
      });
      continue;
    }

    const lowerDesc = desc.toLowerCase();
    const hasActionVerb = ACTION_VERBS.some((v) => lowerDesc.includes(v));
    if (!hasActionVerb) {
      issues.push({
        type: "vague",
        severity: "warning",
        agents: [agent.file],
        message: `"${agent.name}" description lacks action verbs — may cause poor routing`,
        suggestion: `Start with a verb: "Review code for...", "Write tests using...", "Build and maintain..."`,
      });
    }
  }

  return issues;
}

/** Detect duplicate agent names across tools */
function detectDuplicates(agents: ParsedAgent[]): FixIssue[] {
  const issues: FixIssue[] = [];
  const byName = new Map<string, ParsedAgent[]>();

  for (const agent of agents) {
    const key = agent.name.toLowerCase();
    const existing = byName.get(key) || [];
    existing.push(agent);
    byName.set(key, existing);
  }

  for (const [name, group] of byName) {
    if (group.length <= 1) continue;

    // Only flag if they're from different tools
    const tools = new Set(group.map((a) => a.tool));
    if (tools.size <= 1) continue;

    const descriptions = new Set(group.map((a) => a.description));
    if (descriptions.size > 1) {
      issues.push({
        type: "duplicate",
        severity: "warning",
        agents: group.map((a) => a.file),
        message: `Agent "${group[0].name}" exists in ${tools.size} tools with different descriptions`,
        suggestion: `Align descriptions across tools for consistent routing, or rename to differentiate`,
      });
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────
// Main analysis entry point
// ─────────────────────────────────────────────────────────────

/** Analyze all agent configs for routing conflicts */
export async function analyzeAgents(projectRoot: string): Promise<FixResult> {
  const configs = await scanExistingConfigs(projectRoot);
  const agents: ParsedAgent[] = [];

  for (const config of configs) {
    if (!isAgentFile(config)) continue;

    // AGENTS.md files may contain multiple agents
    if (config.filePath === "AGENTS.md" || config.filePath.replace(/\\/g, "/") === "AGENTS.md") {
      agents.push(...parseAgentsFromAgentsMd(config));
    } else {
      const agent = parseAgentFromFile(config);
      if (agent) agents.push(agent);
    }
  }

  const issues: FixIssue[] = [
    ...detectOverlaps(agents),
    ...detectVagueDescriptions(agents),
    ...detectDuplicates(agents),
  ];

  return { agents, issues };
}
