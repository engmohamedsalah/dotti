import * as path from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import type { ToolTarget, AgentRecommendation, RuleRecommendation } from "../types/index.js";
import { ALL_TARGETS, TOOL_REGISTRY } from "../types/index.js";
import { runScan } from "../scanner/index.js";
import { recommendAgents } from "../recommender/agent-recommender.js";
import { recommendRules } from "../recommender/rule-recommender.js";
import { generateConfigs } from "../adapters/index.js";
import { writeFileWithDirs, fileExists } from "../utils/fs-helpers.js";
import { formatBytes, formatTokens, estimateTokens } from "../utils/tokens.js";

/**
 * The interactive setup wizard.
 * This is the default experience when a user runs `npx dotti`.
 *
 * Flow:
 *   1. Welcome
 *   2. Auto-scan codebase (with spinner)
 *   3. Show detected stack — confirm
 *   4. "Which AI tools do you use?" — multi-select
 *   5. Recommended agents — toggle on/off
 *   6. Recommended rules — toggle on/off
 *   7. Preview files to be generated
 *   8. Confirm → write
 *   9. Success
 */
export async function wizardCommand(projectPath = "."): Promise<void> {
  const projectRoot = path.resolve(projectPath);

  // ── 1. Welcome ──
  console.clear();
  p.intro(chalk.bgGreen.black(" dotti ") + chalk.dim("  AI config, from your code"));

  // ── 2. Scan ──
  const s = p.spinner();
  s.start("Scanning your codebase...");

  let scan;
  try {
    scan = await runScan(projectRoot);
  } catch (err) {
    s.stop("Scan failed");
    p.cancel("Could not scan this directory. Make sure you're in a project root.");
    process.exit(1);
  }

  // Build a nice tech stack summary
  const stackParts: string[] = [];
  for (const lang of scan.techStack.languages.slice(0, 3)) {
    stackParts.push(`${lang.name} (${lang.fileCount} files)`);
  }
  for (const fw of scan.techStack.frameworks) {
    stackParts.push(`${fw.name}${fw.version ? ` ${fw.version}` : ""}`);
  }
  for (const t of scan.techStack.testing) {
    stackParts.push(`${t.name} (${t.type})`);
  }
  for (const db of scan.techStack.database) {
    stackParts.push(db.name);
  }
  for (const st of scan.techStack.styling) {
    stackParts.push(st.name);
  }
  for (const d of scan.techStack.deployment) {
    stackParts.push(d.name);
  }

  s.stop("Tech stack detected");

  // ── 3. Show stack ──
  p.note(
    stackParts.map((t) => `  ${chalk.green("●")} ${t}`).join("\n"),
    `${scan.projectName} — ${scan.fileTree.totalFiles} files scanned`
  );

  if (scan.existingConfigs.length > 0) {
    const existingList = scan.existingConfigs
      .map((c) => `  ${chalk.yellow("!")} ${c.tool}: ${c.filePath} (${formatBytes(c.sizeBytes)})`)
      .join("\n");
    p.note(existingList, "Existing AI configs found");
  }

  // ── 4. Select tools ──
  const toolOptions = ALL_TARGETS.map((t) => {
    const info = TOOL_REGISTRY[t];
    const hasExisting = scan.existingConfigs.some((c) => c.tool === t);
    const configFiles = info.configFiles[0] || "";
    return {
      value: t,
      label: `${info.displayName}`,
      hint: `${configFiles}${hasExisting ? chalk.yellow(" (existing)") : ""}`,
    };
  });

  const selectedTools = await p.multiselect({
    message: "Which AI coding tools do you use?",
    options: toolOptions,
    initialValues: detectLikelyTools(scan),
    required: true,
  });

  if (p.isCancel(selectedTools)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const tools = selectedTools as ToolTarget[];

  // ── 5. Agent recommendations ──
  const allAgents = recommendAgents(scan);

  // Only show agent picker if there are agents to choose from
  let selectedAgents: AgentRecommendation[] = [];
  if (allAgents.length > 0) {
    const agentOptions = allAgents.map((a) => {
      const bar = "█".repeat(Math.round(a.confidence / 10)) + "░".repeat(10 - Math.round(a.confidence / 10));
      return {
        value: a.id,
        label: `${a.name}`,
        hint: `${bar} ${a.confidence}% — ${a.reason.slice(0, 60)}`,
      };
    });

    // Pre-select agents with confidence >= 60
    const preSelected = allAgents.filter((a) => a.confidence >= 60).map((a) => a.id);

    const pickedAgentIds = await p.multiselect({
      message: "Recommended agents for your project (toggle to include/exclude):",
      options: agentOptions,
      initialValues: preSelected,
      required: false,
    });

    if (p.isCancel(pickedAgentIds)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    selectedAgents = allAgents.filter((a) => (pickedAgentIds as string[]).includes(a.id));
  }

  // ── 6. Rule recommendations ──
  const allRules = recommendRules(scan);

  let selectedRules: RuleRecommendation[] = [];
  if (allRules.length > 0) {
    const ruleOptions = allRules.map((r) => {
      const icon = r.priority === "high" ? "●" : r.priority === "medium" ? "◐" : "○";
      return {
        value: r.id,
        label: `${r.title}`,
        hint: `${icon} ${r.priority}`,
      };
    });

    // Pre-select high and medium priority
    const preSelected = allRules.filter((r) => r.priority !== "low").map((r) => r.id);

    const pickedRuleIds = await p.multiselect({
      message: "Rules to include in your configs:",
      options: ruleOptions,
      initialValues: preSelected,
      required: false,
    });

    if (p.isCancel(pickedRuleIds)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    selectedRules = allRules.filter((r) => (pickedRuleIds as string[]).includes(r.id));
  }

  // ── 7. Preview ──
  // Build a filtered recommendation result
  const recommendations = {
    agents: selectedAgents,
    rules: selectedRules,
    skippedAgents: allAgents
      .filter((a) => !selectedAgents.includes(a))
      .map((a) => ({ id: a.id, name: a.name, reason: "Excluded by user" })),
    totalTokensSaved: 0,
    recommendationDuration: 0,
  };

  const outputs = generateConfigs(tools, scan, recommendations);

  // Build preview
  const previewLines: string[] = [];
  let totalFiles = 0;
  let totalTokens = 0;

  for (const output of outputs) {
    const toolInfo = TOOL_REGISTRY[output.tool];
    const fileCount = output.files.length;
    const tokenCount = output.files.reduce((sum, f) => sum + estimateTokens(f.content), 0);
    totalFiles += fileCount;
    totalTokens += tokenCount;

    const fileList = output.files.map((f) => `    ${chalk.dim(f.path)}`).join("\n");
    previewLines.push(
      `  ${chalk.green("✓")} ${chalk.bold(toolInfo.displayName)}  ${chalk.dim(`${fileCount} files · ~${formatTokens(tokenCount)}`)}\n${fileList}`
    );

    // Show warnings
    for (const warning of output.warnings) {
      previewLines.push(`    ${chalk.yellow("⚠")} ${chalk.dim(warning)}`);
    }
  }

  previewLines.push("");
  previewLines.push(`  ${chalk.bold(`Total: ${totalFiles} files · ${tools.length} tools · ~${formatTokens(totalTokens)}`)}`);

  p.note(previewLines.join("\n"), "Files to generate");

  // ── 8. Confirm ──
  const overwriteNeeded = scan.existingConfigs.length > 0;

  const confirmAction = await p.select({
    message: overwriteNeeded
      ? "Some config files already exist. How should dotti proceed?"
      : "Ready to generate?",
    options: [
      { value: "write", label: "Generate files", hint: overwriteNeeded ? "overwrite existing" : "write to project" },
      { value: "write-safe", label: "Generate (skip existing)", hint: "only create new files" },
      { value: "dry-run", label: "Dry run", hint: "show what would be created without writing" },
      { value: "cancel", label: "Cancel" },
    ],
  });

  if (p.isCancel(confirmAction) || confirmAction === "cancel") {
    p.cancel("No files were created.");
    process.exit(0);
  }

  // ── 9. Write files ──
  const isDryRun = confirmAction === "dry-run";
  const skipExisting = confirmAction === "write-safe";

  const ws = p.spinner();
  ws.start(isDryRun ? "Previewing file operations..." : "Writing files...");

  let written = 0;
  let skipped = 0;
  const writtenPaths: string[] = [];

  for (const output of outputs) {
    for (const file of output.files) {
      const fullPath = path.join(projectRoot, file.path);

      if (skipExisting && fileExists(fullPath)) {
        skipped++;
        continue;
      }

      if (!isDryRun) {
        writeFileWithDirs(fullPath, file.content);
      }

      writtenPaths.push(file.path);
      written++;
    }
  }

  ws.stop(isDryRun ? "Dry run complete" : "Files generated");

  // ── 10. Success ──
  if (isDryRun) {
    p.note(
      writtenPaths.map((p) => `  ${chalk.dim(p)}`).join("\n"),
      `Would create ${written} files (dry run — nothing written)`
    );
  } else {
    const summaryLines = [
      `  ${chalk.green(written)} files created${skipped > 0 ? `, ${chalk.yellow(skipped)} skipped (existing)` : ""}`,
      `  ${chalk.green(tools.length)} tools configured: ${tools.map((t) => TOOL_REGISTRY[t].displayName).join(", ")}`,
      `  ${chalk.green(selectedAgents.length)} agents · ${chalk.green(selectedRules.length)} rules`,
      `  ~${formatTokens(totalTokens)} total context footprint`,
    ];

    p.note(summaryLines.join("\n"), "Done!");
  }

  // Closing tips
  const nextSteps = [
    `Review the generated files and tweak as needed — they're yours to edit.`,
    tools.includes("claude") ? `Open Claude Code in this project — it'll pick up CLAUDE.md automatically.` : null,
    tools.includes("cursor") ? `Open Cursor — .mdc rules in .cursor/rules/ activate by glob pattern.` : null,
    `Run ${chalk.green("dotti")} again anytime to regenerate.`,
  ].filter(Boolean) as string[];

  p.note(nextSteps.map((s) => `  ${s}`).join("\n"), "Next steps");

  p.outro(chalk.green("Happy coding!") + chalk.dim(" — dotti.dev"));
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Try to guess which tools the user likely uses based on existing configs
 * and common patterns.
 */
function detectLikelyTools(scan: import("../types/index.js").ScanResult): ToolTarget[] {
  const likely = new Set<ToolTarget>();

  // If they have existing configs, those tools are definite
  for (const config of scan.existingConfigs) {
    likely.add(config.tool);
  }

  // Default to claude + cursor as the most common combo
  if (likely.size === 0) {
    likely.add("claude");
    likely.add("cursor");
  }

  return Array.from(likely);
}
