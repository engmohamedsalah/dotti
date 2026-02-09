// ─────────────────────────────────────────────────────────────
// dotti — public API
// Use programmatically: import { runScan, runRecommendations, generateConfigs } from "dotti"
// ─────────────────────────────────────────────────────────────

export { runScan } from "./scanner/index.js";
export { runRecommendations } from "./recommender/index.js";
export { generateConfigs, getAdapter, getAllAdapters } from "./adapters/index.js";

// Re-export types
export type {
  ToolTarget,
  ScanResult,
  TechStack,
  RecommendationResult,
  AgentRecommendation,
  RuleRecommendation,
  AdapterOutput,
  GeneratedFile,
  ScanOptions,
} from "./types/index.js";

export { ALL_TARGETS, TOOL_REGISTRY } from "./types/index.js";
