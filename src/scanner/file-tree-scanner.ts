import * as path from "node:path";
import type { FileTreeAnalysis, LanguageInfo } from "../types/index.js";
import { walkDir, getTopLevelDirs, countFilesByExtension, dirExists, fileExists } from "../utils/fs-helpers.js";

/** Language detection by file extension */
const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".rs": "Rust",
  ".go": "Go",
  ".java": "Java",
  ".kt": "Kotlin",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#",
  ".swift": "Swift",
  ".dart": "Dart",
  ".vue": "Vue",
  ".svelte": "Svelte",
};

/** Paths that indicate project patterns */
const SIGNIFICANT_PATTERNS: Array<{ path: string; meaning: string }> = [
  { path: "prisma", meaning: "Prisma ORM" },
  { path: "drizzle", meaning: "Drizzle ORM" },
  { path: "playwright", meaning: "Playwright tests" },
  { path: "cypress", meaning: "Cypress tests" },
  { path: "__tests__", meaning: "Test directory" },
  { path: "tests", meaning: "Test directory" },
  { path: "e2e", meaning: "E2E tests" },
  { path: ".github/workflows", meaning: "GitHub Actions" },
  { path: ".github/actions", meaning: "Custom GitHub Actions" },
  { path: "docker", meaning: "Docker config" },
  { path: ".docker", meaning: "Docker config" },
  { path: "k8s", meaning: "Kubernetes" },
  { path: "kubernetes", meaning: "Kubernetes" },
  { path: "terraform", meaning: "Terraform IaC" },
  { path: "pulumi", meaning: "Pulumi IaC" },
  { path: "supabase", meaning: "Supabase" },
  { path: "migrations", meaning: "Database migrations" },
  { path: "seeds", meaning: "Database seeds" },
  { path: "storybook", meaning: "Storybook" },
  { path: ".storybook", meaning: "Storybook" },
  { path: "docs", meaning: "Documentation" },
  { path: "packages", meaning: "Monorepo packages" },
  { path: "apps", meaning: "Monorepo apps" },
  { path: "libs", meaning: "Monorepo libs" },
  { path: "api", meaning: "API directory" },
  { path: "server", meaning: "Server directory" },
  { path: "client", meaning: "Client directory" },
  { path: "src/components", meaning: "Component directory" },
  { path: "src/hooks", meaning: "Custom hooks" },
  { path: "src/lib", meaning: "Library code" },
  { path: "src/utils", meaning: "Utilities" },
  { path: "src/services", meaning: "Service layer" },
  { path: "src/pages", meaning: "Pages (file-based routing)" },
  { path: "src/app", meaning: "App directory (Next.js)" },
  { path: "src/routes", meaning: "Routes directory" },
];

/** Detect if project is a monorepo */
function detectMonorepo(projectRoot: string): { isMonorepo: boolean; packages: string[] } {
  // Check for common monorepo indicators
  const indicators = [
    { dir: "packages", check: true },
    { dir: "apps", check: true },
    { dir: "libs", check: true },
  ];

  const packages: string[] = [];
  let isMonorepo = false;

  // Check pnpm-workspace.yaml, lerna.json, turbo.json, nx.json
  if (
    fileExists(path.join(projectRoot, "pnpm-workspace.yaml")) ||
    fileExists(path.join(projectRoot, "lerna.json")) ||
    fileExists(path.join(projectRoot, "turbo.json")) ||
    fileExists(path.join(projectRoot, "nx.json"))
  ) {
    isMonorepo = true;
  }

  for (const { dir } of indicators) {
    const fullPath = path.join(projectRoot, dir);
    if (dirExists(fullPath)) {
      const subdirs = getTopLevelDirs(fullPath);
      packages.push(...subdirs.map((s) => `${dir}/${s}`));
      if (subdirs.length > 0) isMonorepo = true;
    }
  }

  return { isMonorepo, packages };
}

/** Scan the file tree to analyze project structure */
export function scanFileTree(projectRoot: string): FileTreeAnalysis & { languages: LanguageInfo[] } {
  const files = walkDir(projectRoot, { maxDepth: 6 });
  const topLevelDirs = getTopLevelDirs(projectRoot);
  const filesByExtension = countFilesByExtension(files);

  // Detect languages
  const languageCounts: Record<string, { count: number; extensions: Set<string> }> = {};
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const language = LANGUAGE_MAP[ext];
    if (language) {
      if (!languageCounts[language]) {
        languageCounts[language] = { count: 0, extensions: new Set() };
      }
      languageCounts[language].count++;
      languageCounts[language].extensions.add(ext);
    }
  }

  const languages: LanguageInfo[] = Object.entries(languageCounts)
    .map(([name, { count, extensions }]) => ({
      name,
      fileCount: count,
      extensions: Array.from(extensions),
    }))
    .sort((a, b) => b.fileCount - a.fileCount);

  // Detect significant paths
  const significantPaths: string[] = [];
  for (const pattern of SIGNIFICANT_PATTERNS) {
    if (dirExists(path.join(projectRoot, pattern.path)) || fileExists(path.join(projectRoot, pattern.path))) {
      significantPaths.push(pattern.meaning);
    }
  }

  // Detect monorepo
  const { isMonorepo, packages } = detectMonorepo(projectRoot);

  // Count directories
  let totalDirs = 0;
  for (const file of files) {
    const dir = path.dirname(file);
    if (dir !== projectRoot) totalDirs++;
  }

  return {
    totalFiles: files.length,
    totalDirs: new Set(files.map((f) => path.dirname(f))).size,
    filesByExtension,
    topLevelDirs,
    hasMonorepo: isMonorepo,
    monorepoPackages: packages.length > 0 ? packages : undefined,
    significantPaths,
    languages,
  };
}
