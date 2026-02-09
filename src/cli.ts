import { Command } from "commander";
import { wizardCommand } from "./commands/wizard.js";
import { scanCommand } from "./commands/scan.js";
import { pruneCommand } from "./commands/prune.js";
import { fixCommand } from "./commands/fix.js";
import { validateCommand } from "./commands/validate.js";
import { initCommand } from "./commands/init.js";
import { setLogLevel } from "./utils/logger.js";
import type { ToolTarget } from "./types/index.js";

const program = new Command();

program
  .name("dotti")
  .description("AI config, from your code. Scan your codebase, get agent recommendations, generate configs for every AI coding tool.")
  .version("0.1.0");

// ── dotti (default) → interactive wizard ──
program
  .argument("[path]", "Project root path", ".")
  .action(async (projectPath: string) => {
    // If running with no subcommand, launch the wizard
    await wizardCommand(projectPath);
  });

// ── dotti scan → non-interactive (for CI / scripts) ──
program
  .command("scan")
  .description("Scan & generate configs (non-interactive, for CI/scripts)")
  .option("-t, --target <tool>", "Target tool (claude|cursor|codex|copilot|windsurf|gemini|amp|all)", "all")
  .option("-p, --path <path>", "Project root path", ".")
  .option("-d, --dry-run", "Preview changes without writing files", false)
  .option("-f, --force", "Overwrite existing config files", false)
  .option("-v, --verbose", "Enable verbose logging", false)
  .action(async (opts) => {
    if (opts.verbose) setLogLevel("debug");
    await scanCommand({
      target: opts.target as ToolTarget | "all",
      projectPath: opts.path,
      dryRun: opts.dryRun,
      force: opts.force,
      verbose: opts.verbose,
    });
  });

// ── dotti prune ──
program
  .command("prune")
  .description("Find and remove unused agent configs")
  .option("-p, --path <path>", "Project root path", ".")
  .option("-d, --dry-run", "Preview without removing", false)
  .option("-v, --verbose", "Enable verbose logging", false)
  .option("--days <days>", "Consider unused after N days", "30")
  .action(async (opts) => {
    if (opts.verbose) setLogLevel("debug");
    await pruneCommand({
      projectPath: opts.path,
      dryRun: opts.dryRun,
      verbose: opts.verbose,
      days: parseInt(opts.days, 10),
    });
  });

// ── dotti fix ──
program
  .command("fix")
  .description("Fix agent routing conflicts and vague descriptions")
  .option("-p, --path <path>", "Project root path", ".")
  .option("-d, --dry-run", "Preview fixes without applying", false)
  .option("-v, --verbose", "Enable verbose logging", false)
  .action(async (opts) => {
    if (opts.verbose) setLogLevel("debug");
    await fixCommand({
      projectPath: opts.path,
      dryRun: opts.dryRun,
      verbose: opts.verbose,
    });
  });

// ── dotti validate ──
program
  .command("validate")
  .description("Validate existing AI tool config files")
  .option("-p, --path <path>", "Project root path", ".")
  .option("-v, --verbose", "Enable verbose logging", false)
  .action(async (opts) => {
    if (opts.verbose) setLogLevel("debug");
    await validateCommand({
      projectPath: opts.path,
      verbose: opts.verbose,
    });
  });

// ── dotti init ──
program
  .command("init")
  .description("Initialize from a project template")
  .option("--template <id>", "Template to use (react-saas|nextjs-app|python-api|node-api|monorepo|cli-tool)")
  .option("-t, --target <tool>", "Target tool", "all")
  .option("-p, --path <path>", "Project root path", ".")
  .option("-f, --force", "Overwrite existing configs", false)
  .action(async (opts) => {
    await initCommand({
      template: opts.template,
      target: opts.target as ToolTarget | "all",
      projectPath: opts.path,
      force: opts.force,
    });
  });

export { program };
