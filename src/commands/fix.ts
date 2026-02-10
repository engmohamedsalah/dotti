import * as path from "node:path";
import type { FixOptions } from "../types/index.js";
import { analyzeAgents } from "../fixer/index.js";
import { log } from "../utils/logger.js";

export async function fixCommand(options: FixOptions): Promise<void> {
  const projectRoot = path.resolve(options.projectPath);

  log.banner();
  log.header("Fix — Resolve agent routing conflicts");
  log.blank();

  const result = await analyzeAgents(projectRoot);

  if (result.agents.length === 0) {
    log.info("No agent config files found in this project.");
    log.info("Run `dotti` to generate agent configs first.");
    log.blank();
    return;
  }

  // Show discovered agents
  log.kv("Agents found", `${result.agents.length}`);
  for (const agent of result.agents) {
    log.tree(`[${agent.tool}] ${agent.name}`, agent === result.agents[result.agents.length - 1]);
  }
  log.blank();

  if (result.issues.length === 0) {
    log.success("No routing conflicts detected!");
    log.blank();
    return;
  }

  // Group issues by type
  const overlaps = result.issues.filter((i) => i.type === "overlap");
  const vague = result.issues.filter((i) => i.type === "vague");
  const duplicates = result.issues.filter((i) => i.type === "duplicate");

  log.kv("Issues found", `${result.issues.length}`);
  log.blank();

  if (overlaps.length > 0) {
    log.header("Overlapping Triggers");
    for (const issue of overlaps) {
      log.warn(issue.message);
      if (issue.suggestion) {
        log.info(`  Fix: ${issue.suggestion}`);
      }
      log.info(`  Files: ${issue.agents.join(", ")}`);
    }
    log.blank();
  }

  if (vague.length > 0) {
    log.header("Vague Descriptions");
    for (const issue of vague) {
      log.warn(issue.message);
      if (issue.suggestion) {
        log.info(`  Fix: ${issue.suggestion}`);
      }
    }
    log.blank();
  }

  if (duplicates.length > 0) {
    log.header("Duplicate Agents");
    for (const issue of duplicates) {
      log.warn(issue.message);
      if (issue.suggestion) {
        log.info(`  Fix: ${issue.suggestion}`);
      }
      log.info(`  Files: ${issue.agents.join(", ")}`);
    }
    log.blank();
  }

  if (options.dryRun) {
    log.info("Dry run — review the issues above and fix manually.");
  } else {
    log.info("Review the issues above and fix manually.");
    log.info("Re-run `dotti fix` after making changes to verify.");
  }
  log.blank();

  process.exitCode = 1;
}
