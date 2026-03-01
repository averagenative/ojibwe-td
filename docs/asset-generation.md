# Ojibwe TD — Asset Generation Guide

How to generate all game art via DALL-E 3, process it, and drop it into the game.

---

## 1. Add Your API Keys

Edit the `.env` file at the repo root (it's gitignored — never committed):

```
/home/dmichael/projects/greentd/.env
```

Fill in your keys:

```
OPENAI_API_KEY=sk-...        ← from https://platform.openai.com/api-keys
REMOVEBG_API_KEY=...          ← from https://www.remove.bg/api (free: 50/month)
```

Once these are in `.env`, Claude Code and the scripts will pick them up automatically — no need to export anything in your terminal.

---

## 2. Generate All Images

```bash
cd /home/dmichael/projects/greentd
node scripts/generate-assets.js
```

Generates 23 images via DALL-E 3 HD. Takes ~5 minutes (rate-limited to ~5 images/min).

**Options:**

```bash
# Regenerate everything from scratch
node scripts/generate-assets.js --force

# Generate one category only
node scripts/generate-assets.js --only towers
node scripts/generate-assets.js --only commanders
node scripts/generate-assets.js --only creeps
node scripts/generate-assets.js --only tiles
```

**Output locations:**

| Category | Output directory | Game size |
|----------|-----------------|-----------|
| Tower icons (6) | `game/public/assets/icons/` | 64×64 |
| Commander portraits (5) | `game/public/assets/portraits/` | 96×96 |
| Creep sprites (8) | `game/public/assets/sprites/` | 48×48 |
| Map tiles (4) | `game/public/assets/tiles/` | 64×64 |

---

## 3. Remove Backgrounds

DALL-E 3 generates images on white backgrounds. Strip them to get transparent PNGs:

```bash
node scripts/remove-backgrounds.js

# Or one category:
node scripts/remove-backgrounds.js --only sprites
```

Uses the [remove.bg API](https://www.remove.bg/api) — free tier is 50 images/month, which covers all 23 assets with room to spare. Sign up and paste the key into `.env`.

---

## 4. Resize to Game Dimensions

```bash
npm install -g sharp    # one-time install
node scripts/resize-assets.js
```

Shrinks the 1024×1024 generated images to their final game sizes.

---

## 5. Done — Reload the Browser

The game loads assets from `game/public/assets/` automatically. Just refresh the dev server and the new art appears.

---

## Asset File Reference

All filenames the game expects. Generate → rename to these exactly.

### Tower Icons
| File | Tower | Description |
|------|-------|-------------|
| `assets/icons/icon-cannon.png` | Cannon | Bow and arrow |
| `assets/icons/icon-frost.png` | Frost | Geometric snowflake |
| `assets/icons/icon-tesla.png` | Tesla | Thunderbird silhouette |
| `assets/icons/icon-mortar.png` | Mortar | Concentric circles / earth |
| `assets/icons/icon-poison.png` | Poison | Mashkiki / plant medicine |
| `assets/icons/icon-aura.png` | Aura | Medicine Wheel, 4 colours |
| `assets/icons/icon-dice.png` | UI | Question mark (offer panel) |
| `assets/icons/icon-mystery.png` | UI | Birchbark scroll (mystery offer) |

### Commander Portraits
| File | Commander | Animal / Role |
|------|-----------|---------------|
| `assets/portraits/portrait-nokomis.png` | Nokomis | Elder Grandmother |
| `assets/portraits/portrait-makoons.png` | Makoons | Bear spirit |
| `assets/portraits/portrait-waabizii.png` | Waabizii | Swan healer |
| `assets/portraits/portrait-bizhiw.png` | Bizhiw | Lynx hunter |
| `assets/portraits/portrait-animikiikaa.png` | Animikiikaa | Thunderbird |

### Creep Sprites (top-down, facing right)
| File | Creep Type | Animal / Spirit |
|------|-----------|-----------------|
| `assets/sprites/creep-normal.png` | Normal | Marten / weasel |
| `assets/sprites/creep-fast.png` | Fast | Deer, mid-leap |
| `assets/sprites/creep-armored.png` | Armoured | Mikinaak (snapping turtle) |
| `assets/sprites/creep-immune.png` | Immune | Gaagaagi (raven) with glow |
| `assets/sprites/creep-regen.png` | Regenerating | Bear cub with green markings |
| `assets/sprites/creep-flying.png` | Flying | Migiizi (eagle) overhead |
| `assets/sprites/creep-boss.png` | Boss (Waabooz) | Large crimson hare |
| `assets/sprites/creep-boss-mini.png` | Boss mini-copy | Small crimson hare |

### Map Tiles
| File | Tile Type | Visual |
|------|-----------|--------|
| `assets/tiles/tile-tree.png` | Tree (blocks building) | Pine canopy from above |
| `assets/tiles/tile-brush.png` | Brush (buildable) | Low shrubs, sage green |
| `assets/tiles/tile-rock.png` | Rock (blocks building) | Granite outcropping |
| `assets/tiles/tile-water.png` | Water (buildable) | Lake blue with ripples |

---

## Regenerating Individual Assets

If you don't like a specific image, delete it and re-run with `--only`:

```bash
rm game/public/assets/sprites/creep-boss.png
node scripts/generate-assets.js --only creeps   # skips existing, regenerates missing
```

---

## Manual Alternative (ChatGPT web UI)

If you prefer generating manually in ChatGPT, copy the prompt from
`scripts/generate-assets.js` for the asset you want, paste it into
ChatGPT with DALL-E, download the image, remove the background at
[remove.bg](https://www.remove.bg), resize to the game size, and save
to the path listed in the table above.

---

## Art Style Reference

All prompts are built around this consistent style foundation:

> Anishinaabe Woodland art style, bold geometric flat illustration,
> clean thick black outlines, limited palette of 4 colours maximum,
> pure white background, square format, game asset icon,
> no text, no gradients, no photorealism

When creating additional assets, include this style base in your prompts
to keep everything visually cohesive.

**Colour references:**
- Medicine Wheel: East=yellow, South=red, West=black, North=white
- Northern Ontario palette: forest green `#2D5016`, pine shadow `#1A3009`,
  granite grey `#8C8070`, lake blue `#4A7FA5`, marsh `#6B8F3E`
