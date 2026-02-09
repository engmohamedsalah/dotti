# dotti

> AI config, from your code.

Every AI coding tool needs a config file — CLAUDE.md, .cursorrules, AGENTS.md, GEMINI.md — but **no tool tells you what to put in it**. So you copy from blog posts, install 75 agents you don't need, and waste half your context window.

**dotti** is an interactive setup wizard that scans your codebase, lets you pick which agents and rules your project actually needs, and generates optimized configs for every AI tool you use.

## Quick Start

```bash
npx dotti
```

That's it. The wizard walks you through everything:

```
  ◆  dotti  AI config, from your code

  ✓ Tech stack detected
  ┌───────────────────────────────────────────┐
  │ my-saas-app — 142 files scanned           │
  │   ● TypeScript (142 files)                │
  │   ● React 18.3 + Next.js 14              │
  │   ● Vitest (unit) + Playwright (e2e)      │
  │   ● Prisma + PostgreSQL                   │
  │   ● Tailwind CSS + shadcn/ui              │
  └───────────────────────────────────────────┘

  ◆ Which AI coding tools do you use?
    ☑ Claude Code       CLAUDE.md
    ☑ Cursor            .cursor/rules/*.mdc
    ☐ OpenAI Codex      AGENTS.md
    ☑ GitHub Copilot    .github/instructions/
    ☐ Windsurf          .windsurfrules
    ☐ Gemini CLI        GEMINI.md
    ☐ Amp               AGENTS.md + .amp/

  ◆ Recommended agents:
    ☑ Code Reviewer      ██████████ 95%
    ☑ Test Writer        █████████░ 88%
    ☑ Database Expert    ████████░░ 85%
    ☑ Security Auditor   ████████░░ 78%
    ☑ Component Designer ███████░░░ 72%
    ☐ Docs Writer        █████░░░░░ 55%

  ◆ Ready to generate?
    ● Generate files
    ○ Dry run
    ○ Cancel

  ✓ 18 files generated
  ┌───────────────────────────────────────────┐
  │ 18 files · 3 tools · 5 agents · 6 rules  │
  │ ~4.2k tokens total context footprint      │
  └───────────────────────────────────────────┘

  Happy coding! — dotti.dev
```

## Why dotti?

**Know what you need.** dotti scans your actual code — not a template. It detects React 18 + Prisma + Vitest + Tailwind and recommends agents with confidence scores. You see WHY each was chosen.

**Save your context window.** Most developers load 75 agents (53k tokens before "hi"). dotti recommends 5. That's 30–70% of your context window back for actual coding.

**One wizard, all tools configured.** Pick which tools you use, dotti generates native configs for each — YAML frontmatter for Claude, .mdc globs for Cursor, size-validated for Windsurf's 6k limit.

**You control everything.** Toggle agents on/off. Choose which rules to include. Preview before writing. Edit after. It's your config.

## Supported Tools

| Tool | Config Files Generated | Limits |
|------|----------------------|--------|
| **Claude Code** | `CLAUDE.md` + `.claude/agents/*.md` | — |
| **Cursor** | `.cursor/rules/*.mdc` + `AGENTS.md` | Glob-based activation |
| **OpenAI Codex** | `AGENTS.md` | 32KB max |
| **GitHub Copilot** | `.github/copilot-instructions.md` + agents | 30k chars/file |
| **Windsurf** | `.windsurfrules` | 6k chars (auto-truncated) |
| **Gemini CLI** | `GEMINI.md` | Root-level only |
| **Amp** | `AGENTS.md` + `.amp/settings.json` | — |

## Commands

### `npx dotti` (default)
Interactive setup wizard. Scans → choose tools → toggle agents → pick rules → preview → generate.

### `npx dotti scan` (non-interactive)
For CI/scripts. Generates configs without prompts.

```bash
dotti scan                      # All tools, all recommendations
dotti scan --target claude      # Claude Code only
dotti scan --dry-run            # Preview without writing
dotti scan --force              # Overwrite existing configs
dotti scan --verbose            # Detailed logging
```

### Coming in v0.2
- `dotti prune` — Find and remove unused agent configs
- `dotti fix` — Fix agent routing conflicts
- `dotti validate` — Check config health across all tools
- `dotti init --template` — Start from project templates

## Programmatic Usage

```typescript
import { runScan, runRecommendations, generateConfigs, ALL_TARGETS } from "dotti";

const scan = await runScan("/path/to/project");
const recommendations = runRecommendations(scan);
const outputs = generateConfigs(ALL_TARGETS, scan, recommendations);

for (const output of outputs) {
  console.log(`${output.tool}: ${output.files.length} files`);
}
```

## Architecture

```
dotti/
├── src/
│   ├── scanner/          # Codebase analysis
│   │   ├── package-scanner   # package.json + config file detection
│   │   ├── file-tree-scanner # File structure + language analysis
│   │   └── config-scanner    # Existing AI config detection
│   ├── recommender/      # Intelligence engine
│   │   ├── agent-recommender # 9 agent templates with confidence scoring
│   │   └── rule-recommender  # 8 rule templates with priority levels
│   ├── adapters/         # Output generators (one per tool)
│   │   ├── claude, cursor, codex, copilot
│   │   ├── windsurf, gemini, amp
│   │   └── each respects tool-specific formats & limits
│   ├── commands/
│   │   ├── wizard.ts     # Interactive setup wizard (default)
│   │   └── scan.ts       # Non-interactive mode (CI)
│   └── utils/            # Logger, token estimation, fs helpers
└── website/              # Landing page (dotti.dev)
```

## Contributing

```bash
git clone https://github.com/your-org/dotti
cd dotti
npm install
npm run dev
```

## License

MIT
