# Orchestrator Token-Cost Optimization

_Audit date: 2026-03-02 · Scope: `orchestrator.sh`, `parallel-orchestrator.sh`, `scripts/health-check.sh`_

---

## Summary

The pipeline uses LLM agents for seven distinct activities.  Three of those
activities are **fully or mostly deterministic** and do not need LLM reasoning
at all.  Two quick wins have already been shipped; one new quick win is
implemented in this analysis.  The remaining opportunities are flagged as
follow-up tasks.

| Stage | Current cost (est.) | Status |
|---|---|---|
| Task claiming & status | ~0 tokens | ✅ Already pure bash |
| Pre-implementation checks | 0 tokens | ✅ Already pure bash |
| Post-impl validation — typecheck gate | 0 tokens | ✅ Bash gate already live |
| Post-impl validation — **test gate** | saves ~60–120 K Opus tok/failure | ✅ **Implemented now** |
| Review agent (Opus) | 60–120 K tok/task | Keep — genuine LLM work |
| Commit & ship — `parallel-orchestrator.sh` | ~0 tokens | ✅ Already pure bash |
| Commit & ship — `orchestrator.sh` Agent 3 | 10–20 K Sonnet tok/task | 🔜 Follow-up TASK-107 |
| Health check Phase 2 (was Opus) | saves ~80% / run | ✅ **Downgraded to Sonnet** |
| Health check auto-fix trivial patterns | saves 1 health task / pattern | 🔜 Follow-up TASK-108 |
| Prompt boilerplate | minor | 🔜 Follow-up TASK-109 |

---

## Per-stage analysis

### 1. Task claiming & status management

**How it works today:**
`find_pending_tasks()` uses `find` + `grep` to list pending `.md` files sorted by
priority rank.  `claim_task()` is a `sed -i` one-liner.  `done_path_for()` is a
`sed` substitution.  No LLM involvement.

**Token cost:** 0 — pure bash throughout both orchestrators.

**Recommendation:** No change needed. ✅

---

### 2. Pre-implementation checks

**How it works today:**
The implement agent reads the task file and existing source files autonomously.
There is no separate bash pre-flight that validates file existence, grep patterns,
or other pre-conditions before calling the implement LLM.

**Token cost:** None outside the implement agent itself (unavoidable LLM work).

**Recommendation:**
For very simple tasks (single-file regex replacements, constant changes), a
future "trivial task detector" bash script could auto-apply changes without an
LLM call.  See follow-up TASK-108.

---

### 3. Post-implementation validation — typecheck gate

**How it works today:**
`pre_validate()` in both orchestrators runs `npm run typecheck` as pure bash
immediately after the implement agent finishes and _before_ the Opus review agent
is invoked.  If typecheck fails, Opus is never called.

**Token savings:**
~10 K–25 K Opus tokens per broken implementation (Opus reads all changed files,
runs checklist, attempts to write tests — much of which is wasted if the code
does not even compile).

**Status:** ✅ Already implemented. No change needed.

---

### 4. Post-implementation validation — test gate  _(NEW — implemented in this task)_

**Problem before this task:**
`pre_validate()` only ran `npm run typecheck`.  A broken implementation that
compiled cleanly but broke existing unit tests would still flow through to the
Opus review agent (~60–120 K tokens) before the failure was detected.

**Fix:**
Both orchestrators' `pre_validate()` functions now run `npm run test` as a
second bash gate immediately after the typecheck gate passes.  If existing tests
fail, the review agent is not invoked.

**Token savings (per occurrence):**
Worst-case Opus review call = 120 K tokens × $15/M input ≈ **$1.80 saved per
blocked review**.  At current task cadence (~15–20 tasks/day), even a 10%
failure rate saves ~$2–$3 per day / ~$60–$90/month in Opus spend.

**Trade-off:**
`npm run test` adds ~15–45 s of latency to the pre-validate gate.  This is
worthwhile: the alternative is paying Opus to detect the same failures.

---

### 5. Review agent (Opus)

**How it works today:**
Agent 2 is Claude Opus.  It reads the task file, the full review checklist, all
git-diff output, writes Vitest unit tests, runs typecheck + test suite, and
appends findings to ROADMAP.md.  This is the most token-expensive stage by
design — it is genuine LLM reasoning that cannot be replaced by bash.

**Token cost:** ~60–120 K input + ~10–20 K output per task.

**Reduction opportunities (within the review agent):**
- The review prompt currently embeds full file paths inline.  These are necessary
  for the agent to navigate the repo, so there is limited savings here.
- The ROADMAP.md append could be dropped (moved to JOURNEY.md in the ship stage
  or made optional) — would trim ~5 K input tokens per review.  Minor.

**Recommendation:** Keep Opus for this stage.  Apply the bash pre-validate gates
(stages 3 + 4) to ensure Opus is only invoked for code that is already clean.

---

### 6. Commit & ship — `parallel-orchestrator.sh`

**How it works today:**
`ship_task()` is entirely pure bash: `git add -A`, `git commit`, `git merge`,
`mv` task file, `git push`.  No LLM involvement.

**Token cost:** 0.  ✅ Already optimal.

---

### 7. Commit & ship — `orchestrator.sh` Agent 3  _(follow-up TASK-107)_

**How it works today:**
`orchestrator.sh` uses a full `run_agent "ship"` call (Sonnet model) for the
ship stage.  The prompt asks the agent to:
1. Run `npm run check` (bash command — no LLM reasoning needed)
2. Move the task file from pending → done (sed + mv — no LLM reasoning needed)
3. Update `docs/JOURNEY.md` with a brief paragraph (**LLM needed**)
4. Stage all changes (bash — no LLM reasoning needed)
5. Commit with a descriptive message (**LLM helpful**)
6. Push to GitHub (bash — no LLM reasoning needed)

Steps 1, 2, 4, 6 are pure bash that should be scripted.  Steps 3 and 5 require
LLM judgment.  The current implementation runs all six as a monolithic agent
call.

**Token cost:** ~10–20 K Sonnet tokens per task.

**Recommended fix (TASK-107):**
Convert `orchestrator.sh` Agent 3 to a hybrid:
- Bash script handles steps 1, 2, 4, 6 (same as `parallel-orchestrator.sh` `ship_task()`).
- A minimal LLM call handles only steps 3 + 5 with a much smaller prompt
  (~500 tokens of context vs. ~5 K today).
- Estimated savings: ~80% reduction in ship-stage token cost.

---

### 8. Health check Phase 2 — Claude semantic analysis  _(partially fixed in this task)_

**How it works today:**
`scripts/health-check.sh` Phase 2 calls `claude --model opus` with a prompt that
reads the **entire game source** (100+ TypeScript files) and outputs NDJSON
bug-finding results.  This is the single most expensive LLM call in the pipeline.

**Token cost:**
- Input: ~150 K–300 K tokens (full source read-through) × $15/M ≈ **$2.25–$4.50 per run**
- Runs nightly via cron → **~$65–$130/month** in Opus spend for health checks alone.

**Fix applied in this task:**
`MODEL` in `health-check.sh` changed from `"opus"` to `"sonnet"`.  Sonnet
($3/M vs $15/M) reduces Phase 2 cost by ~80% for equivalent quality on this
pattern-finding task.  Opus is not needed here: the analysis is pattern-matching
over source code, not creative reasoning.

**Estimated savings:** ~$52–$104/month.

**Further opportunity (TASK-108):**
Add a `--skip-claude` / `--deep` flag so the nightly cron runs Phase 1 (bash grep)
only, and Phase 2 is triggered manually or weekly.  Phase 1 alone catches
TODOs, empty functions, `any` types, and unsafe casts — the most actionable
categories.  Many of the Opus findings are low-severity style observations that
generate tasks the orchestrator then has to process.

---

### 9. Prompt size / boilerplate  _(minor — follow-up TASK-109)_

**Current state:**
Both implement and review prompts are lean (~10–25 lines) and already well
scoped.  Path variables (`$REPO_ROOT`, `$GAME_SRC`, `$TASK_FILE`) are injected
inline — necessary for agent navigation.

**Minor opportunity:**
The review agent's prompt embeds the full review checklist path but the agent
still has to read the file.  Instead of sending the checklist path, we could
inline the 70-line checklist directly in the prompt — saving one Read tool call
per review.  Estimated savings: ~2–3 K tokens / task (minor).  Not worth the
maintenance cost of keeping two copies of the checklist in sync.

**Recommendation:** No change for now.  The prompts are already tight.

---

## Quick wins implemented in this task

| # | Change | File(s) | Estimated savings |
|---|---|---|---|
| 1 | Add `npm run test` bash gate to `pre_validate()` | `orchestrator.sh`, `parallel-orchestrator.sh` | 60–120 K Opus tok per blocked review |
| 2 | Downgrade health-check Phase 2 from Opus to Sonnet | `scripts/health-check.sh` | ~$52–$104/month |

## Follow-up tasks flagged

| Task ID | Description | Estimated savings |
|---|---|---|
| TASK-107 | Convert `orchestrator.sh` Agent 3 (ship) to hybrid bash+minimal-LLM | ~80% of ship-stage tokens (~10–16K Sonnet tok/task) |
| TASK-108 | Make health-check Phase 2 opt-in (`--deep` flag), cron runs Phase 1 only | Phase 2 cost eliminated for nightly runs |
| TASK-109 | Trivial task auto-applier: bash scripts handle constant/regex changes without implement agent | Entire implement+review cycle (~100–200K tok/task) for eligible tasks |
