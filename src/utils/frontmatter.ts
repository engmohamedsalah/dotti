// ─────────────────────────────────────────────────────────────
// Shared YAML frontmatter parser
// Supports simple key:value pairs (not arrays or nested objects)
// ─────────────────────────────────────────────────────────────

export interface FrontmatterResult {
  found: boolean;
  fields: Record<string, string>;
  body: string;
}

/** Parse YAML-style frontmatter from markdown content */
export function parseFrontmatter(content: string): FrontmatterResult {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { found: false, fields: {}, body: content };
  }

  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      fields[key] = value;
    }
  }

  return { found: true, fields, body: match[2] };
}
