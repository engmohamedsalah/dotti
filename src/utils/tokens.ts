// ─────────────────────────────────────────────────────────────
// Token estimation — rough but useful for context budgeting
// Uses ~4 chars per token heuristic (accurate within 15%)
// ─────────────────────────────────────────────────────────────

const CHARS_PER_TOKEN = 4;

/** Estimate token count from a string */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Estimate token count from byte size */
export function estimateTokensFromBytes(bytes: number): number {
  return Math.ceil(bytes / CHARS_PER_TOKEN);
}

/** Format token count for display */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k tokens`;
  }
  return `${tokens} tokens`;
}

/** Format byte size for display */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${bytes}B`;
}

/** Format chars for display */
export function formatChars(chars: number): string {
  if (chars >= 1000) {
    return `${(chars / 1000).toFixed(1)}k chars`;
  }
  return `${chars} chars`;
}

/** Check if content fits within tool size limits */
export function checkSizeLimit(
  content: string,
  maxSize: number,
  unit: "tokens" | "chars" | "bytes"
): { fits: boolean; currentSize: number; maxSize: number; unit: string } {
  let currentSize: number;
  switch (unit) {
    case "tokens":
      currentSize = estimateTokens(content);
      break;
    case "chars":
      currentSize = content.length;
      break;
    case "bytes":
      currentSize = Buffer.byteLength(content, "utf-8");
      break;
  }

  return {
    fits: currentSize <= maxSize,
    currentSize,
    maxSize,
    unit,
  };
}
