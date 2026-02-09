import type { ScanResult, AgentRecommendation, AgentCategory } from "../types/index.js";
import { estimateTokens } from "../utils/tokens.js";

// ─────────────────────────────────────────────────────────────
// Agent templates — each defines when to recommend and what content
// ─────────────────────────────────────────────────────────────

interface AgentTemplate {
  id: string;
  name: string;
  category: AgentCategory;
  /** Return confidence 0-100, or 0 to skip */
  shouldRecommend: (scan: ScanResult) => number;
  /** Generate description and details based on scan context */
  generate: (scan: ScanResult) => Omit<AgentRecommendation, "id" | "name" | "confidence" | "category" | "estimatedTokens">;
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  // ── Code Reviewer ──
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    category: "review",
    shouldRecommend: () => 90, // Always useful
    generate: (scan) => {
      const langs = scan.techStack.languages.map((l) => l.name).join(", ");
      const frameworks = scan.techStack.frameworks.map((f) => f.name).join(", ");
      return {
        description: `Review code for ${langs} best practices${frameworks ? `, ${frameworks} patterns` : ""}, and common bugs. Focus on readability, maintainability, and type safety.`,
        reason: `Core languages: ${langs}. Code review catches bugs before they ship.`,
        triggers: ["review", "check code", "PR review", "code quality", "refactor"],
        capabilities: [
          "Identify anti-patterns and code smells",
          "Suggest performance improvements",
          "Check type safety and error handling",
          "Enforce consistent coding style",
        ],
        relevantFiles: scan.techStack.languages.flatMap((l) => l.extensions.map((e) => `**/*${e}`)),
      };
    },
  },

  // ── Test Writer ──
  {
    id: "test-writer",
    name: "Test Writer",
    category: "testing",
    shouldRecommend: (scan) => {
      if (scan.techStack.testing.length > 0) return 88;
      if (scan.techStack.frameworks.length > 0) return 70;
      return 50;
    },
    generate: (scan) => {
      const testTools = scan.techStack.testing.map((t) => t.name);
      const testFramework = testTools.length > 0 ? testTools.join(" + ") : "your testing framework";
      return {
        description: `Write and update tests using ${testFramework}. Generate unit tests, integration tests, and test fixtures following existing test patterns.`,
        reason: `Testing tools detected: ${testTools.join(", ") || "none (recommendation for quality)"}`,
        triggers: ["write test", "add tests", "test coverage", "unit test", "integration test", "fix test"],
        capabilities: [
          `Generate ${testTools.join("/")} test files`,
          "Create test fixtures and mocks",
          "Improve test coverage for uncovered code",
          "Fix failing tests",
        ],
        relevantFiles: ["**/*.test.*", "**/*.spec.*", "**/__tests__/**", "**/tests/**"],
      };
    },
  },

  // ── Database Expert ──
  {
    id: "db-expert",
    name: "Database Expert",
    category: "database",
    shouldRecommend: (scan) => {
      if (scan.techStack.database.length > 0) return 85;
      if (scan.fileTree.significantPaths.includes("Database migrations")) return 80;
      return 0;
    },
    generate: (scan) => {
      const dbs = scan.techStack.database.map((d) => d.name);
      return {
        description: `Manage database schema, migrations, and queries using ${dbs.join(", ")}. Optimize queries, handle migrations safely, and maintain data integrity.`,
        reason: `Database tools detected: ${dbs.join(", ")}`,
        triggers: ["migration", "schema", "query", "database", "db", "seed", "index"],
        capabilities: [
          `Create and modify ${dbs.join("/")} schemas`,
          "Generate safe migrations",
          "Optimize slow queries",
          "Create seed data and fixtures",
        ],
        relevantFiles: ["**/prisma/**", "**/drizzle/**", "**/migrations/**", "**/seeds/**", "**/*.sql"],
      };
    },
  },

  // ── Security Auditor ──
  {
    id: "security-auditor",
    name: "Security Auditor",
    category: "security",
    shouldRecommend: (scan) => {
      const hasApi = scan.techStack.frameworks.some((f) =>
        ["Express", "Fastify", "Hono", "Next.js", "Nuxt", "Remix", "Astro"].includes(f.name)
      );
      if (hasApi) return 78;
      return 45;
    },
    generate: (scan) => {
      const frameworks = scan.techStack.frameworks.map((f) => f.name);
      return {
        description: `Audit code for security vulnerabilities specific to ${frameworks.join(", ")}. Check for XSS, CSRF, injection attacks, auth bypass, insecure dependencies, and exposed secrets.`,
        reason: `Web framework detected: ${frameworks.join(", ")}. Security review is critical.`,
        triggers: ["security", "vulnerability", "XSS", "CSRF", "injection", "auth", "CVE", "secrets"],
        capabilities: [
          "Scan for OWASP Top 10 vulnerabilities",
          "Check authentication and authorization flows",
          "Detect hardcoded secrets and API keys",
          "Review dependency security advisories",
        ],
        relevantFiles: ["**/*.ts", "**/*.js", "**/.env*", "**/auth/**", "**/api/**"],
      };
    },
  },

  // ── UI/Component Designer ──
  {
    id: "component-designer",
    name: "Component Designer",
    category: "ui",
    shouldRecommend: (scan) => {
      const hasFrontend = scan.techStack.frameworks.some((f) =>
        ["React", "Vue", "Svelte", "Angular", "Next.js", "Nuxt", "SvelteKit", "Remix", "Astro"].includes(f.name)
      );
      const hasStyling = scan.techStack.styling.length > 0;
      if (hasFrontend && hasStyling) return 82;
      if (hasFrontend) return 68;
      return 0;
    },
    generate: (scan) => {
      const framework = scan.techStack.frameworks.find((f) =>
        ["React", "Vue", "Svelte", "Angular"].includes(f.name)
      );
      const styling = scan.techStack.styling.map((s) => s.name);
      return {
        description: `Design and build ${framework?.name || "UI"} components using ${styling.join(" + ") || "CSS"}. Create accessible, responsive, and reusable components following project conventions.`,
        reason: `Frontend: ${framework?.name || "detected"}, Styling: ${styling.join(", ") || "detected"}`,
        triggers: ["component", "UI", "design", "layout", "responsive", "accessible", "style"],
        capabilities: [
          `Build ${framework?.name || "UI"} components`,
          `Style with ${styling.join("/") || "CSS"}`,
          "Ensure WCAG accessibility compliance",
          "Create responsive layouts",
        ],
        relevantFiles: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.css"],
      };
    },
  },

  // ── API Developer ──
  {
    id: "api-developer",
    name: "API Developer",
    category: "api",
    shouldRecommend: (scan) => {
      const hasBackend = scan.techStack.frameworks.some((f) =>
        ["Express", "Fastify", "Hono", "Next.js", "Nuxt", "Remix"].includes(f.name)
      );
      if (hasBackend) return 80;
      return 0;
    },
    generate: (scan) => {
      const backend = scan.techStack.frameworks.find((f) =>
        ["Express", "Fastify", "Hono", "Next.js"].includes(f.name)
      );
      return {
        description: `Build and maintain API endpoints using ${backend?.name || "your framework"}. Design RESTful or GraphQL APIs with proper validation, error handling, and documentation.`,
        reason: `Backend framework: ${backend?.name || "detected"}`,
        triggers: ["API", "endpoint", "route", "handler", "REST", "GraphQL", "middleware"],
        capabilities: [
          "Design API endpoints with proper HTTP methods",
          "Implement request validation and error handling",
          "Generate API documentation",
          "Create middleware and guards",
        ],
        relevantFiles: ["**/api/**", "**/routes/**", "**/handlers/**", "**/middleware/**"],
      };
    },
  },

  // ── DevOps / CI-CD ──
  {
    id: "devops-helper",
    name: "DevOps Helper",
    category: "devops",
    shouldRecommend: (scan) => {
      if (scan.techStack.deployment.length > 0) return 72;
      return 0;
    },
    generate: (scan) => {
      const tools = scan.techStack.deployment.map((d) => d.name);
      return {
        description: `Manage CI/CD pipelines, Docker configurations, and deployment using ${tools.join(", ")}. Optimize build times, configure environments, and handle infrastructure as code.`,
        reason: `Deployment tools: ${tools.join(", ")}`,
        triggers: ["deploy", "CI/CD", "pipeline", "Docker", "build", "release", "environment"],
        capabilities: [
          `Configure ${tools.join("/")} pipelines`,
          "Optimize Docker builds",
          "Manage environment variables",
          "Set up deployment workflows",
        ],
        relevantFiles: [".github/workflows/**", "**/Dockerfile*", "**/docker-compose*", "**/terraform/**", "**/*.yaml"],
      };
    },
  },

  // ── Performance Optimizer ──
  {
    id: "perf-optimizer",
    name: "Performance Optimizer",
    category: "perf",
    shouldRecommend: (scan) => {
      const hasFrontend = scan.techStack.frameworks.some((f) =>
        ["React", "Next.js", "Vue", "Nuxt", "Svelte", "SvelteKit"].includes(f.name)
      );
      if (hasFrontend && scan.fileTree.totalFiles > 50) return 65;
      return 0;
    },
    generate: (scan) => {
      const framework = scan.techStack.frameworks[0];
      return {
        description: `Optimize performance for ${framework?.name || "your app"}. Analyze bundle size, identify render bottlenecks, optimize images, and improve Core Web Vitals.`,
        reason: `${framework?.name || "Frontend"} app with ${scan.fileTree.totalFiles} files — performance matters at scale.`,
        triggers: ["performance", "slow", "optimize", "bundle", "lazy load", "cache", "Core Web Vitals"],
        capabilities: [
          "Identify and fix render bottlenecks",
          "Optimize bundle size and code splitting",
          "Improve Core Web Vitals scores",
          "Set up caching strategies",
        ],
        relevantFiles: ["**/*.tsx", "**/*.jsx", "**/next.config.*", "**/vite.config.*"],
      };
    },
  },

  // ── Documentation Writer ──
  {
    id: "docs-writer",
    name: "Documentation Writer",
    category: "docs",
    shouldRecommend: (scan) => {
      if (scan.fileTree.totalFiles > 30) return 55;
      return 30;
    },
    generate: (scan) => {
      return {
        description: `Write and maintain project documentation including README, API docs, guides, and inline code comments. Follow the project's existing documentation style.`,
        reason: `Project has ${scan.fileTree.totalFiles} files — documentation helps onboarding.`,
        triggers: ["document", "README", "docs", "comment", "explain", "guide", "API docs"],
        capabilities: [
          "Generate comprehensive README files",
          "Write API documentation",
          "Add JSDoc/TSDoc comments to code",
          "Create onboarding guides",
        ],
        relevantFiles: ["**/*.md", "**/docs/**", "README*"],
      };
    },
  },
];

// ─────────────────────────────────────────────────────────────
// Recommendation engine
// ─────────────────────────────────────────────────────────────

export function recommendAgents(scan: ScanResult): AgentRecommendation[] {
  const recommendations: AgentRecommendation[] = [];

  for (const template of AGENT_TEMPLATES) {
    const confidence = template.shouldRecommend(scan);
    if (confidence < 40) continue; // Skip low-confidence recommendations

    const details = template.generate(scan);
    const description = details.description;

    recommendations.push({
      id: template.id,
      name: template.name,
      confidence,
      category: template.category,
      estimatedTokens: estimateTokens(description + details.capabilities.join(" ")),
      ...details,
    });
  }

  // Sort by confidence descending
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}
