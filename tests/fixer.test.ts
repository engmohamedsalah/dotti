import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { analyzeAgents } from "../src/fixer/index.js";

function createTempProject(files: Record<string, string>): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dotti-fix-"));
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

describe("Fixer", () => {
  it("should return empty results for project with no agents", async () => {
    const tmpDir = createTempProject({
      "CLAUDE.md": "# Project\nSome rules here.",
    });
    try {
      const result = await analyzeAgents(tmpDir);
      expect(result.agents).toEqual([]);
      expect(result.issues).toEqual([]);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should detect a Claude agent file", async () => {
    const tmpDir = createTempProject({
      ".claude/agents/reviewer.md": [
        "---",
        "name: Code Reviewer",
        "description: Review code for quality issues and best practices",
        "---",
        "",
        "# Code Reviewer",
        "Review all code changes for **quality**, **security**, and **performance**.",
      ].join("\n"),
    });
    try {
      const result = await analyzeAgents(tmpDir);
      expect(result.agents.length).toBe(1);
      expect(result.agents[0].name).toBe("Code Reviewer");
      expect(result.agents[0].tool).toBe("claude");
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should detect vague agent description", async () => {
    const tmpDir = createTempProject({
      ".claude/agents/helper.md": [
        "---",
        "name: Helper",
        "description: Helps",
        "---",
        "",
        "A helper agent.",
      ].join("\n"),
    });
    try {
      const result = await analyzeAgents(tmpDir);
      expect(result.agents.length).toBe(1);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe("vague");
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should detect overlapping triggers between agents", async () => {
    const tmpDir = createTempProject({
      ".claude/agents/reviewer1.md": [
        "---",
        "name: Code Reviewer",
        "description: Review code for quality issues and best practices",
        "---",
        "",
        "Focus on **review**, **code**, **quality**, **check**, **lint**.",
      ].join("\n"),
      ".claude/agents/reviewer2.md": [
        "---",
        "name: Quality Checker",
        "description: Check code quality and find potential bugs",
        "---",
        "",
        "Focus on **review**, **code**, **quality**, **check**, **bugs**.",
      ].join("\n"),
    });
    try {
      const result = await analyzeAgents(tmpDir);
      expect(result.agents.length).toBe(2);
      const overlaps = result.issues.filter((i) => i.type === "overlap");
      expect(overlaps.length).toBeGreaterThan(0);
      expect(overlaps[0].message).toContain("share");
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should detect duplicate agent names across tools", async () => {
    const tmpDir = createTempProject({
      ".claude/agents/reviewer.md": [
        "---",
        "name: Code Reviewer",
        "description: Review code for quality issues and best practices",
        "---",
        "",
        "Review code changes.",
      ].join("\n"),
      ".github/agents/reviewer.agent.md": [
        "---",
        "name: Code Reviewer",
        "description: A different description for the same agent",
        "---",
        "",
        "Review code.",
      ].join("\n"),
    });
    try {
      const result = await analyzeAgents(tmpDir);
      expect(result.agents.length).toBe(2);
      const duplicates = result.issues.filter((i) => i.type === "duplicate");
      expect(duplicates.length).toBeGreaterThan(0);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should not flag agents with unique triggers", async () => {
    const tmpDir = createTempProject({
      ".claude/agents/reviewer.md": [
        "---",
        "name: Code Reviewer",
        "description: Review code for quality issues and best practices",
        "---",
        "",
        "Focus on **review**, **quality**, **lint**.",
      ].join("\n"),
      ".claude/agents/tester.md": [
        "---",
        "name: Test Writer",
        "description: Write comprehensive tests for the codebase",
        "---",
        "",
        "Focus on **testing**, **coverage**, **assertions**.",
      ].join("\n"),
    });
    try {
      const result = await analyzeAgents(tmpDir);
      expect(result.agents.length).toBe(2);
      const overlaps = result.issues.filter((i) => i.type === "overlap");
      expect(overlaps.length).toBe(0);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });

  it("should not flag description with action verbs as vague", async () => {
    const tmpDir = createTempProject({
      ".claude/agents/reviewer.md": [
        "---",
        "name: Code Reviewer",
        "description: Review code for quality issues and best practices",
        "---",
        "",
        "Review all code for quality.",
      ].join("\n"),
    });
    try {
      const result = await analyzeAgents(tmpDir);
      const vague = result.issues.filter((i) => i.type === "vague");
      expect(vague.length).toBe(0);
    } finally {
      cleanupTempProject(tmpDir);
    }
  });
});
