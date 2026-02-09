import type { PruneOptions } from "../types/index.js";
import { log } from "../utils/logger.js";

export async function pruneCommand(options: PruneOptions): Promise<void> {
  log.banner();
  log.header("Prune — Remove unused configs");
  log.blank();

  // TODO: Implement prune logic
  // 1. Scan existing configs across all tools
  // 2. Check agent invocation logs (where available)
  // 3. Match agent file patterns against actual project files
  // 4. Flag agents whose file patterns match 0 files
  // 5. Flag agents with 0 invocations in N days
  // 6. Present removal recommendations
  // 7. Apply with confirmation

  log.warn("Prune command is coming in v0.2.0");
  log.info("This will analyze your existing configs and flag unused agents/rules.");
  log.info("For now, use `dotti scan --dry-run` to see what dotti recommends.");
  log.blank();
}
