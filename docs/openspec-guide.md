# GreenTD — OpenSpec Guide

How OpenSpec is set up in this project, what each file does, and how to use it going forward.

---

## What is OpenSpec?

OpenSpec is a CLI tool for spec-driven development. It provides a structured workflow for moving from idea → proposal → specs → design → implementation tasks. It lives at `openspec/` in the project root.

Install location: `/home/dmichael/.npm-global/bin/openspec`

---

## The Spec-Driven Workflow

OpenSpec's default schema (which this project uses) has four artifacts in order:

```
proposal.md  →  specs/*.md  →  design.md  →  tasks.md
```

| Artifact | Purpose | Status |
|---|---|---|
| `proposal.md` | Why this exists, what changes, who benefits, business value | ✅ Complete |
| `specs/*.md` | Per-capability requirement specs | ❌ Skipped |
| `design.md` | Technical design and architecture decisions | ❌ Skipped |
| `tasks.md` | Implementation checklist (101 tasks, checkbox format) | ✅ Complete |

Specs and design were skipped in favor of going straight to tasks. The proposal is detailed enough to stand in for both for now. If the project gains collaborators or complexity grows, writing per-capability specs would be worth revisiting.

---

## Directory Structure

```
openspec/
├── changes/
│   ├── archive/                        ← completed changes land here after openspec archive
│   └── greentd-project/                ← active change
│       ├── .openspec.yaml              ← schema: spec-driven, created: 2026-03-01
│       ├── README.md                   ← one-line description
│       ├── proposal.md                 ← full game design + business value analysis
│       └── tasks.md                    ← 101 tasks across 11 phases
└── specs/                              ← promoted specs appear here after archive
```

---

## Key Commands

```bash
# See all active changes and task progress
openspec list

# Read the full proposal in the terminal
openspec show greentd-project

# Get instructions for writing a specific artifact
openspec instructions proposal --change greentd-project
openspec instructions tasks --change greentd-project

# Create a new change
openspec new change <name> --description "what this is"

# Archive a completed change (moves it to changes/archive/, promotes specs)
openspec archive greentd-project

# Validate the change
openspec validate greentd-project
```

---

## How Task Progress is Tracked

OpenSpec parses `tasks.md` looking for checkboxes:
- `- [ ]` = pending
- `- [x]` = complete

`openspec list` reports the ratio. When you complete a task, edit `tasks.md` and change `[ ]` to `[x]`. That's the entire tracking mechanism — no database, no API calls.

```bash
# Current status
openspec list
# → greentd-project     0/101 tasks   ...
```

---

## The Proposal

`openspec/changes/greentd-project/proposal.md` contains:

- **Why** — the market gap and product motivation
- **What Changes** — full feature list
- **Tower Archetypes** — 6 towers with roles and cross-tower drawbacks
- **Replayability Design** — the three pillars (wave randomness, roguelike offers, multiple maps)
- **Business Value** — 4 user personas, the problem precisely stated, build priority, what-if-we-don't, success metrics
- **Capabilities** — 10 named capabilities that map to implementation areas
- **Impact** — dependencies, asset IP notes, storage, platform, future considerations

---

## The Tasks

`openspec/changes/greentd-project/tasks.md` contains 101 tasks across 11 phases. Each phase delivers working, playable software — not just infrastructure.

Phase order is intentional: each phase depends on the previous one being complete before it has value.

To update tasks as you complete them:
```
- [ ] 1.1 Initialize Vite + TypeScript project
```
becomes:
```
- [x] 1.1 Initialize Vite + TypeScript project
```

---

## How to Add a New Capability

If a new feature is agreed on that isn't in the proposal:

1. Update `proposal.md` — add to **What Changes** and **Capabilities**
2. Optionally write `specs/<capability-name>/spec.md` for formal requirements
3. Add tasks to `tasks.md` under a new phase or within an existing relevant phase
4. Run `./tasks/scripts/distribute.sh --phase <N>` to push tasks into the file-based system

---

## When to Archive

When all 101 tasks are checked off:

```bash
openspec archive greentd-project
```

This moves `changes/greentd-project/` to `changes/archive/` and promotes any specs to `openspec/specs/` for permanent reference. The tasks.md and proposal.md remain readable there.

---

## Relationship to the File-Based Task System

OpenSpec (`tasks.md`) is the **source of truth** for what needs to be built.

The file-based `tasks/` system is a **working view** — it distributes tasks into category folders (infrastructure / backend / frontend) and uses folder position (`pending/` → `in-progress/` → `done/`) to show work state.

When they diverge, trust OpenSpec. Run `./tasks/scripts/distribute.sh` to re-sync a phase if you've edited `tasks.md`.
