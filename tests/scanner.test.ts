import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { scanPackage } from "../src/scanner/package-scanner.js";
import { scanFileTree } from "../src/scanner/file-tree-scanner.js";

describe("Package Scanner", () => {
  it("should detect project name from package.json", () => {
    // Test against dotti's own package.json
    const result = scanPackage(path.resolve(__dirname, ".."));
    expect(result.projectName).toBe("dotti");
  });

  it("should detect package manager", () => {
    const result = scanPackage(path.resolve(__dirname, ".."));
    expect(["npm", "yarn", "pnpm", "bun", "unknown"]).toContain(result.packageManager);
  });

  it("should return empty arrays for project with no deps", () => {
    const result = scanPackage("/tmp/empty-project");
    expect(result.frameworks).toEqual([]);
    expect(result.buildTools).toEqual([]);
    expect(result.testing).toEqual([]);
  });
});

describe("File Tree Scanner", () => {
  it("should count files in project", () => {
    const result = scanFileTree(path.resolve(__dirname, ".."));
    expect(result.totalFiles).toBeGreaterThan(0);
  });

  it("should detect TypeScript files", () => {
    const result = scanFileTree(path.resolve(__dirname, ".."));
    const tsLang = result.languages.find((l) => l.name === "TypeScript");
    expect(tsLang).toBeDefined();
    expect(tsLang!.fileCount).toBeGreaterThan(0);
  });

  it("should list top-level directories", () => {
    const result = scanFileTree(path.resolve(__dirname, ".."));
    expect(result.topLevelDirs).toContain("src");
  });
});
