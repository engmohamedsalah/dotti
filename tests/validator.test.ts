import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { validateConfigs } from "../src/validator/index.js";

/** Create a temporary directory with test config files */
function createTempProject(files: Record<string, string>): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dotti-test-"));
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(tmpDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
  }
  return tmpDir;
}

function cleanupTempProject(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("Validator", () => {
  it("should return 0 configs for empty project", async () => {
    const tmpDir = createTempProject({});
    try {
      const result = await validateConfigs(tmpDir);
      expect(result.configsFound).toBe(0);
      expect(result.issues).toEqual([]);
      expect(result.warnings).toEqual([]);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should detect valid Claude agent file", async () => {
    const tmpDir = createTempProject({
      ".claude/agents/reviewer.md": [
        "---",
        "name: Code Reviewer",
        "description: Reviews code for quality",
        "---",
        "",
        "# Code Reviewer",
        "Review code for quality issues.",
      ].join("\n"),
    });
    try {
      const result = await validateConfigs(tmpDir);
      expect(result.configsFound).toBe(1);
      expect(result.configsValid).toBe(1);
      expect(result.issues).toEqual([]);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should flag Claude agent missing frontmatter", async () => {
    const tmpDir = createTempProject({
      ".claude/agents/reviewer.md": "# Code Reviewer\nNo frontmatter here.",
    });
    try {
      const result = await validateConfigs(tmpDir);
      expect(result.configsFound).toBe(1);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].message).toContain("missing YAML frontmatter");
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should flag Claude agent missing name field", async () => {
    const tmpDir = createTempProject({
      ".claude/agents/reviewer.md": [
        "---",
        "description: Reviews code",
        "---",
        "",
        "# Reviewer",
      ].join("\n"),
    });
    try {
      const result = await validateConfigs(tmpDir);
      expect(result.issues.some((i) => i.message.includes("`name`"))).toBe(true);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should flag Cursor .mdc missing frontmatter", async () => {
    const tmpDir = createTempProject({
      ".cursor/rules/test.mdc": "# Just markdown, no frontmatter",
    });
    try {
      const result = await validateConfigs(tmpDir);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].tool).toBe("cursor");
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should validate valid Cursor .mdc file", async () => {
    const tmpDir = createTempProject({
      ".cursor/rules/ts.mdc": [
        "---",
        "description: TypeScript rules",
        "globs: **/*.ts",
        "alwaysApply: false",
        "---",
        "",
        "Use strict TypeScript.",
      ].join("\n"),
    });
    try {
      const result = await validateConfigs(tmpDir);
      expect(result.configsFound).toBe(1);
      expect(result.issues).toEqual([]);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should flag invalid Amp settings.json", async () => {
    const tmpDir = createTempProject({
      ".amp/settings.json": "{ this is not valid json }",
    });
    try {
      const result = await validateConfigs(tmpDir);
      expect(result.issues.some((i) => i.message.includes("not valid JSON"))).toBe(true);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should warn about Amp settings.json missing $schema", async () => {
    const tmpDir = createTempProject({
      ".amp/settings.json": JSON.stringify({ project: { name: "test" } }),
    });
    try {
      const result = await validateConfigs(tmpDir);
      expect(result.warnings.some((w) => w.message.includes("$schema"))).toBe(true);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should validate valid CLAUDE.md at root", async () => {
    const tmpDir = createTempProject({
      "CLAUDE.md": "# My Project\n\n## Tech Stack\n- TypeScript",
    });
    try {
      const result = await validateConfigs(tmpDir);
      expect(result.configsFound).toBe(1);
      expect(result.issues).toEqual([]);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });
});
