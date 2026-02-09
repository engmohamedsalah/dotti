import type {
  ToolTarget,
  ScanResult,
  RecommendationResult,
  AdapterOutput,
} from "../types/index.js";

/** Base adapter that all tool-specific adapters implement */
export abstract class BaseAdapter {
  abstract readonly tool: ToolTarget;
  abstract readonly displayName: string;

  /** Generate config files for this tool */
  abstract generate(
    scan: ScanResult,
    recommendations: RecommendationResult
  ): AdapterOutput;
}
