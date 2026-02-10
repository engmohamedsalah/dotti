import * as fs from "node:fs";
import * as path from "node:path";
import type { PruneOptions } from "../types/index.js";
import { findPruneTargets } from "../pruner/index.js";
import { log } from "../utils/logger.js";

export async function pruneCommand(options: PruneOptions): Promise<void> {
  const projectRoot = path.resolve(options.projectPath);

  log.banner();
  log.header("Prune — Remove unused configs");
  log.blank();

  if (options.days !== 30) {
    log.warn(
      `--days ${options.days} specified, but invocation tracking is not yet supported.`
    );
    log.info("Prune currently detects dead globs and empty configs only.");
    log.blank();
  }

  const result = await findPruneTargets(projectRoot);

  log.kv("Configs scanned", `${result.configsScanned}`);
  log.kv("Prune candidates", `${result.pruneTargets.length}`);
  log.blank();

  if (result.pruneTargets.length === 0) {
    log.success("No stale configs found — everything looks active!");
    log.blank();
    return;
  }

  // Group by reason
  const deadGlobs = result.pruneTargets.filter(
    (t) => t.reason === "dead-globs"
  );
  const emptyContent = result.pruneTargets.filter(
    (t) => t.reason === "empty-content"
  );

  if (deadGlobs.length > 0) {
    log.header("Dead Glob Patterns");
    for (const target of deadGlobs) {
      log.warn(`[${target.tool}] ${target.file}`);
      log.info(`  ${target.message}`);
    }
    log.blank();
  }

  if (emptyContent.length > 0) {
    log.header("Empty Configs");
    for (const target of emptyContent) {
      log.warn(`[${target.tool}] ${target.file}`);
      log.info(`  ${target.message}`);
    }
    log.blank();
  }

  const totalBytes = result.pruneTargets.reduce(
    (sum, t) => sum + t.sizeBytes,
    0
  );
  log.kv("Space recoverable", formatBytes(totalBytes));
  log.blank();

  if (options.dryRun) {
    log.info("Dry run — no files were deleted.");
    log.info("Run without --dry-run to remove these files.");
  } else {
    let deleted = 0;
    let failedCount = 0;

    for (const target of result.pruneTargets) {
      const fullPath = path.join(projectRoot, target.file);
      try {
        fs.unlinkSync(fullPath);
        deleted++;
        log.success(`Deleted ${target.file}`);
      } catch {
        failedCount++;
        log.error(`Failed to delete ${target.file}`);
      }
    }

    log.blank();
    log.kv("Files deleted", `${deleted}`);
    if (failedCount > 0) {
      log.kv("Failed", `${failedCount}`);
    }
    log.kv("Space recovered", formatBytes(totalBytes));
  }

  log.blank();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
