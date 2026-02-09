// ─────────────────────────────────────────────────────────────
// dotti — types & interfaces
// ─────────────────────────────────────────────────────────────

/** Supported AI coding tools */
export type ToolTarget =
  | "claude"
  | "cursor"
  | "codex"
  | "copilot"
  | "windsurf"
  | "gemini"
  | "amp";

export const ALL_TARGETS: ToolTarget[] = [
  "claude",
  "cursor",
  "codex",
  "copilot",
  "windsurf",
  "gemini",
  "amp",
];

/** Tool metadata for display and config generation */
export interface ToolInfo {
  name: string;
  displayName: string;
  configFiles: string[];
  supportsAgents: boolean;
  supportsLazyLoading: boolean;
  maxContextSize?: number; // chars or tokens depending on tool
  sizeUnit: "tokens" | "chars" | "bytes";
}

export const TOOL_REGISTRY: Record<ToolTarget, ToolInfo> = {
  claude: {
    name: "claude",
    displayName: "Claude Code",
    configFiles: ["CLAUDE.md", ".claude/agents/*.md", ".claude/settings.local.json"],
    supportsAgents: true,
    supportsLazyLoading: false,
    sizeUnit: "tokens",
  },
  cursor: {
    name: "cursor",
    displayName: "Cursor",
    configFiles: [".cursor/rules/*.mdc", "AGENTS.md"],
    supportsAgents: true,
    supportsLazyLoading: true, // glob-based
    sizeUnit: "chars",
  },
  codex: {
    name: "codex",
    displayName: "OpenAI Codex",
    configFiles: ["AGENTS.md", "AGENTS.override.md"],
    supportsAgents: false,
    supportsLazyLoading: false,
    maxContextSize: 32768, // 32KB limit
    sizeUnit: "bytes",
  },
  copilot: {
    name: "copilot",
    displayName: "GitHub Copilot",
    configFiles: [
      ".github/copilot-instructions.md",
      ".github/instructions/*.instructions.md",
      ".github/agents/*.agent.md",
    ],
    supportsAgents: true,
    supportsLazyLoading: true, // applyTo patterns
    maxContextSize: 30000, // 30k char limit per file
    sizeUnit: "chars",
  },
  windsurf: {
    name: "windsurf",
    displayName: "Windsurf",
    configFiles: [".windsurfrules", ".windsurf/rules/*.md"],
    supportsAgents: false,
    supportsLazyLoading: false,
    maxContextSize: 6000, // 6k char limit
    sizeUnit: "chars",
  },
  gemini: {
    name: "gemini",
    displayName: "Gemini CLI",
    configFiles: ["GEMINI.md"],
    supportsAgents: true, // skills system
    supportsLazyLoading: false,
    sizeUnit: "tokens",
  },
  amp: {
    name: "amp",
    displayName: "Amp (Sourcegraph)",
    configFiles: ["AGENTS.md", ".amp/settings.json"],
    supportsAgents: true, // skills + librarian
    supportsLazyLoading: false,
    sizeUnit: "tokens",
  },
};

// ─────────────────────────────────────────────────────────────
// Scanner types
// ─────────────────────────────────────────────────────────────

/** Detected tech stack from codebase scan */
export interface TechStack {
  languages: LanguageInfo[];
  frameworks: FrameworkInfo[];
  buildTools: BuildToolInfo[];
  testing: TestingInfo[];
  database: DatabaseInfo[];
  deployment: DeploymentInfo[];
  styling: StylingInfo[];
  linting: LintingInfo[];
  packageManager: "npm" | "yarn" | "pnpm" | "bun" | "pip" | "cargo" | "unknown";
}

export interface LanguageInfo {
  name: string; // "TypeScript", "Python", "Rust", etc.
  version?: string;
  fileCount: number;
  extensions: string[];
}

export interface FrameworkInfo {
  name: string; // "React", "Next.js", "FastAPI", etc.
  version?: string;
  confidence: number; // 0-100
  detectedBy: string; // "package.json", "import analysis", etc.
}

export interface BuildToolInfo {
  name: string;
  version?: string;
  configFile?: string;
}

export interface TestingInfo {
  name: string; // "Vitest", "Jest", "Playwright", etc.
  type: "unit" | "e2e" | "integration" | "component";
  configFile?: string;
}

export interface DatabaseInfo {
  name: string; // "PostgreSQL", "MongoDB", etc.
  orm?: string; // "Prisma", "Drizzle", "SQLAlchemy"
  configFile?: string;
}

export interface DeploymentInfo {
  name: string; // "Vercel", "Docker", "GitHub Actions"
  configFile?: string;
}

export interface StylingInfo {
  name: string; // "Tailwind CSS", "styled-components", "CSS Modules"
  version?: string;
}

export interface LintingInfo {
  name: string;
  configFile?: string;
}

/** File tree analysis results */
export interface FileTreeAnalysis {
  totalFiles: number;
  totalDirs: number;
  filesByExtension: Record<string, number>;
  topLevelDirs: string[];
  hasMonorepo: boolean;
  monorepoPackages?: string[];
  significantPaths: string[]; // paths that indicate project patterns
}

/** Complete scan result */
export interface ScanResult {
  projectName: string;
  projectRoot: string;
  techStack: TechStack;
  fileTree: FileTreeAnalysis;
  existingConfigs: ExistingConfig[];
  scanDuration: number; // ms
}

export interface ExistingConfig {
  tool: ToolTarget;
  filePath: string;
  sizeBytes: number;
  content?: string;
  isValid: boolean;
  issues?: string[];
}

// ─────────────────────────────────────────────────────────────
// Validator types
// ─────────────────────────────────────────────────────────────

export interface ValidationResult {
  configsFound: number;
  configsValid: number;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  tool: ToolTarget;
  file: string;
  severity: "error" | "warning";
  message: string;
  fix?: string;
}

// ─────────────────────────────────────────────────────────────
// Recommender types
// ─────────────────────────────────────────────────────────────

/** An agent recommendation from the engine */
export interface AgentRecommendation {
  id: string; // e.g. "code-reviewer"
  name: string; // e.g. "Code Reviewer"
  description: string; // Optimized for routing
  confidence: number; // 0-100
  reason: string; // Why this agent is recommended
  triggers: string[]; // What should activate this agent
  capabilities: string[]; // What the agent can do
  relevantFiles: string[]; // Glob patterns this agent cares about
  estimatedTokens: number; // Approximate token cost of this agent's config
  category: AgentCategory;
}

export type AgentCategory =
  | "review"
  | "testing"
  | "database"
  | "security"
  | "ui"
  | "api"
  | "devops"
  | "docs"
  | "perf"
  | "general";

/** A rule recommendation */
export interface RuleRecommendation {
  id: string;
  title: string;
  content: string; // The actual rule text
  priority: "high" | "medium" | "low";
  reason: string;
  appliesTo: string[]; // Glob patterns
  category: string;
}

/** Complete recommendation output */
export interface RecommendationResult {
  agents: AgentRecommendation[];
  rules: RuleRecommendation[];
  skippedAgents: SkippedAgent[];
  totalTokensSaved: number;
  recommendationDuration: number; // ms
}

export interface SkippedAgent {
  id: string;
  name: string;
  reason: string;
}

// ─────────────────────────────────────────────────────────────
// Adapter types
// ─────────────────────────────────────────────────────────────

/** Output from an adapter — files to write */
export interface AdapterOutput {
  tool: ToolTarget;
  files: GeneratedFile[];
  totalSize: number;
  sizeUnit: "tokens" | "chars" | "bytes";
  warnings: string[];
}

export interface GeneratedFile {
  path: string; // Relative to project root
  content: string;
  description: string;
  sizeBytes: number;
}

// ─────────────────────────────────────────────────────────────
// CLI types
// ─────────────────────────────────────────────────────────────

export interface ScanOptions {
  target: ToolTarget | "all";
  projectPath: string;
  dryRun: boolean;
  verbose: boolean;
  force: boolean; // Overwrite existing configs
}

export interface PruneOptions {
  projectPath: string;
  dryRun: boolean;
  verbose: boolean;
  days: number; // Consider agents unused after N days
}

export interface FixOptions {
  projectPath: string;
  dryRun: boolean;
  verbose: boolean;
}

export interface ValidateOptions {
  projectPath: string;
  verbose: boolean;
}

export interface InitOptions {
  template: string;
  target: ToolTarget | "all";
  projectPath: string;
  force: boolean;
}

// ─────────────────────────────────────────────────────────────
// Template types
// ─────────────────────────────────────────────────────────────

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  agents: AgentRecommendation[];
  rules: RuleRecommendation[];
  tags: string[];
}
