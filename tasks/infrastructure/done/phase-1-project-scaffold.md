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

Phase 1 of the GreenTD implementation. See proposal.md for full context.

## Acceptance Criteria

- [ ] Initialize Vite + TypeScript project (`npm create vite`, configure tsconfig)
- [ ] Install and configure Phaser 3 as a dependency
- [ ] Create folder structure: `src/{scenes,entities,systems,data,ui,meta}`
- [ ] Create `BootScene` (preload converted PNG assets from `/converted_assets/`)
- [ ] Create `MainMenuScene` (title, Start button, placeholder layout)
- [ ] Wire scene manager: Boot → MainMenu on load complete

## Notes

See openspec/changes/greentd-project/tasks.md Phase 1 for the full task list.
