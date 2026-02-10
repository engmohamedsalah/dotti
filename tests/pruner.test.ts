import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { findPruneTargets } from "../src/pruner/index.js";

function createTempProject(files: Record<string, string>): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dotti-prune-"));
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

describe("Pruner", () => {
  it("should return 0 targets for empty project", async () => {
    const tmpDir = createTempProject({});
    try {
      const result = await findPruneTargets(tmpDir);
      expect(result.configsScanned).toBe(0);
      expect(result.pruneTargets).toEqual([]);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should detect empty config files", async () => {
    const tmpDir = createTempProject({
      "CLAUDE.md": "---\n---\n   \n",
    });
    try {
      const result = await findPruneTargets(tmpDir);
      expect(result.pruneTargets.length).toBe(1);
      expect(result.pruneTargets[0].reason).toBe("empty-content");
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should not flag config with meaningful content", async () => {
    const tmpDir = createTempProject({
      "CLAUDE.md":
        "# My Project\n\nThis project uses TypeScript and React. Follow standard conventions.",
    });
    try {
      const result = await findPruneTargets(tmpDir);
      const emptyTargets = result.pruneTargets.filter(
        (t) => t.reason === "empty-content"
      );
      expect(emptyTargets.length).toBe(0);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should detect dead glob patterns", async () => {
    const tmpDir = createTempProject({
      ".cursor/rules/rust.mdc": [
        "---",
        "description: Rust rules",
        "globs: **/*.rs",
        "alwaysApply: false",
        "---",
        "",
        "Use idiomatic Rust patterns and follow the Rust style guide.",
      ].join("\n"),
      // No .rs files exist in the project
      "src/index.ts": "console.log('hello');",
    });
    try {
      const result = await findPruneTargets(tmpDir);
      const deadGlobs = result.pruneTargets.filter(
        (t) => t.reason === "dead-globs"
      );
      expect(deadGlobs.length).toBe(1);
      expect(deadGlobs[0].message).toContain("**/*.rs");
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should not flag glob patterns that match files", async () => {
    const tmpDir = createTempProject({
      ".cursor/rules/ts.mdc": [
        "---",
        "description: TypeScript rules",
        "globs: **/*.ts",
        "alwaysApply: false",
        "---",
        "",
        "Use strict TypeScript with proper type annotations.",
      ].join("\n"),
      "src/index.ts": "console.log('hello');",
    });
    try {
      const result = await findPruneTargets(tmpDir);
      const deadGlobs = result.pruneTargets.filter(
        (t) => t.reason === "dead-globs"
      );
      expect(deadGlobs.length).toBe(0);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should skip universal glob patterns", async () => {
    const tmpDir = createTempProject({
      ".cursor/rules/all.mdc": [
        "---",
        "description: Universal rules",
        "globs: **/*",
        "alwaysApply: false",
        "---",
        "",
        "Follow consistent coding standards across all files in the project.",
      ].join("\n"),
    });
    try {
      const result = await findPruneTargets(tmpDir);
      const deadGlobs = result.pruneTargets.filter(
        (t) => t.reason === "dead-globs"
      );
      expect(deadGlobs.length).toBe(0);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should not double-flag empty configs as dead globs", async () => {
    const tmpDir = createTempProject({
      ".cursor/rules/empty.mdc": [
        "---",
        "description: Empty rule",
        "globs: **/*.xyz",
        "alwaysApply: false",
        "---",
        "",
        "  ",
      ].join("\n"),
    });
    try {
      const result = await findPruneTargets(tmpDir);
      // Should only flag as empty-content, not also as dead-globs
      expect(result.pruneTargets.length).toBe(1);
      expect(result.pruneTargets[0].reason).toBe("empty-content");
    } finally {
      cleanupTempProject(tmpDir);
    }
  });
});
