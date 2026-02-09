# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is dotti

dotti is a CLI tool and library that scans codebases to detect their tech stack, generates intelligent agent/rule recommendations, and outputs optimized config files for AI coding tools (Claude Code, Cursor, Codex, Copilot, Windsurf, Gemini, Amp).

## Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Watch mode with tsx
npm run test           # Run tests in watch mode (vitest)
npm run test:run       # Run tests once
npm run lint           # ESLint on src/
npm start              # Run compiled CLI (dist/bin/dotti.js)
```

Run the CLI during development: `npx tsx src/cli.ts scan --dry-run`

Run a single test file: `npx vitest run tests/scanner.test.ts`

## Architecture

Three-stage pipeline: **Scanner → Recommender → Adapters**

### Scanner (`src/scanner/`)
Analyzes the target codebase. Three sub-scanners run in sequence:
- `package-scanner.ts` — reads package.json to detect frameworks, build tools, testing, databases, styling, linting (40+ detection rules)
- `file-tree-scanner.ts` — walks file tree for language stats, monorepo detection, significant patterns (Docker, CI, Terraform, etc.)
- `config-scanner.ts` — finds existing AI tool configs via glob patterns

Output: `ScanResult` containing `TechStack`, `FileTreeAnalysis`, `ExistingConfig[]`

### Recommender (`src/recommender/`)
Generates recommendations from scan results using template-based scoring:
- `agent-recommender.ts` — 8 agent templates, each with a `shouldRecommend(scan)` function returning 0-100 confidence. Agents below 40% are filtered out.
- `rule-recommender.ts` — 7 rule templates for coding conventions, conditionally generated based on detected tools

Output: `RecommendationResult` containing `AgentRecommendation[]`, `RuleRecommendation[]`

### Adapters (`src/adapters/`)
One adapter per supported tool, all extending `BaseAdapter` with a `generate(scan, recommendations)` method. Each adapter outputs files in the tool's native format, respecting tool-specific size limits (e.g., 6k chars for Windsurf, 32KB for Codex, 30k chars for Copilot).

The adapter registry in `src/adapters/index.ts` maps `ToolTarget` strings to adapter classes.

### CLI (`src/commands/`)
`scan.ts` is the main command, orchestrating the full pipeline. Other commands (`prune`, `fix`, `validate`, `init`) are stubs for v0.2.

### Types (`src/types/index.ts`)
Central type definitions including `ToolTarget` (union of 7 tool names), `TOOL_REGISTRY` (metadata per tool), and all scanner/recommender/adapter interfaces.

### Utils (`src/utils/`)
- `logger.ts` — colored output with chalk, tree printing, banners
- `fs-helpers.ts` — safe file reads, directory walking, file counting
- `tokens.ts` — token/size estimation (~4 chars per token heuristic), tool-specific limit checking

## Key Types

- `ToolTarget`: `"claude" | "cursor" | "codex" | "copilot" | "windsurf" | "gemini" | "amp"`
- `ScanResult`: full codebase analysis output
- `RecommendationResult`: agents + rules with confidence scores
- `AdapterOutput`: generated files with sizes per tool

## Public API

Exported from `src/index.ts`: `runScan`, `runRecommendations`, `generateConfigs`, `getAdapter`, `getAllAdapters`, `ALL_TARGETS`, `TOOL_REGISTRY`

## Adding a New Tool

1. Add the tool name to `ToolTarget` in `src/types/index.ts`
2. Add entry to `TOOL_REGISTRY` and `ALL_TARGETS`
3. Create `src/adapters/<tool>-adapter.ts` extending `BaseAdapter`
4. Register it in `src/adapters/index.ts`
5. Add config file patterns to `src/scanner/config-scanner.ts`
