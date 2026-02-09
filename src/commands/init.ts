import type { InitOptions } from "../types/index.js";
import { log } from "../utils/logger.js";

const AVAILABLE_TEMPLATES = [
  { id: "react-saas", name: "React SaaS", desc: "React + TypeScript + Tailwind + Prisma + Auth" },
  { id: "nextjs-app", name: "Next.js App", desc: "Next.js 14+ with App Router, RSC, and API routes" },
  { id: "python-api", name: "Python API", desc: "FastAPI + SQLAlchemy + Alembic + pytest" },
  { id: "node-api", name: "Node.js API", desc: "Express/Fastify + TypeScript + Prisma + Jest" },
  { id: "monorepo", name: "Monorepo", desc: "Turborepo/Nx with shared packages and apps" },
  { id: "cli-tool", name: "CLI Tool", desc: "Node.js CLI with Commander + TypeScript" },
];

export async function initCommand(options: InitOptions): Promise<void> {
  log.banner();

  if (!options.template) {
    log.header("Available Templates");
    log.blank();
    for (const t of AVAILABLE_TEMPLATES) {
      log.info(`  ${t.id.padEnd(16)} ${t.name.padEnd(20)} ${t.desc}`);
    }
    log.blank();
    log.info("Usage: dotti init --template <template-id>");
    log.blank();
    return;
  }

  const template = AVAILABLE_TEMPLATES.find((t) => t.id === options.template);
  if (!template) {
    log.error(`Unknown template: ${options.template}`);
    log.info(`Available: ${AVAILABLE_TEMPLATES.map((t) => t.id).join(", ")}`);
    return;
  }

  // TODO: Implement template application
  // 1. Load template agent + rule definitions
  // 2. Run codebase scan to customize
  // 3. Generate configs using adapters
  // 4. Write files

  log.header(`Template: ${template.name}`);
  log.info(template.desc);
  log.blank();
  log.warn("Init command with templates is coming in v0.2.0");
  log.info("For now, use `dotti scan` — it auto-detects your stack and generates recommendations.");
  log.blank();
}
