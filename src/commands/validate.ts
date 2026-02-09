import * as path from "node:path";
import type { ValidateOptions } from "../types/index.js";
import { validateConfigs } from "../validator/index.js";
import { log } from "../utils/logger.js";

export async function validateCommand(options: ValidateOptions): Promise<void> {
  const projectRoot = path.resolve(options.projectPath);

  log.banner();
  log.header("Validate — Check config health");
  log.blank();

  const result = await validateConfigs(projectRoot);

  if (result.configsFound === 0) {
    log.info("No AI tool config files found in this project.");
    log.info("Run `dotti` to generate configs, or `dotti init --template <id>` to start from a template.");
    log.blank();
    return;
  }

  log.kv("Config files found", `${result.configsFound}`);
  log.kv("Valid", `${result.configsValid}`);
  log.kv("Errors", `${result.issues.length}`);
  log.kv("Warnings", `${result.warnings.length}`);
  log.blank();

  // Print errors
  if (result.issues.length > 0) {
    log.header("Errors");
    for (const issue of result.issues) {
      log.error(`[${issue.tool}] ${issue.file}`);
      log.info(`  ${issue.message}`);
      if (issue.fix) {
        log.info(`  Fix: ${issue.fix}`);
      }
    }
    log.blank();
  }

  // Print warnings
  if (result.warnings.length > 0) {
    log.header("Warnings");
    for (const issue of result.warnings) {
      log.warn(`[${issue.tool}] ${issue.file}`);
      log.info(`  ${issue.message}`);
      if (issue.fix) {
        log.info(`  Fix: ${issue.fix}`);
      }
    }
    log.blank();
  }

  // Summary
  if (result.issues.length === 0 && result.warnings.length === 0) {
    log.success("All config files are valid!");
    log.blank();
  } else if (result.issues.length === 0) {
    log.success(`All configs valid, ${result.warnings.length} warning(s) to review.`);
    log.blank();
  } else {
    log.error(`${result.issues.length} error(s) found. Fix these to ensure your AI tools work correctly.`);
    log.blank();
    process.exitCode = 1;
  }
}
