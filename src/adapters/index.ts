import type { ToolTarget, ScanResult, RecommendationResult, AdapterOutput } from "../types/index.js";
import { BaseAdapter } from "./base-adapter.js";
import { ClaudeAdapter } from "./claude-adapter.js";
import { CursorAdapter } from "./cursor-adapter.js";
import { CodexAdapter } from "./codex-adapter.js";
import { CopilotAdapter } from "./copilot-adapter.js";
import { WindsurfAdapter } from "./windsurf-adapter.js";
import { GeminiAdapter } from "./gemini-adapter.js";
import { AmpAdapter } from "./amp-adapter.js";

/** Registry of all adapters */
const ADAPTER_REGISTRY: Record<ToolTarget, BaseAdapter> = {
  claude: new ClaudeAdapter(),
  cursor: new CursorAdapter(),
  codex: new CodexAdapter(),
  copilot: new CopilotAdapter(),
  windsurf: new WindsurfAdapter(),
  gemini: new GeminiAdapter(),
  amp: new AmpAdapter(),
};

/** Get adapter for a specific tool */
export function getAdapter(tool: ToolTarget): BaseAdapter {
  const adapter = ADAPTER_REGISTRY[tool];
  if (!adapter) throw new Error(`Unknown tool: ${tool}`);
  return adapter;
}

/** Get all adapters */
export function getAllAdapters(): BaseAdapter[] {
  return Object.values(ADAPTER_REGISTRY);
}

/** Generate configs for specified targets */
export function generateConfigs(
  targets: ToolTarget[],
  scan: ScanResult,
  recommendations: RecommendationResult
): AdapterOutput[] {
  return targets.map((target) => {
    const adapter = getAdapter(target);
    return adapter.generate(scan, recommendations);
  });
}

export { BaseAdapter } from "./base-adapter.js";
export { ClaudeAdapter } from "./claude-adapter.js";
export { CursorAdapter } from "./cursor-adapter.js";
export { CodexAdapter } from "./codex-adapter.js";
export { CopilotAdapter } from "./copilot-adapter.js";
export { WindsurfAdapter } from "./windsurf-adapter.js";
export { GeminiAdapter } from "./gemini-adapter.js";
export { AmpAdapter } from "./amp-adapter.js";
