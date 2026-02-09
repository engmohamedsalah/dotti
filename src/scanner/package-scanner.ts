import * as path from "node:path";
import type {
  FrameworkInfo,
  BuildToolInfo,
  TestingInfo,
  DatabaseInfo,
  StylingInfo,
  LintingInfo,
} from "../types/index.js";
import { readJsonSafe, fileExists } from "../utils/fs-helpers.js";

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  engines?: Record<string, string>;
}

/** Extract version from semver range (^1.2.3 → 1.2.3) */
function cleanVersion(version: string): string {
  return version.replace(/^[\^~>=<]+/, "");
}

/** Check if a dependency exists in package.json */
function hasDep(pkg: PackageJson, name: string): string | undefined {
  return pkg.dependencies?.[name] || pkg.devDependencies?.[name];
}

// ─────────────────────────────────────────────────────────────
// Framework detection rules
// ─────────────────────────────────────────────────────────────

interface DetectionRule {
  name: string;
  detect: (pkg: PackageJson, projectRoot: string) => { found: boolean; version?: string; confidence: number };
  type: "framework" | "build" | "test" | "database" | "style" | "lint";
  testType?: "unit" | "e2e" | "integration" | "component";
}

const DETECTION_RULES: DetectionRule[] = [
  // ── Frameworks ──
  {
    name: "React",
    type: "framework",
    detect: (pkg) => {
      const v = hasDep(pkg, "react");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: v ? 95 : 0 };
    },
  },
  {
    name: "Next.js",
    type: "framework",
    detect: (pkg, root) => {
      const v = hasDep(pkg, "next");
      const hasConfig = fileExists(path.join(root, "next.config.js")) || fileExists(path.join(root, "next.config.mjs")) || fileExists(path.join(root, "next.config.ts"));
      return { found: !!v || hasConfig, version: v ? cleanVersion(v) : undefined, confidence: v ? 95 : hasConfig ? 85 : 0 };
    },
  },
  {
    name: "Vue",
    type: "framework",
    detect: (pkg) => {
      const v = hasDep(pkg, "vue");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: v ? 95 : 0 };
    },
  },
  {
    name: "Nuxt",
    type: "framework",
    detect: (pkg) => {
      const v = hasDep(pkg, "nuxt");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: v ? 95 : 0 };
    },
  },
  {
    name: "Svelte",
    type: "framework",
    detect: (pkg) => {
      const v = hasDep(pkg, "svelte");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: v ? 95 : 0 };
    },
  },
  {
    name: "SvelteKit",
    type: "framework",
    detect: (pkg) => {
      const v = hasDep(pkg, "@sveltejs/kit");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: v ? 95 : 0 };
    },
  },
  {
    name: "Angular",
    type: "framework",
    detect: (pkg) => {
      const v = hasDep(pkg, "@angular/core");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: v ? 95 : 0 };
    },
  },
  {
    name: "Express",
    type: "framework",
    detect: (pkg) => {
      const v = hasDep(pkg, "express");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: v ? 90 : 0 };
    },
  },
  {
    name: "Fastify",
    type: "framework",
    detect: (pkg) => {
      const v = hasDep(pkg, "fastify");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: v ? 90 : 0 };
    },
  },
  {
    name: "Hono",
    type: "framework",
    detect: (pkg) => {
      const v = hasDep(pkg, "hono");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: v ? 90 : 0 };
    },
  },
  {
    name: "Remix",
    type: "framework",
    detect: (pkg) => {
      const v = hasDep(pkg, "@remix-run/node") || hasDep(pkg, "@remix-run/react");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: v ? 95 : 0 };
    },
  },
  {
    name: "Astro",
    type: "framework",
    detect: (pkg) => {
      const v = hasDep(pkg, "astro");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: v ? 95 : 0 };
    },
  },

  // ── Build tools ──
  {
    name: "Vite",
    type: "build",
    detect: (pkg, root) => {
      const v = hasDep(pkg, "vite");
      const hasConfig = fileExists(path.join(root, "vite.config.ts")) || fileExists(path.join(root, "vite.config.js"));
      return { found: !!v || hasConfig, version: v ? cleanVersion(v) : undefined, confidence: 90 };
    },
  },
  {
    name: "Webpack",
    type: "build",
    detect: (pkg) => {
      const v = hasDep(pkg, "webpack");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: 85 };
    },
  },
  {
    name: "Turbopack",
    type: "build",
    detect: (pkg, root) => {
      const hasTurbo = fileExists(path.join(root, "turbo.json"));
      return { found: hasTurbo, confidence: 85 };
    },
  },
  {
    name: "esbuild",
    type: "build",
    detect: (pkg) => {
      const v = hasDep(pkg, "esbuild");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: 85 };
    },
  },

  // ── Testing ──
  {
    name: "Vitest",
    type: "test",
    testType: "unit",
    detect: (pkg) => {
      const v = hasDep(pkg, "vitest");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: 95 };
    },
  },
  {
    name: "Jest",
    type: "test",
    testType: "unit",
    detect: (pkg) => {
      const v = hasDep(pkg, "jest");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: 95 };
    },
  },
  {
    name: "Playwright",
    type: "test",
    testType: "e2e",
    detect: (pkg) => {
      const v = hasDep(pkg, "@playwright/test") || hasDep(pkg, "playwright");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: 95 };
    },
  },
  {
    name: "Cypress",
    type: "test",
    testType: "e2e",
    detect: (pkg) => {
      const v = hasDep(pkg, "cypress");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: 95 };
    },
  },
  {
    name: "Testing Library",
    type: "test",
    testType: "component",
    detect: (pkg) => {
      const v = hasDep(pkg, "@testing-library/react") || hasDep(pkg, "@testing-library/vue");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: 90 };
    },
  },

  // ── Databases ──
  {
    name: "Prisma",
    type: "database",
    detect: (pkg, root) => {
      const v = hasDep(pkg, "prisma") || hasDep(pkg, "@prisma/client");
      const hasSchema = fileExists(path.join(root, "prisma/schema.prisma"));
      return { found: !!v || hasSchema, version: v ? cleanVersion(v) : undefined, confidence: 95 };
    },
  },
  {
    name: "Drizzle",
    type: "database",
    detect: (pkg) => {
      const v = hasDep(pkg, "drizzle-orm");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: 95 };
    },
  },
  {
    name: "Mongoose",
    type: "database",
    detect: (pkg) => {
      const v = hasDep(pkg, "mongoose");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: 90 };
    },
  },
  {
    name: "TypeORM",
    type: "database",
    detect: (pkg) => {
      const v = hasDep(pkg, "typeorm");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: 90 };
    },
  },

  // ── Styling ──
  {
    name: "Tailwind CSS",
    type: "style",
    detect: (pkg, root) => {
      const v = hasDep(pkg, "tailwindcss");
      const hasConfig = fileExists(path.join(root, "tailwind.config.js")) || fileExists(path.join(root, "tailwind.config.ts"));
      return { found: !!v || hasConfig, version: v ? cleanVersion(v) : undefined, confidence: 95 };
    },
  },
  {
    name: "styled-components",
    type: "style",
    detect: (pkg) => {
      const v = hasDep(pkg, "styled-components");
      return { found: !!v, version: v ? cleanVersion(v) : undefined, confidence: 90 };
    },
  },
  {
    name: "shadcn/ui",
    type: "style",
    detect: (_, root) => {
      const hasConfig = fileExists(path.join(root, "components.json"));
      return { found: hasConfig, confidence: 85 };
    },
  },

  // ── Linting ──
  {
    name: "ESLint",
    type: "lint",
    detect: (pkg, root) => {
      const v = hasDep(pkg, "eslint");
      const hasConfig =
        fileExists(path.join(root, ".eslintrc.js")) ||
        fileExists(path.join(root, ".eslintrc.json")) ||
        fileExists(path.join(root, "eslint.config.js")) ||
        fileExists(path.join(root, "eslint.config.mjs"));
      return { found: !!v || hasConfig, version: v ? cleanVersion(v) : undefined, confidence: 90 };
    },
  },
  {
    name: "Prettier",
    type: "lint",
    detect: (pkg, root) => {
      const v = hasDep(pkg, "prettier");
      const hasConfig =
        fileExists(path.join(root, ".prettierrc")) ||
        fileExists(path.join(root, ".prettierrc.json")) ||
        fileExists(path.join(root, "prettier.config.js"));
      return { found: !!v || hasConfig, version: v ? cleanVersion(v) : undefined, confidence: 90 };
    },
  },
  {
    name: "Biome",
    type: "lint",
    detect: (pkg, root) => {
      const v = hasDep(pkg, "@biomejs/biome");
      const hasConfig = fileExists(path.join(root, "biome.json")) || fileExists(path.join(root, "biome.jsonc"));
      return { found: !!v || hasConfig, version: v ? cleanVersion(v) : undefined, confidence: 90 };
    },
  },
];

// ─────────────────────────────────────────────────────────────
// Main scanner
// ─────────────────────────────────────────────────────────────

export interface PackageScanResult {
  projectName: string;
  frameworks: FrameworkInfo[];
  buildTools: BuildToolInfo[];
  testing: TestingInfo[];
  database: DatabaseInfo[];
  styling: StylingInfo[];
  linting: LintingInfo[];
  packageManager: "npm" | "yarn" | "pnpm" | "bun" | "pip" | "cargo" | "unknown";
}

/** Detect the package manager in use */
function detectPackageManager(projectRoot: string): PackageScanResult["packageManager"] {
  if (fileExists(path.join(projectRoot, "bun.lockb")) || fileExists(path.join(projectRoot, "bun.lock"))) return "bun";
  if (fileExists(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fileExists(path.join(projectRoot, "yarn.lock"))) return "yarn";
  if (fileExists(path.join(projectRoot, "package-lock.json"))) return "npm";
  if (fileExists(path.join(projectRoot, "Pipfile")) || fileExists(path.join(projectRoot, "pyproject.toml"))) return "pip";
  if (fileExists(path.join(projectRoot, "Cargo.toml"))) return "cargo";
  return "unknown";
}

/** Scan package.json and project configs to detect tech stack */
export function scanPackage(projectRoot: string): PackageScanResult {
  const pkgPath = path.join(projectRoot, "package.json");
  const pkg = readJsonSafe<PackageJson>(pkgPath) || ({} as PackageJson);

  const frameworks: FrameworkInfo[] = [];
  const buildTools: BuildToolInfo[] = [];
  const testing: TestingInfo[] = [];
  const database: DatabaseInfo[] = [];
  const styling: StylingInfo[] = [];
  const linting: LintingInfo[] = [];

  for (const rule of DETECTION_RULES) {
    const result = rule.detect(pkg, projectRoot);
    if (!result.found) continue;

    switch (rule.type) {
      case "framework":
        frameworks.push({
          name: rule.name,
          version: result.version,
          confidence: result.confidence,
          detectedBy: "package.json",
        });
        break;
      case "build":
        buildTools.push({
          name: rule.name,
          version: result.version,
        });
        break;
      case "test":
        testing.push({
          name: rule.name,
          type: rule.testType || "unit",
        });
        break;
      case "database":
        database.push({ name: rule.name });
        break;
      case "style":
        styling.push({ name: rule.name, version: result.version });
        break;
      case "lint":
        linting.push({ name: rule.name });
        break;
    }
  }

  return {
    projectName: pkg.name || path.basename(projectRoot),
    frameworks,
    buildTools,
    testing,
    database,
    styling,
    linting,
    packageManager: detectPackageManager(projectRoot),
  };
}
