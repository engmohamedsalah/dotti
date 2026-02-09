import * as path from "node:path";
import type { ToolTarget, ScanOptions } from "../types/index.js";
import { ALL_TARGETS } from "../types/index.js";
import { runScan } from "../scanner/index.js";
import { runRecommendations } from "../recommender/index.js";
import { generateConfigs } from "../adapters/index.js";
import { log } from "../utils/logger.js";
import { formatBytes, formatTokens, estimateTokens } from "../utils/tokens.js";
import { writeFileWithDirs, fileExists } from "../utils/fs-helpers.js";

export async function scanCommand(options: ScanOptions): Promise<void> {
  const startTime = Date.now();
  const projectRoot = path.resolve(options.projectPath);

  log.banner();

  // 1. Run codebase scan
  const scan = await runScan(projectRoot);

  // 2. Run recommendation engine
  const recommendations = runRecommendations(scan);

  // 3. Determine targets
  const targets: ToolTarget[] = options.target === "all" ? [...ALL_TARGETS] : [options.target];

  // 4. Generate configs
  log.blank();
  log.header(`Generating configs for: ${targets.join(", ")}`);

  const outputs = generateConfigs(targets, scan, recommendations);

  // 5. Write files (or dry-run)
  let totalFiles = 0;
  for (const output of outputs) {
    log.blank();
    log.info(`${output.tool} (${output.files.length} files):`);

    for (const file of output.files) {
      const fullPath = path.join(projectRoot, file.path);

      if (!options.force && fileExists(fullPath) && !options.dryRun) {
        log.warn(`${file.path} already exists — use --force to overwrite`);
        continue;
      }

      if (options.dryRun) {
        log.info(`  [dry-run] ${file.path} (${formatBytes(file.sizeBytes)})`);
      } else {
        writeFileWithDirs(fullPath, file.content);
        log.success(`${file.path} (${formatBytes(file.sizeBytes)})`);
      }
      totalFiles++;
    }

    // Print warnings
    for (const warning of output.warnings) {
      log.warn(warning);
    }
  }

  // 6. Summary
  const totalDuration = Date.now() - startTime;
  const totalTokens = outputs.reduce(
    (sum, o) => sum + o.files.reduce((s, f) => s + estimateTokens(f.content), 0),
    0
  );

  log.blank();
  log.header("Summary");
  log.kv("Files generated", `${totalFiles}`);
  log.kv("Tools configured", targets.join(", "));
  log.kv("Agents recommended", `${recommendations.agents.length}`);
  log.kv("Rules generated", `${recommendations.rules.length}`);
  log.kv("Est. total tokens", formatTokens(totalTokens));
  log.kv("Time", `${(totalDuration / 1000).toFixed(1)}s`);

  if (options.dryRun) {
    log.blank();
    log.info("Dry run — no files were written. Remove --dry-run to write files.");
  }

  log.blank();
}
