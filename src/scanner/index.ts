import type { ScanResult, TechStack } from "../types/index.js";
import { scanPackage } from "./package-scanner.js";
import { scanFileTree } from "./file-tree-scanner.js";
import { scanExistingConfigs } from "./config-scanner.js";
import { log } from "../utils/logger.js";

/** Run a complete codebase scan */
export async function runScan(projectRoot: string): Promise<ScanResult> {
  const startTime = Date.now();

  log.header("Scanning codebase");

  // 1. Scan package.json & configs
  log.info("Reading package.json & project configs...");
  const packageResult = scanPackage(projectRoot);

  // 2. Scan file tree
  log.info("Analyzing file tree...");
  const fileTreeResult = scanFileTree(projectRoot);

  // 3. Scan existing AI configs
  log.info("Checking for existing AI tool configs...");
  const existingConfigs = await scanExistingConfigs(projectRoot);

  // Assemble TechStack
  const techStack: TechStack = {
    languages: fileTreeResult.languages,
    frameworks: packageResult.frameworks,
    buildTools: packageResult.buildTools,
    testing: packageResult.testing,
    database: packageResult.database,
    styling: packageResult.styling,
    linting: packageResult.linting,
    deployment: [], // TODO: detect from file tree
    packageManager: packageResult.packageManager,
  };

  // Detect deployment from significant paths
  if (fileTreeResult.significantPaths.includes("GitHub Actions")) {
    techStack.deployment.push({ name: "GitHub Actions", configFile: ".github/workflows/" });
  }
  if (fileTreeResult.significantPaths.includes("Docker config")) {
    techStack.deployment.push({ name: "Docker" });
  }
  if (fileTreeResult.significantPaths.includes("Kubernetes")) {
    techStack.deployment.push({ name: "Kubernetes" });
  }
  if (fileTreeResult.significantPaths.includes("Terraform IaC")) {
    techStack.deployment.push({ name: "Terraform" });
  }

  const scanDuration = Date.now() - startTime;

  // Print scan summary
  log.blank();
  log.header("Tech Stack Detected");

  for (const lang of techStack.languages.slice(0, 5)) {
    log.tree(`${lang.name} (${lang.fileCount} files)`);
  }
  for (const fw of techStack.frameworks) {
    log.tree(`${fw.name}${fw.version ? ` ${fw.version}` : ""}`);
  }
  for (const bt of techStack.buildTools) {
    log.tree(`${bt.name}${bt.version ? ` ${bt.version}` : ""}`);
  }
  for (const t of techStack.testing) {
    log.tree(`${t.name} (${t.type})`);
  }
  for (const db of techStack.database) {
    log.tree(db.name);
  }
  for (const s of techStack.styling) {
    log.tree(s.name);
  }
  for (const d of techStack.deployment) {
    log.tree(d.name, true);
  }

  if (existingConfigs.length > 0) {
    log.blank();
    log.header("Existing AI Configs Found");
    for (const config of existingConfigs) {
      log.tree(`${config.tool}: ${config.filePath} (${config.sizeBytes}B)`);
    }
  }

  log.blank();
  log.info(`Scan completed in ${scanDuration}ms`);

  return {
    projectName: packageResult.projectName,
    projectRoot,
    techStack,
    fileTree: fileTreeResult,
    existingConfigs,
    scanDuration,
  };
}

export { scanPackage } from "./package-scanner.js";
export { scanFileTree } from "./file-tree-scanner.js";
export { scanExistingConfigs, detectConfiguredTools } from "./config-scanner.js";
