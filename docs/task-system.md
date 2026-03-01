# GreenTD — Task System Guide

How the file-based task coordination system works and how to use it day-to-day.

---

## Overview

Two complementary systems track implementation work:

| System | File | Purpose |
|---|---|---|
| **OpenSpec** | `openspec/changes/greentd-project/tasks.md` | Source of truth; 101 tasks in checkbox format; `openspec list` reports progress |
| **File-based** | `tasks/` directory | Working view; tasks organized by category and state (pending → in-progress → done) |

The file-based system was generated from the OpenSpec tasks.md using `distribute.sh`. When in doubt, trust OpenSpec.

---

## Directory Structure

```
tasks/
├── _template.md                  ← copy to create tasks manually
├── scripts/
│   ├── distribute.sh             ← parses openspec tasks.md → creates task files
│   └── new-task.sh               ← creates individual ad-hoc tasks
├── infrastructure/
│   ├── pending/
│   ├── in-progress/
│   └── done/
├── backend/
│   ├── pending/
│   ├── in-progress/
│   └── done/
└── frontend/
    ├── pending/
    ├── in-progress/
    └── done/
```

**State is communicated by folder position.** A task file lives in exactly one folder at a time.

---

## Category Mapping

| Category | What it covers | OpenSpec phases |
|---|---|---|
| `infrastructure` | Build tooling, Vite config, TypeScript setup, asset pipeline | Phase 1 |
| `backend` | Game logic, systems, data, state management | Phases 2–6, 9 |
| `frontend` | UI, scenes, HUD, visual effects, audio, polish | Phases 7–8, 10–11 |

---

## Task File Format

Each task file has a YAML frontmatter block followed by markdown sections:

```markdown
---
id: TASK-01
title: Project Scaffold
status: pending
category: infrastructure
phase: 1
openspec_ref: "Phase 1"
depends_on: []
created: 2026-02-28
---

## Description

What needs to be built and why.

## Acceptance Criteria

- [ ] Initialize Vite + TypeScript project
- [ ] Install Phaser 3
- [ ] ...

## Notes

Any blockers, links, or context.
```

---

## Day-to-Day Workflow

### Starting a task

```bash
mv tasks/infrastructure/pending/phase-1-project-scaffold.md \
   tasks/infrastructure/in-progress/
```

Open the file, read the acceptance criteria, start building.

### Completing a task

Check off criteria in the file as you finish them, then:

```bash
mv tasks/infrastructure/in-progress/phase-1-project-scaffold.md \
   tasks/infrastructure/done/
```

Also mark the corresponding items as `[x]` in `openspec/changes/greentd-project/tasks.md` so the OpenSpec counter stays current.

### Checking what's in flight

```bash
# Everything in progress right now
find tasks -path "*/in-progress/*.md" | sort

# Everything still pending
find tasks -path "*/pending/*.md" | sort

# Everything completed
find tasks -path "*/done/*.md" | sort

# Full picture
find tasks -name "*.md" ! -name "_template.md" | sort
```

---

## Adding a One-Off Task

For tasks that weren't in the original openspec breakdown — bug fixes, experiments, spikes:

```bash
./tasks/scripts/new-task.sh \
  --title "Investigate Phaser sprite pooling performance" \
  --category backend \
  --phase 3
```

This creates a task file in `tasks/backend/pending/` with a generated ID and slug filename. Open the file and fill in the Description and Acceptance Criteria sections.

---

## Re-Seeding from OpenSpec

If you edit `openspec/changes/greentd-project/tasks.md` (add tasks, split phases, etc.), re-run distribute to sync:

```bash
# Re-generate all phases (will overwrite existing pending files)
./tasks/scripts/distribute.sh

# Re-generate a single phase only
./tasks/scripts/distribute.sh --phase 6
```

**Warning:** distribute overwrites files in `pending/`. It will not touch files in `in-progress/` or `done/`.

---

## Current File Inventory

Generated on project initialization. All files start in `pending/`.

| File | Category | Phase | Tasks |
|---|---|---|---|
| `phase-1-project-scaffold.md` | infrastructure | 1 | 6 |
| `phase-2-walking-skeleton.md` | backend | 2 | 9 |
| `phase-3-core-td-loop.md` | backend | 3 | 10 |
| `phase-4-tower-archetypes.md` | backend | 4 | 9 |
| `phase-5-wave-system.md` | backend | 5 | 9 |
| `phase-6-tower-upgrades.md` | backend | 6 | 14 |
| `phase-7-roguelike-offers.md` | frontend | 7 | 9 |
| `phase-8-run-loop-game-states.md` | frontend | 8 | 7 |
| `phase-9-meta-progression.md` | frontend | 9 | 9 |
| `phase-10-second-map.md` | frontend | 10 | 6 |
| `phase-11-polish-balance.md` | frontend | 11 | 13 |

Plus one manually added task: `write-end-to-end-test-for-wave-completion-flow.md` in `backend/pending/`.

---

## Scripts Reference

### `distribute.sh`

Parses `openspec/changes/greentd-project/tasks.md` and creates one markdown task file per phase in the correct category folder.

```bash
./tasks/scripts/distribute.sh              # all phases
./tasks/scripts/distribute.sh --phase 3   # single phase
```

### `new-task.sh`

Creates a single task file from the template.

```bash
./tasks/scripts/new-task.sh \
  --title "Task title" \
  --category backend|frontend|infrastructure \
  [--phase N]
```

Options:
- `--title` (required) — task name; becomes the filename slug
- `--category` (required) — one of `backend`, `frontend`, `infrastructure`
- `--phase` (optional) — which phase this relates to (default: 0)
