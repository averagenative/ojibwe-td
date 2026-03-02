---
id: TASK-036
title: GitHub README for Ojibwe TD
status: done
priority: medium
phase: polish
---

# GitHub README for Ojibwe TD

## Goal

Write a polished `README.md` at the repo root that gives visitors a clear picture of what Ojibwe TD is, how to play it, how to run it locally, and how to contribute.

## Acceptance Criteria

- [ ] `README.md` exists at `/home/dmichael/projects/greentd/README.md`
- [ ] Hero section: game name, one-line description, screenshot or GIF placeholder
- [ ] "What is this?" — 2–3 sentence description connecting it to Green TD lineage and Ojibwe/Anishinaabe theming; credit original Green TD creators
- [ ] Feature list: tower archetypes, wave system, commander system, roguelike offers, ascension, endless mode, seeded runs
- [ ] Tech stack badge section: Phaser 3, TypeScript, Vite
- [ ] **Getting started** section:
  - `git clone`, `cd game`, `npm install`, `npm run dev`
  - Notes: Node 18+, browser (Chrome/Firefox/Safari), runs on `localhost:5173`
- [ ] **Asset generation** section: brief blurb pointing to `docs/asset-generation.md` for generating art via DALL-E 3
- [ ] **Contributing** section: mention `tasks/` directory, orchestrator workflow, `TASK-XXX` naming
- [ ] License / credits section: credit original Green TD (WC3 map) creators; note Ojibwe/Anishinaabe cultural inspiration
- [ ] Tone: warm, proud, concise — this is a personal passion project

## Notes

- Do NOT put API keys, `.env` contents, or internal scripts paths in the README
- Keep it under ~150 lines — quality over length
- Use GitHub-flavored markdown: badges, code blocks, collapsible sections if helpful
- Screenshot placeholder: `![Screenshot](docs/screenshot.png)` (image doesn't need to exist yet)
