import type {
  ProjectTemplate,
  AgentRecommendation,
  RuleRecommendation,
} from "../types/index.js";

// ─────────────────────────────────────────────────────────────
// Shared agent definitions (used across templates)
// ─────────────────────────────────────────────────────────────

const AGENT_CODE_REVIEWER: AgentRecommendation = {
  id: "code-reviewer",
  name: "Code Reviewer",
  category: "review",
  confidence: 95,
  description:
    "Review code for best practices, common bugs, readability, maintainability, and type safety.",
  reason: "Code review catches bugs before they ship.",
  triggers: ["review", "check code", "PR review", "code quality", "refactor"],
  capabilities: [
    "Identify anti-patterns and code smells",
    "Suggest performance improvements",
    "Check type safety and error handling",
    "Enforce consistent coding style",
  ],
  relevantFiles: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
  estimatedTokens: 150,
};

const AGENT_TEST_WRITER: AgentRecommendation = {
  id: "test-writer",
  name: "Test Writer",
  category: "testing",
  confidence: 90,
  description:
    "Write and update tests. Generate unit tests, integration tests, and test fixtures following existing test patterns.",
  reason: "Tests ensure code quality and prevent regressions.",
  triggers: ["write test", "add tests", "test coverage", "unit test", "fix test"],
  capabilities: [
    "Generate test files",
    "Create test fixtures and mocks",
    "Improve test coverage for uncovered code",
    "Fix failing tests",
  ],
  relevantFiles: ["**/*.test.*", "**/*.spec.*", "**/__tests__/**"],
  estimatedTokens: 130,
};

const AGENT_SECURITY_AUDITOR: AgentRecommendation = {
  id: "security-auditor",
  name: "Security Auditor",
  category: "security",
  confidence: 80,
  description:
    "Audit code for security vulnerabilities. Check for XSS, CSRF, injection attacks, auth bypass, and exposed secrets.",
  reason: "Security review is critical for web applications.",
  triggers: ["security", "vulnerability", "XSS", "CSRF", "injection", "auth"],
  capabilities: [
    "Scan for OWASP Top 10 vulnerabilities",
    "Check authentication and authorization flows",
    "Detect hardcoded secrets and API keys",
    "Review dependency security advisories",
  ],
  relevantFiles: ["**/*.ts", "**/*.js", "**/.env*", "**/auth/**", "**/api/**"],
  estimatedTokens: 140,
};

const AGENT_COMPONENT_DESIGNER: AgentRecommendation = {
  id: "component-designer",
  name: "Component Designer",
  category: "ui",
  confidence: 85,
  description:
    "Design and build React components with Tailwind CSS. Create accessible, responsive, and reusable components.",
  reason: "Frontend framework detected — component patterns matter.",
  triggers: ["component", "UI", "design", "layout", "responsive", "accessible"],
  capabilities: [
    "Build React components",
    "Style with Tailwind CSS",
    "Ensure WCAG accessibility compliance",
    "Create responsive layouts",
  ],
  relevantFiles: ["**/*.tsx", "**/*.jsx", "**/*.css"],
  estimatedTokens: 130,
};

const AGENT_API_DEVELOPER: AgentRecommendation = {
  id: "api-developer",
  name: "API Developer",
  category: "api",
  confidence: 82,
  description:
    "Build and maintain API endpoints. Design RESTful APIs with proper validation, error handling, and documentation.",
  reason: "Backend framework detected.",
  triggers: ["API", "endpoint", "route", "handler", "REST", "middleware"],
  capabilities: [
    "Design API endpoints with proper HTTP methods",
    "Implement request validation and error handling",
    "Generate API documentation",
    "Create middleware and guards",
  ],
  relevantFiles: ["**/api/**", "**/routes/**", "**/handlers/**", "**/middleware/**"],
  estimatedTokens: 130,
};

const AGENT_DB_EXPERT: AgentRecommendation = {
  id: "db-expert",
  name: "Database Expert",
  category: "database",
  confidence: 85,
  description:
    "Manage database schema, migrations, and queries using Prisma. Optimize queries, handle migrations safely, and maintain data integrity.",
  reason: "Database ORM detected.",
  triggers: ["migration", "schema", "query", "database", "db", "seed"],
  capabilities: [
    "Create and modify Prisma schemas",
    "Generate safe migrations",
    "Optimize slow queries",
    "Create seed data and fixtures",
  ],
  relevantFiles: ["**/prisma/**", "**/migrations/**", "**/*.sql"],
  estimatedTokens: 130,
};

// ─────────────────────────────────────────────────────────────
// Shared rule definitions (used across templates)
// ─────────────────────────────────────────────────────────────

const RULE_TYPESCRIPT: RuleRecommendation = {
  id: "typescript-strict",
  title: "TypeScript Strict Mode Conventions",
  priority: "high",
  reason: "Detected: language",
  category: "language",
  appliesTo: ["**/*.ts", "**/*.tsx"],
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
};

const RULE_REACT: RuleRecommendation = {
  id: "react-patterns",
  title: "React Component Patterns",
  priority: "high",
  reason: "Detected: framework",
  category: "framework",
  appliesTo: ["**/*.tsx", "**/*.jsx"],
  content: [
    "## React Component Patterns",
    "- Use functional components with hooks (no class components)",
    "- Extract custom hooks for reusable stateful logic",
    "- Co-locate component, tests, and styles in the same directory",
    "- Use `React.memo()` only when profiling shows re-render issues",
    "- Prefer composition over prop drilling — use context sparingly",
    "- Name event handlers as `handleAction` (e.g., `handleSubmit`, `handleClick`)",
    "- Keep components under 200 lines — extract sub-components if larger",
  ].join("\n"),
};

const RULE_NEXTJS: RuleRecommendation = {
  id: "nextjs-patterns",
  title: "Next.js App Router Patterns",
  priority: "high",
  reason: "Detected: framework",
  category: "framework",
  appliesTo: ["**/*.tsx", "**/*.jsx"],
  content: [
    "## Next.js Conventions",
    "- Use Server Components by default, add 'use client' only when needed",
    "- Prefer server actions for mutations",
    "- Use Next.js Image component for all images",
    "- Implement loading.tsx and error.tsx for each route segment",
    "- Use the App Router for new routes (not pages/)",
    "- Co-locate route components with their data-fetching logic",
  ].join("\n"),
};

const RULE_TESTING: RuleRecommendation = {
  id: "testing-conventions",
  title: "Testing Conventions",
  priority: "high",
  reason: "Detected: testing",
  category: "testing",
  appliesTo: ["**/*.test.*", "**/*.spec.*", "**/__tests__/**"],
  content: [
    "## Testing Conventions",
    "- Follow AAA pattern: Arrange, Act, Assert",
    "- Name test files as `*.test.ts` (unit) or `*.spec.ts` (integration)",
    "- Each test should test ONE behavior — keep tests focused",
    "- Use descriptive test names: `it('should reject invalid email format')`",
    "- Mock external services, never hit real APIs in tests",
    "- Aim for >80% coverage on business logic, don't test implementation details",
    "- Create shared test fixtures in `tests/fixtures/` directory",
  ].join("\n"),
};

const RULE_GIT: RuleRecommendation = {
  id: "git-conventions",
  title: "Git & PR Conventions",
  priority: "medium",
  reason: "Detected: workflow",
  category: "workflow",
  appliesTo: ["**/*"],
  content: [
    "## Git Conventions",
    "- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`",
    "- Keep commits atomic — one logical change per commit",
    "- Write meaningful commit messages that explain WHY, not just WHAT",
    "- Create feature branches from `main` — never commit directly to `main`",
    "- Keep PRs focused and under 400 lines when possible",
  ].join("\n"),
};

const RULE_TAILWIND: RuleRecommendation = {
  id: "tailwind-conventions",
  title: "Tailwind CSS Patterns",
  priority: "medium",
  reason: "Detected: styling",
  category: "styling",
  appliesTo: ["**/*.tsx", "**/*.jsx", "**/*.css"],
  content: [
    "## Tailwind CSS Conventions",
    "- Use Tailwind utility classes — avoid custom CSS unless absolutely necessary",
    "- Extract repeated class combinations into components, not @apply",
    "- Use `cn()` utility for conditional class merging",
    "- Follow mobile-first responsive design (sm:, md:, lg:)",
    "- Use design tokens via tailwind.config for colors and spacing",
  ].join("\n"),
};

const RULE_ERROR_HANDLING: RuleRecommendation = {
  id: "error-handling",
  title: "Error Handling Patterns",
  priority: "medium",
  reason: "Detected: quality",
  category: "quality",
  appliesTo: ["**/*.ts", "**/*.js"],
  content: [
    "## Error Handling",
    "- Use typed error classes for different error categories",
    "- Always handle promise rejections — no unhandled promises",
    "- Return meaningful error messages to API consumers",
    "- Log errors with context (request ID, user ID, stack trace)",
    "- Never expose internal errors to users — map to safe error responses",
    "- Use try/catch at API boundaries, not around every function",
  ].join("\n"),
};

const RULE_PRISMA: RuleRecommendation = {
  id: "prisma-conventions",
  title: "Prisma Workflow",
  priority: "high",
  reason: "Detected: database",
  category: "database",
  appliesTo: ["**/prisma/**", "**/*.prisma"],
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
};

// ─────────────────────────────────────────────────────────────
// Template definitions
// ─────────────────────────────────────────────────────────────

const TEMPLATES: ProjectTemplate[] = [
  {
    id: "react-saas",
    name: "React SaaS",
    description: "React + TypeScript + Tailwind + Prisma + Auth",
    tags: ["react", "typescript", "tailwind", "prisma", "saas"],
    agents: [
      AGENT_CODE_REVIEWER,
      AGENT_TEST_WRITER,
      AGENT_COMPONENT_DESIGNER,
      AGENT_API_DEVELOPER,
      AGENT_DB_EXPERT,
      AGENT_SECURITY_AUDITOR,
    ],
    rules: [
      RULE_TYPESCRIPT,
      RULE_REACT,
      RULE_TESTING,
      RULE_TAILWIND,
      RULE_ERROR_HANDLING,
      RULE_PRISMA,
      RULE_GIT,
    ],
  },
  {
    id: "nextjs-app",
    name: "Next.js App",
    description: "Next.js 14+ with App Router, RSC, and API routes",
    tags: ["nextjs", "react", "typescript", "app-router"],
    agents: [
      AGENT_CODE_REVIEWER,
      AGENT_TEST_WRITER,
      AGENT_COMPONENT_DESIGNER,
      AGENT_API_DEVELOPER,
      AGENT_SECURITY_AUDITOR,
    ],
    rules: [
      RULE_TYPESCRIPT,
      RULE_REACT,
      RULE_NEXTJS,
      RULE_TESTING,
      RULE_TAILWIND,
      RULE_ERROR_HANDLING,
      RULE_GIT,
    ],
  },
  {
    id: "cli-tool",
    name: "CLI Tool",
    description: "Node.js CLI with Commander + TypeScript",
    tags: ["cli", "nodejs", "typescript", "commander"],
    agents: [AGENT_CODE_REVIEWER, AGENT_TEST_WRITER],
    rules: [RULE_TYPESCRIPT, RULE_TESTING, RULE_ERROR_HANDLING, RULE_GIT],
  },
];

/** Get a template by ID */
export function getTemplate(id: string): ProjectTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Get all available templates */
export function getAllTemplates(): ProjectTemplate[] {
  return TEMPLATES;
}
