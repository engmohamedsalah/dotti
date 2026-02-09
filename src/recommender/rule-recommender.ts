import type { ScanResult, RuleRecommendation } from "../types/index.js";

// ─────────────────────────────────────────────────────────────
// Rule templates — project conventions and coding standards
// ─────────────────────────────────────────────────────────────

interface RuleTemplate {
  id: string;
  title: string;
  category: string;
  priority: "high" | "medium" | "low";
  shouldRecommend: (scan: ScanResult) => boolean;
  generate: (scan: ScanResult) => { content: string; appliesTo: string[] };
}

const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "typescript-strict",
    title: "TypeScript Strict Mode Conventions",
    category: "language",
    priority: "high",
    shouldRecommend: (scan) => scan.techStack.languages.some((l) => l.name === "TypeScript"),
    generate: () => ({
      content: [
        "## TypeScript Conventions",
        "- Use strict TypeScript (`strict: true` in tsconfig)",
        "- Prefer `interface` over `type` for object shapes that may be extended",
        "- Use `unknown` instead of `any` — narrow types with type guards",
        "- Always define return types for exported functions",
        "- Use `readonly` for properties that shouldn't be mutated",
        "- Prefer `const` assertions for literal types",
        "- Use discriminated unions for state management",
        "- Never use `@ts-ignore` — use `@ts-expect-error` with explanation",
      ].join("\n"),
      appliesTo: ["**/*.ts", "**/*.tsx"],
    }),
  },

  {
    id: "react-patterns",
    title: "React Component Patterns",
    category: "framework",
    priority: "high",
    shouldRecommend: (scan) => scan.techStack.frameworks.some((f) => f.name === "React" || f.name === "Next.js"),
    generate: (scan) => {
      const hasNextjs = scan.techStack.frameworks.some((f) => f.name === "Next.js");
      const lines = [
        "## React Component Patterns",
        "- Use functional components with hooks (no class components)",
        "- Extract custom hooks for reusable stateful logic",
        "- Co-locate component, tests, and styles in the same directory",
        "- Use `React.memo()` only when profiling shows re-render issues",
        "- Prefer composition over prop drilling — use context sparingly",
        "- Name event handlers as `handleAction` (e.g., `handleSubmit`, `handleClick`)",
        "- Keep components under 200 lines — extract sub-components if larger",
      ];
      if (hasNextjs) {
        lines.push(
          "- Use Server Components by default, add 'use client' only when needed",
          "- Prefer server actions for mutations",
          "- Use Next.js Image component for all images",
          "- Implement loading.tsx and error.tsx for each route segment"
        );
      }
      return {
        content: lines.join("\n"),
        appliesTo: ["**/*.tsx", "**/*.jsx"],
      };
    },
  },

  {
    id: "testing-conventions",
    title: "Testing Conventions",
    category: "testing",
    priority: "high",
    shouldRecommend: (scan) => scan.techStack.testing.length > 0,
    generate: (scan) => {
      const testFramework = scan.techStack.testing[0]?.name || "test framework";
      return {
        content: [
          "## Testing Conventions",
          `- Write tests using ${testFramework}`,
          "- Follow AAA pattern: Arrange, Act, Assert",
          "- Name test files as `*.test.ts` (unit) or `*.spec.ts` (integration)",
          "- Each test should test ONE behavior — keep tests focused",
          "- Use descriptive test names: `it('should reject invalid email format')`",
          "- Mock external services, never hit real APIs in tests",
          "- Aim for >80% coverage on business logic, don't test implementation details",
          "- Create shared test fixtures in `tests/fixtures/` directory",
        ].join("\n"),
        appliesTo: ["**/*.test.*", "**/*.spec.*", "**/__tests__/**"],
      };
    },
  },

  {
    id: "git-conventions",
    title: "Git & PR Conventions",
    category: "workflow",
    priority: "medium",
    shouldRecommend: () => true,
    generate: () => ({
      content: [
        "## Git Conventions",
        "- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`",
        "- Keep commits atomic — one logical change per commit",
        "- Write meaningful commit messages that explain WHY, not just WHAT",
        "- Create feature branches from `main` — never commit directly to `main`",
        "- Keep PRs focused and under 400 lines when possible",
      ].join("\n"),
      appliesTo: ["**/*"],
    }),
  },

  {
    id: "error-handling",
    title: "Error Handling Patterns",
    category: "quality",
    priority: "medium",
    shouldRecommend: (scan) =>
      scan.techStack.frameworks.some((f) =>
        ["Express", "Fastify", "Hono", "Next.js", "Nuxt", "Remix"].includes(f.name)
      ),
    generate: () => ({
      content: [
        "## Error Handling",
        "- Use typed error classes for different error categories",
        "- Always handle promise rejections — no unhandled promises",
        "- Return meaningful error messages to API consumers",
        "- Log errors with context (request ID, user ID, stack trace)",
        "- Never expose internal errors to users — map to safe error responses",
        "- Use try/catch at API boundaries, not around every function",
      ].join("\n"),
      appliesTo: ["**/*.ts", "**/*.js"],
    }),
  },

  {
    id: "prisma-conventions",
    title: "Prisma Workflow",
    category: "database",
    priority: "high",
    shouldRecommend: (scan) => scan.techStack.database.some((d) => d.name === "Prisma"),
    generate: () => ({
      content: [
        "## Prisma Conventions",
        "- Run `npx prisma generate` after any schema change",
        "- Use `npx prisma migrate dev` for development migrations",
        "- Never edit migration files after they've been applied",
        "- Use `@map` and `@@map` to keep DB column names snake_case",
        "- Define indexes for frequently queried fields",
        "- Use Prisma Client extensions for reusable query logic",
        "- Always use transactions for multi-step mutations",
      ].join("\n"),
      appliesTo: ["**/prisma/**", "**/*.prisma"],
    }),
  },

  {
    id: "tailwind-conventions",
    title: "Tailwind CSS Patterns",
    category: "styling",
    priority: "medium",
    shouldRecommend: (scan) => scan.techStack.styling.some((s) => s.name === "Tailwind CSS"),
    generate: (scan) => {
      const hasShadcn = scan.techStack.styling.some((s) => s.name === "shadcn/ui");
      const lines = [
        "## Tailwind CSS Conventions",
        "- Use Tailwind utility classes — avoid custom CSS unless absolutely necessary",
        "- Extract repeated class combinations into components, not @apply",
        "- Use `cn()` utility for conditional class merging",
        "- Follow mobile-first responsive design (sm:, md:, lg:)",
        "- Use design tokens via tailwind.config for colors and spacing",
      ];
      if (hasShadcn) {
        lines.push(
          "- Use shadcn/ui components as the base — customize via variants",
          "- Follow shadcn/ui patterns for new components",
          "- Install new shadcn components with `npx shadcn-ui add <component>`"
        );
      }
      return {
        content: lines.join("\n"),
        appliesTo: ["**/*.tsx", "**/*.jsx", "**/*.css"],
      };
    },
  },

  {
    id: "project-structure",
    title: "Project Structure",
    category: "architecture",
    priority: "medium",
    shouldRecommend: (scan) => scan.fileTree.totalFiles > 20,
    generate: (scan) => {
      const dirs = scan.fileTree.topLevelDirs.filter(
        (d) => !["node_modules", ".git", "dist", "build", ".next"].includes(d)
      );
      return {
        content: [
          "## Project Structure",
          `Top-level directories: ${dirs.join(", ")}`,
          "",
          "- Keep related files together (co-location over separation by type)",
          "- Use barrel exports (index.ts) for clean imports",
          "- Shared utilities go in `src/lib/` or `src/utils/`",
          "- Business logic goes in `src/services/` or domain directories",
          `- This is a ${scan.fileTree.hasMonorepo ? "monorepo" : "single-package"} project`,
          scan.fileTree.hasMonorepo
            ? `- Monorepo packages: ${scan.fileTree.monorepoPackages?.join(", ") || "detected"}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
        appliesTo: ["**/*"],
      };
    },
  },
];

/** Generate rule recommendations from scan results */
export function recommendRules(scan: ScanResult): RuleRecommendation[] {
  const recommendations: RuleRecommendation[] = [];

  for (const template of RULE_TEMPLATES) {
    if (!template.shouldRecommend(scan)) continue;

    const { content, appliesTo } = template.generate(scan);

    recommendations.push({
      id: template.id,
      title: template.title,
      content,
      priority: template.priority,
      reason: `Detected: ${template.category}`,
      appliesTo,
      category: template.category,
    });
  }

  return recommendations;
}
