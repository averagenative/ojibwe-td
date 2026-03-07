# Ojibwe TD

[![Phaser 3](https://img.shields.io/badge/Phaser-3.90-blue?logo=phaser)](https://phaser.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-purple?logo=vite)](https://vite.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-blue?logo=capacitor)](https://capacitorjs.com/)
[![iOS](https://img.shields.io/badge/iOS-Ready-black?logo=apple)](https://developer.apple.com/)

> A mobile-first tower defense game inspired by Green TD (Warcraft 3) — built with love, rooted in Anishinaabe heritage.

<p align="center">
  <img src="game/ios/App/App/Assets.xcassets/AppIcon.appiconset/app-icon-1024.png" alt="Ojibwe TD" width="200">
</p>

<!-- TODO: add gameplay screenshot after mobile UI polish is complete -->

---

## What is this?

Ojibwe TD is a spiritual successor to the beloved Green TD map for Warcraft 3, created by the original Green TD community. It preserves what made Green TD special — aura synergies, meaningful tower composition, cross-tower mechanical tension — and layers on a roguelike upgrade system for "one more run" replayability. The creator is Ojibwe/Anishinaabe, and this project is a way to carry that pride into something built entirely from scratch. Full credit to the original Green TD creators; their work is the foundation this stands on.

Designed mobile-first for iOS (via Capacitor), but plays just as well in any browser — no install required for the web version.

---

## Features

| Feature | Status |
|---|---|
| **6 tower archetypes** — Cannon, Frost, Mortar, Poison, Tesla, Aura (passive) | ✅ |
| **BTD6-style upgrade trees** — 3 paths × 5 tiers per tower, path-lock at tier 3 | ✅ |
| **Wave system** — 20 waves, randomized creep mix per wave within difficulty band | ✅ |
| **Roguelike offers** — pick 1 of 3 between-wave upgrade cards, 40+ in pool | ✅ |
| **Meta-progression** — persistent unlock tree and stat bonus tree across runs | ✅ |
| **Multiple maps** — 9 maps + 5 challenge maps across 4 regions | ✅ |
| **Commander system** — run modifiers that shape your build from wave 1 | ✅ |
| **Boss waves** — unique bosses with distinct mechanics | ✅ |
| **Air combat** — flying creeps and anti-air tower upgrades | ✅ |
| **Gear & loot** — equippable items that modify tower stats | ✅ |
| **iOS native** — Capacitor build with touch controls and safe area support | ✅ |
| **Endless mode** — waves beyond 20 for veteran players | ✅ |
| **Seeded runs** — shareable run seeds for identical creep + offer draws | Planned |

---

## Getting Started

**Requirements:** Node 18+, any modern browser (Chrome, Firefox, Safari)

```bash
git clone https://github.com/averagenative/ojibwe-td.git
cd ojibwe-td/game
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — no account, no install, just the game.

### iOS Build

Requires Xcode 16+ and Capacitor CLI. See [`game/docs/ios-build-dependencies.md`](game/docs/ios-build-dependencies.md) for setup details.

```bash
cd game
npm run build:ios    # build + sync + open Xcode
```

---

## Asset Generation

Tower icons and UI art are generated via DALL-E 3 using a structured prompt pipeline. See [`docs/asset-generation.md`](docs/asset-generation.md) for the full workflow, including how to regenerate or add new assets.

---

## Contributing

Tasks live in the [`tasks/`](tasks/) directory, organized by domain and status (e.g. `tasks/frontend/pending/`). Each task follows the `TASK-XXX` naming convention and includes acceptance criteria.

The project uses an orchestrator workflow — an LLM agent picks up tasks from `tasks/pending/`, implements them in a git worktree, and merges on completion. If you want to contribute manually, pick a `pending` task, create a branch, implement the criteria, and open a PR.

---

## Credits & License

**Original Green TD (Warcraft 3 map):** Thank you to the Green TD creators — this game would not exist without your design vision. No assets, code, or Blizzard IP are used here; this is a clean-room reimplementation inspired by your work.

**Cultural acknowledgment:** The creator of this project is Ojibwe/Anishinaabe. The name and themes honour that heritage. Any Anishinaabe language, imagery, or cultural references are used with care and personal connection, not as decoration.

This project is a personal passion project. Source code is available for learning and inspiration.
