import * as path from "node:path";
import type { ToolTarget, InitOptions, ScanResult, RecommendationResult } from "../types/index.js";
import { ALL_TARGETS } from "../types/index.js";
import { getTemplate, getAllTemplates } from "../templates/index.js";
import { generateConfigs } from "../adapters/index.js";
import { log } from "../utils/logger.js";
import { formatBytes } from "../utils/tokens.js";
import { writeFileWithDirs, fileExists } from "../utils/fs-helpers.js";

/** Build a minimal ScanResult from template metadata so adapters can generate */
function buildScanFromTemplate(projectRoot: string): ScanResult {
  const projectName = path.basename(projectRoot);
  return {
    projectName,
    projectRoot,
    techStack: {
      languages: [{ name: "TypeScript", fileCount: 1, extensions: [".ts", ".tsx"] }],
      frameworks: [],
      buildTools: [],
      testing: [],
      database: [],
      deployment: [],
      styling: [],
      linting: [],
      packageManager: "npm",
    },
    fileTree: {
      totalFiles: 0,
      totalDirs: 0,
      filesByExtension: {},
      topLevelDirs: [],
      hasMonorepo: false,
      significantPaths: [],
    },
    existingConfigs: [],
    scanDuration: 0,
  };
}

export async function initCommand(options: InitOptions): Promise<void> {
  const projectRoot = path.resolve(options.projectPath);

  log.banner();

  // No template specified — list available templates
  if (!options.template) {
    log.header("Available Templates");
    log.blank();
    for (const t of getAllTemplates()) {
      log.info(
        `  ${t.id.padEnd(16)} ${t.name.padEnd(20)} ${t.description}`
      );
    }
    log.blank();
    log.info("Usage: dotti init --template <template-id>");
    log.blank();
    return;
  }

  // Validate template
  const template = getTemplate(options.template);
  if (!template) {
    log.error(`Unknown template: ${options.template}`);
    log.info(
      `Available: ${getAllTemplates().map((t) => t.id).join(", ")}`
    );
    return;
  }

  log.header(`Init — ${template.name}`);
  log.info(template.description);
  log.blank();

  // Build scan + recommendations from template
  const scan = buildScanFromTemplate(projectRoot);
  const recommendations: RecommendationResult = {
    agents: template.agents,
    rules: template.rules,
    skippedAgents: [],
    totalTokensSaved: 0,
    recommendationDuration: 0,
  };

  // Determine targets
  const targets: ToolTarget[] =
    options.target === "all" ? [...ALL_TARGETS] : [options.target];

  log.kv("Template", template.name);
  log.kv("Agents", `${template.agents.length}`);
  log.kv("Rules", `${template.rules.length}`);
  log.kv("Targets", targets.join(", "));
  log.blank();

  // Generate configs
  const outputs = generateConfigs(targets, scan, recommendations);

  // Write files
  let totalFiles = 0;
  for (const output of outputs) {
    if (output.files.length === 0) continue;

    log.info(`${output.tool} (${output.files.length} files):`);

    for (const file of output.files) {
      const fullPath = path.join(projectRoot, file.path);

      if (!options.force && fileExists(fullPath)) {
        log.warn(`${file.path} already exists — use --force to overwrite`);
        continue;
      }

      writeFileWithDirs(fullPath, file.content);
      log.success(`${file.path} (${formatBytes(file.sizeBytes)})`);
      totalFiles++;
    }

    for (const warning of output.warnings) {
      log.warn(warning);
    }
  }

  // Summary
  log.blank();
  log.header("Summary");
  log.kv("Files written", `${totalFiles}`);
  log.kv("Tools configured", targets.join(", "));
  log.blank();

  if (totalFiles > 0) {
    log.success("Done! Your AI tool configs are ready.");
    log.info("Run `dotti validate` to check config health.");
  } else {
    log.warn("No files were written. Use --force to overwrite existing configs.");
  }
  log.blank();
}
