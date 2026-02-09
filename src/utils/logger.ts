import chalk from "chalk";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

let currentLevel: LogLevel = "info";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

export const log = {
  debug(msg: string, ...args: unknown[]): void {
    if (shouldLog("debug")) {
      console.log(chalk.gray(`  ${msg}`), ...args);
    }
  },

  info(msg: string, ...args: unknown[]): void {
    if (shouldLog("info")) {
      console.log(`  ${msg}`, ...args);
    }
  },

  success(msg: string, ...args: unknown[]): void {
    if (shouldLog("info")) {
      console.log(chalk.green(`  ✓ ${msg}`), ...args);
    }
  },

  warn(msg: string, ...args: unknown[]): void {
    if (shouldLog("warn")) {
      console.log(chalk.yellow(`  ⚠ ${msg}`), ...args);
    }
  },

  error(msg: string, ...args: unknown[]): void {
    if (shouldLog("error")) {
      console.error(chalk.red(`  ✗ ${msg}`), ...args);
    }
  },

  /** Print a blank line */
  blank(): void {
    if (shouldLog("info")) console.log();
  },

  /** Print a section header */
  header(msg: string): void {
    if (shouldLog("info")) {
      console.log();
      console.log(chalk.bold.white(`  ${msg}`));
      console.log(chalk.gray(`  ${"─".repeat(msg.length + 2)}`));
    }
  },

  /** Print a key-value pair */
  kv(key: string, value: string): void {
    if (shouldLog("info")) {
      console.log(`  ${chalk.gray(key.padEnd(20))} ${value}`);
    }
  },

  /** Print a tree item */
  tree(item: string, isLast = false): void {
    if (shouldLog("info")) {
      const prefix = isLast ? "└──" : "├──";
      console.log(chalk.gray(`  ${prefix} `) + item);
    }
  },

  /** Print the dotti banner */
  banner(): void {
    if (shouldLog("info")) {
      console.log();
      console.log(chalk.bold.green("  dotti") + chalk.gray(" — AI config, from your code"));
      console.log();
    }
  },
};
