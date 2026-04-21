# Silicon Coliseum - Template Design Document

## Overview

Silicon Coliseum is built using a **skill-driven, state-machine-based development template** that treats `experiment/experiment.yaml` as the single source of truth for everything: what to build, how to structure it, and how to verify quality. Every decision flows from that one YAML file.

The system has two layers:

| Layer | Purpose | Location |
|-------|---------|----------|
| **The Application** | Silicon Coliseum itself (Next.js 15 web app) | `src/`, `supabase/`, `experiment/` |
| **The Template Framework** | AI-driven development lifecycle engine | `.claude/` |

---

## Core Architecture

```
experiment.yaml          (WHAT to build)
       |
       v
   Archetypes            (SHAPE of the product: web-app / service / cli)
       |
       v
   Stack Files           (HOW to build with each technology)
       |
       v
   Skills + States       (WHEN and in what ORDER to build)
       |
       v
   Agents                (WHO does the work)
       |
       v
   Gates + Hooks         (VERIFICATION at every step)
       |
       v
   Lifecycle Engine      (ORCHESTRATION: init -> execute -> finalize)
```

---

## 1. experiment.yaml - The Single Source of Truth

Located at `experiment/experiment.yaml`. Defines:

- **Identity**: name, owner, type (`web-app`), quality level (`mvp`)
- **Thesis & Hypotheses**: falsifiable statements with measurable thresholds
- **Behaviors**: user stories (b-01 through b-04) linked to hypotheses with acceptance tests
- **Golden Path**: the user journey that maps to pages and analytics events
- **Stack**: full technology declaration (Next.js, Supabase, Vercel, shadcn, Vitest)
- **Design System**: color tokens (oklch), visual effects, animations, interactive elements
- **Structure**: file-level specification of every component and API route
- **Business Logic**: auth flow, token gating, AI loop, leaderboard formula

**Rule 0 (Scope Lock)**: Nothing gets built that isn't in this file. The gate-keeper agent enforces this.

---

## 2. The Skill System

17 lifecycle skills handle the full development cycle:

| Skill | Purpose | Creates PR? |
|-------|---------|-------------|
| `/spec` | Transform idea into experiment.yaml | No |
| `/bootstrap` | Scaffold project from experiment.yaml | No (user runs /verify) |
| `/change` | Add features, fix bugs, modify code | Yes |
| `/verify` | Build + agent review + E2E tests | Embedded or standalone |
| `/deploy` | Deploy to Vercel + Supabase | Yes |
| `/review` | Automated review-fix loop | Yes |
| `/resolve` | Triage and fix GitHub issues | Yes |
| `/distribute` | Generate ad campaign config | Yes |
| `/iterate` | Analyze analytics, decide next step | No |
| `/retro` | End-of-experiment retrospective | No |
| `/rollback` | Emergency production rollback | No |
| `/teardown` | Destroy cloud infrastructure | No |
| `/audit` | Template structural quality analysis | No |
| `/upgrade` | Template sync and version update | Yes |
| `/observe` | Manual template observation filing | No |
| `/solve` | First-principles architectural analysis | No |
| `/optimize-prompt` | Standalone prompt optimization | No |

### Skill Anatomy

Each skill lives in `.claude/skills/<name>/` and contains:

```
skill.yaml            # Declarative manifest (branch pattern, states, agents, gates)
state-0-name.md       # First state
state-1-name.md       # Second state
...
orchestration.json    # Phase configuration (optional)
gates/                # Convention-based gate scripts (optional)
```

`skill.yaml` declares everything: which states exist, which agents to spawn (and when), which sub-skills to embed. The lifecycle engine derives 12 behaviors automatically from these declarations.

---

## 3. The State Machine Pattern

Every skill execution follows a strict state machine. Each state file has 6 required sections:

```
PRECONDITIONS    - Entry conditions (what must be true)
ACTIONS          - Business logic (what the LLM executes)
POSTCONDITIONS   - Completion criteria
VERIFY           - Executable bash command (owned by state-registry.json)
STATE TRACKING   - advance-state.sh call
NEXT             - Pointer to next state file
```

**JIT (Just-In-Time) Dispatch**: The LLM reads ONE state file at a time, executes it, marks it complete, then asks for the next. No lookahead. This keeps context focused and prevents the LLM from skipping steps.

**State Chain Enforcement**: The `state-completion-gate.sh` hook intercepts every `advance-state.sh` call and:
1. Verifies all prior states are complete (no skipping)
2. Runs the VERIFY command from `state-registry.json`
3. Checks for BLOCK verdicts from gate agents

---

## 4. The Three-Phase Lifecycle Engine

Every skill runs through three phases:

### Phase 1: INIT (`lifecycle-init.sh`)
- Parses `skill.yaml` into a runtime manifest
- Validates `experiment.yaml`
- Creates feature branch (if code-writing skill)
- Initializes context tracking (`run_id`, `branch`, `timestamp`)

### Phase 2: EXECUTE (`lifecycle-next.sh` loop)
```
loop:
  next_state = lifecycle-next.sh(skill)
  if next_state == "FINALIZE" -> go to Phase 3
  read state file -> execute ACTIONS -> advance-state.sh
```

### Phase 3: FINALIZE (`lifecycle-finalize.sh`)
- Re-runs all VERIFY commands (audit trail)
- Computes Q-score
- Runs epilogue (observation filing)
- Git delivery: commit, push, PR creation
- Auto-merge (with safety gates)

---

## 5. The Stack System

Stack files at `.claude/stacks/<category>/<value>.md` provide technology-specific guidance. They are loaded based on `experiment.yaml` values:

| experiment.yaml field | Stack file loaded |
|-----------------------|-------------------|
| `runtime: nextjs` | `.claude/stacks/framework/nextjs.md` |
| `database: supabase` | `.claude/stacks/database/supabase.md` |
| `ui: shadcn` | `.claude/stacks/ui/shadcn.md` |
| `hosting: vercel` | `.claude/stacks/hosting/vercel.md` |
| `testing: vitest` | `.claude/stacks/testing/vitest.md` |

Each stack file contains:
- Package install commands
- File templates with actual code
- Framework conventions and restrictions
- Known issues and workarounds
- Security patterns

To support a new technology, add a new stack file. No other changes needed.

---

## 6. The Archetype System

Three product shapes defined in `.claude/archetypes/`:

| Feature | web-app | service | cli |
|---------|---------|---------|-----|
| Pages (UI) | Yes | No | No |
| API routes | Yes | Yes | No |
| CLI commands | No | No | Yes |
| Client analytics | Yes | No | No |
| Server analytics | Yes | Yes | Yes |
| Playwright E2E | Yes | No | No |
| Design agents | Yes | No | No |

Silicon Coliseum uses the `web-app` archetype.

---

## 7. The Agent System

27 specialized agents in `.claude/agents/`, each with declared model, tools, and constraints:

| Agent | Role | Mode |
|-------|------|------|
| **gate-keeper** | Process compliance enforcement (read-only) | Sonnet |
| **implementer** | TDD-aware code implementation in worktrees | Opus |
| **visual-implementer** | Frontend implementation with design quality | Opus |
| **spec-reviewer** | Spec adherence verification (read-only) | Sonnet |
| **design-critic** | Visual quality scoring (0-10 per page) | Visual |
| **design-consistency-checker** | Cross-page visual consistency | Visual |
| **ux-journeyer** | Golden path walkthrough, dead-end detection | Visual |
| **security-attacker** | Vulnerability discovery | Sonnet |
| **security-defender** | Security control verification | Sonnet |
| **security-fixer** | Fix security issues from attacker+defender | Sonnet |
| **behavior-verifier** | Verify experiment.yaml behaviors are implemented | Sonnet |
| **observer** | Evaluate template-rooted issues | Sonnet |
| **scaffold-*** (8 agents) | Parallel bootstrap scaffolding | Various |
| **solve-critic** | Adversarial review of proposed solutions | Sonnet |

Agents are spawned by `skill.yaml` declarations:
```yaml
agents:
  implementer:
    after: ["9"]           # spawn after state 9
  gate-keeper:
    after: ["0"]           # spawn after state 0
  design-critic:
    requires_archetype: web-app  # only for web apps
```

---

## 8. The Gate System

Three gate types enforce quality at every level:

### Progression Gates
Hook: `state-completion-gate.sh`. Intercepts every state advance. Runs VERIFY, checks chain, checks BLOCK verdicts.

### Quality Gates
Hooks: `artifact-integrity-gate.sh`, `verify-report-gate.sh`. Validate JSON schema and cross-artifact consistency for `.runs/` artifacts.

### Delivery Gates
Inside `lifecycle-finalize.sh`. Final checks before commit:
- verify-report.md frontmatter is valid
- No BLOCK verdicts in `gate-verdicts/`
- observe-result.json exists
- build-result.json shows success

### Gate-Keeper Agent
Independent verification agent that runs named gates (G1-G6 for `/change`, BG1-BG4 for `/bootstrap`). Produces binary verdicts. Core doctrine: **"Observe, never trust"** - reads artifacts directly rather than trusting LLM claims.

---

## 9. PR-First Workflow

Every code change follows:

```
skill execution
    -> writes .runs/commit-message.txt, pr-title.txt, pr-body.md
    -> lifecycle-finalize.sh runs delivery gates
    -> git add -A && git commit && git push
    -> gh pr create (using PR template)
    -> auto-merge (with safety gates: migration guard, secret scan, build check)
```

Auto-merge safety gates:
1. **Migration guard**: skip merge if PR contains `supabase/migrations/`
2. **Secret scan**: skip merge if `gitleaks` finds secrets
3. **Build verification**: implied by PR existence

---

## 10. The Q-Score System

Quality is quantified per skill execution:

```
Q_skill = Gate x (1 - R)

Gate = 1 if build passes AND no hard gate failures
R = 0.3 x R_system + 0.7 x R_human

R_system = auto-remediation cost (how much agents had to fix)
R_human  = human intervention cost (failures + exhaustions)
```

Six quality dimensions: Q_build, Q_security, Q_design, Q_ux, Q_behavior, Q_spec.

---

## 11. Template Observation Loop

The most distinctive feature. After every skill execution, the epilogue evaluates whether fixes point to template-level issues:

```
Skill execution produces fixes
    -> Observer agent evaluates: is the root cause in a template file?
    -> If yes: files a GitHub issue on the upstream template repo
    -> Template improves -> future projects benefit
```

This creates a continuous feedback loop from project execution back to the template.

---

## 12. Typical Lifecycle Flow

```
/spec         ->  idea becomes experiment.yaml
/bootstrap    ->  experiment.yaml becomes a running app
/verify       ->  quality gate (agents review, test, score)
/change       ->  add features, fix bugs (embeds /verify)
/deploy       ->  push to production (Vercel + Supabase)
/distribute   ->  generate ad campaigns
/iterate      ->  analyze data, decide next move
/retro        ->  file structured feedback
/teardown     ->  destroy infrastructure
```

---

## 13. Design Principles

| Principle | Meaning |
|-----------|---------|
| **Declare, don't implement** | `skill.yaml` declares what a skill is; the engine derives behavior |
| **One skill = one folder** | Adding a skill requires zero infrastructure changes |
| **Code-driven, not memory-driven** | Deterministic ops (branching, delivery) are bash scripts, not LLM memory |
| **Observe, never trust** | Gate-keeper reads artifacts directly, never trusts LLM claims |
| **Best-effort epilogue** | Observation filing never blocks skill completion |
| **JIT dispatch** | LLM reads one state at a time, preventing skip-ahead |
| **Scope lock** | Nothing gets built that isn't in experiment.yaml |

---

## 14. Silicon Coliseum Application

The application itself, generated from this template:

- **Stack**: Next.js 15 (App Router), Supabase (DB + Auth), Vercel (hosting), shadcn/ui, Vitest
- **Product**: AI-powered meme coin paper trading arena
- **Key Pages**: Landing, Dashboard (agent management), Leaderboard, Share
- **Business Logic**: MetaMask wallet auth, SCT token gating on Arbitrum, AI trading agents, real-time market data, global P&L leaderboard
- **Design**: Dark-first glassmorphism UI with oklch color tokens, mesh gradients, particle effects, Framer Motion animations
