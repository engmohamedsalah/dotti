import type { ScanResult, RecommendationResult } from "../types/index.js";
import { recommendAgents } from "./agent-recommender.js";
import { recommendRules } from "./rule-recommender.js";
import { log } from "../utils/logger.js";
import { formatTokens } from "../utils/tokens.js";

/** Run full recommendation engine on scan results */
export function runRecommendations(scan: ScanResult): RecommendationResult {
  const startTime = Date.now();

  // Get agent recommendations
  const agents = recommendAgents(scan);

  // Get rule recommendations
  const rules = recommendRules(scan);

  // Calculate token savings (vs loading everything)
  const usedTokens = agents.reduce((sum, a) => sum + a.estimatedTokens, 0);
  const hypotheticalAllTokens = usedTokens * 3; // rough estimate of "install everything" approach
  const totalTokensSaved = hypotheticalAllTokens - usedTokens;

  const recommendationDuration = Date.now() - startTime;

  // Print recommendations
  log.blank();
  log.header("Recommended Agents");

  for (const agent of agents) {
    const bar = "█".repeat(Math.round(agent.confidence / 10)) + "░".repeat(10 - Math.round(agent.confidence / 10));
    log.info(`${agent.name.padEnd(22)} ${bar}  ${agent.confidence}%`);
    log.debug(`  → ${agent.reason}`);
  }

  log.blank();
  log.header("Recommended Rules");
  for (const rule of rules) {
    const priorityColor = rule.priority === "high" ? "●" : rule.priority === "medium" ? "◐" : "○";
    log.info(`${priorityColor} ${rule.title}`);
  }

  log.blank();
  log.info(`${agents.length} agents recommended (est. ${formatTokens(usedTokens)})`);
  log.info(`${rules.length} rules generated`);

  return {
    agents,
    rules,
    skippedAgents: [], // TODO: track what was considered and skipped
    totalTokensSaved,
    recommendationDuration,
  };
}

export { recommendAgents } from "./agent-recommender.js";
export { recommendRules } from "./rule-recommender.js";
