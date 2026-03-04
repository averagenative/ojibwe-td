#!/usr/bin/env python3
"""Generate top-down environment tiles for Ojibwe TD.

All tiles are 64×64 RGBA PNGs with transparent background.
Uses 4× internal resolution (256×256) and downscales for anti-aliasing.

Tiles:
  tile-tree.png   — top-down tree canopy cluster (pine/birch)
  tile-brush.png  — low bush / fern ground cover
  tile-rock.png   — granite boulder cluster from above
  tile-water.png  — small pond with organic shoreline

Style: semi-flat, Ojibwe woodland, bold shapes, natural colours,
       top-down perspective, readable at 40px.
"""

import os
import math
import random
from PIL import Image, ImageDraw, ImageFilter

FINAL_SIZE = 64
WORK_SIZE = FINAL_SIZE * 4  # 256×256 working resolution
W = WORK_SIZE

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'tiles')

# ── Palette ──────────────────────────────────────────────────────────────────
CLEAR        = (0,   0,   0,   0)

# Tree colours
TREE_DARK    = (26,  48,   9, 255)   # pine shadow  #1A3009
TREE_MID     = (45,  80,  22, 255)   # forest green #2D5016
TREE_LIGHT   = (60, 105,  30, 255)   # highlight
TREE_BRIGHT  = (80, 130,  40, 255)   # canopy shine
BARK_BROWN   = (72,  50,  28, 255)   # trunk/branch glimpse

# Brush colours
BRUSH_DARK   = (68,  52,  28, 255)   # earth brown (dark)
BRUSH_EARTH  = (95,  72,  38, 255)   # earth brown mid
BRUSH_GREEN  = (107, 143,  62, 255)  # light green  #6B8F3E
BRUSH_BRIGHT = (130, 170,  75, 255)  # leaf highlight

# Rock colours
ROCK_SHADOW  = (80,  74,  64, 255)   # dark grey
ROCK_MID     = (140, 128, 112, 255)  # grey  #8C8070
ROCK_LIGHT   = (175, 162, 145, 255)  # light face
ROCK_MOSS    = (90,  105,  65, 255)  # moss accent
ROCK_SPEC    = (200, 190, 175, 255)  # specular highlight

# Water colours
WATER_DEEP   = (42,  90, 130, 255)   # deep water
WATER_MID    = (74, 127, 165, 255)   # lake blue #4A7FA5
WATER_LIGHT  = (111, 168, 196, 255)  # lighter blue #6FA8C4
WATER_SHINE  = (160, 210, 230, 255)  # highlight
WATER_SHORE  = (120, 148,  85, 255)  # wet shore / sedge

# ── Helpers ──────────────────────────────────────────────────────────────────

def circle(draw, cx, cy, r, **kw):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], **kw)


def ell(draw, cx, cy, rx, ry, **kw):
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], **kw)


def poly_blob(n_pts, cx, cy, r_avg, jitter_pct, seed=0):
    """Return a polygon that approximates a rounded blob (organic shape)."""
    rng = random.Random(seed)
    pts = []
    for i in range(n_pts):
        angle = 2 * math.pi * i / n_pts
        r = r_avg * (1.0 + rng.uniform(-jitter_pct, jitter_pct))
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    return pts


def draw_blob(draw, cx, cy, r, jitter=0.25, seed=0, n=20, **kw):
    pts = poly_blob(n, cx, cy, r, jitter, seed)
    draw.polygon(pts, **kw)


# ── tile-tree.png ─────────────────────────────────────────────────────────────

def gen_tree():
    """Top-down pine/birch cluster — 2-3 tree canopies visible from above."""
    img = Image.new('RGBA', (W, W), CLEAR)
    draw = ImageDraw.Draw(img)

    # Forest floor shadow under canopy (soft dark fill)
    draw_blob(draw, 128, 128, 100, jitter=0.18, seed=7, fill=TREE_DARK)

    # Three canopy circles — different sizes, slightly offset
    # Back-left tree (smallest)
    BL_cx, BL_cy, BL_r = 85, 95, 52
    draw_blob(draw, BL_cx, BL_cy, BL_r + 8, jitter=0.12, seed=11, fill=TREE_DARK)
    draw_blob(draw, BL_cx, BL_cy, BL_r,     jitter=0.15, seed=12, fill=TREE_MID)
    draw_blob(draw, BL_cx, BL_cy, BL_r - 8, jitter=0.10, seed=13, fill=TREE_LIGHT)
    # Canopy shine
    draw_blob(draw, BL_cx + 6, BL_cy - 8, BL_r - 22, jitter=0.20, seed=14,
              fill=TREE_BRIGHT)

    # Right tree (medium)
    R_cx, R_cy, R_r = 158, 120, 60
    draw_blob(draw, R_cx, R_cy, R_r + 8, jitter=0.12, seed=21, fill=TREE_DARK)
    draw_blob(draw, R_cx, R_cy, R_r,     jitter=0.15, seed=22, fill=TREE_MID)
    draw_blob(draw, R_cx, R_cy, R_r - 10, jitter=0.10, seed=23, fill=TREE_LIGHT)
    draw_blob(draw, R_cx + 8, R_cy - 10, R_r - 25, jitter=0.20, seed=24,
              fill=TREE_BRIGHT)

    # Front-centre tree (largest — closest / foreground)
    FC_cx, FC_cy, FC_r = 110, 155, 68
    draw_blob(draw, FC_cx, FC_cy, FC_r + 9, jitter=0.12, seed=31, fill=TREE_DARK)
    draw_blob(draw, FC_cx, FC_cy, FC_r,     jitter=0.14, seed=32, fill=TREE_MID)
    draw_blob(draw, FC_cx, FC_cy, FC_r - 10, jitter=0.12, seed=33, fill=TREE_LIGHT)
    draw_blob(draw, FC_cx + 8, FC_cy - 12, FC_r - 28, jitter=0.22, seed=34,
              fill=TREE_BRIGHT)

    # Tiny glimpse of dark interior / trunk on largest tree
    circle(draw, FC_cx + 2, FC_cy + 8, 8, fill=TREE_DARK)
    circle(draw, FC_cx + 3, FC_cy + 8, 4, fill=BARK_BROWN)

    return img.resize((FINAL_SIZE, FINAL_SIZE), Image.LANCZOS)


# ── tile-brush.png ────────────────────────────────────────────────────────────

def gen_brush():
    """Low fern/bush ground cover — top-down, lower profile than trees."""
    img = Image.new('RGBA', (W, W), CLEAR)
    draw = ImageDraw.Draw(img)

    # Earth ground patch (irregular)
    draw_blob(draw, 128, 128, 108, jitter=0.20, seed=40, fill=BRUSH_DARK)
    draw_blob(draw, 128, 128, 90,  jitter=0.18, seed=41, fill=BRUSH_EARTH)

    # Scattered small bush clusters — 6 clusters
    clusters = [
        (78,  88,  28, 51),
        (155,  82,  25, 60),
        (90,  148,  30, 70),
        (158, 148,  27, 80),
        (120, 115,  32, 90),
        (108,  70,  22, 100),
    ]
    for (cx, cy, r, seed) in clusters:
        # Shadow ring
        draw_blob(draw, cx, cy, r + 6, jitter=0.20, seed=seed,     fill=BRUSH_DARK)
        # Main green blob
        draw_blob(draw, cx, cy, r,     jitter=0.22, seed=seed + 1, fill=BRUSH_GREEN)
        # Leaf highlights — smaller interior blobs
        draw_blob(draw, cx + 4, cy - 4, r - 9,  jitter=0.28, seed=seed + 2,
                  fill=BRUSH_BRIGHT)

    # A few tiny individual leaves / fronds (dots)
    rng = random.Random(55)
    for _ in range(12):
        lx = int(rng.uniform(40, 210))
        ly = int(rng.uniform(40, 210))
        lr = int(rng.uniform(4, 9))
        draw_blob(draw, lx, ly, lr, jitter=0.30, seed=rng.randint(0, 999),
                  fill=BRUSH_GREEN)

    return img.resize((FINAL_SIZE, FINAL_SIZE), Image.LANCZOS)


# ── tile-rock.png ─────────────────────────────────────────────────────────────

def gen_rock():
    """Granite boulder cluster — 2-3 rounded stones from directly above."""
    img = Image.new('RGBA', (W, W), CLEAR)
    draw = ImageDraw.Draw(img)

    # Ground shadow under the cluster
    draw_blob(draw, 128, 132, 88, jitter=0.18, seed=62, n=16,
              fill=(*ROCK_SHADOW[:3], 180))

    # Rock 1 — largest, centre-right
    R1cx, R1cy, R1r = 140, 125, 70
    draw_blob(draw, R1cx, R1cy, R1r,     jitter=0.14, seed=71, fill=ROCK_SHADOW)
    draw_blob(draw, R1cx, R1cy, R1r - 8, jitter=0.12, seed=72, fill=ROCK_MID)
    draw_blob(draw, R1cx - 12, R1cy - 14, R1r - 28, jitter=0.18, seed=73,
              fill=ROCK_LIGHT)
    # Specular highlight (top-left face catch)
    draw_blob(draw, R1cx - 18, R1cy - 18, R1r - 45, jitter=0.25, seed=74,
              fill=ROCK_SPEC)

    # Rock 2 — back-left, medium
    R2cx, R2cy, R2r = 80, 105, 48
    draw_blob(draw, R2cx, R2cy, R2r,     jitter=0.16, seed=81, fill=ROCK_SHADOW)
    draw_blob(draw, R2cx, R2cy, R2r - 6, jitter=0.14, seed=82, fill=ROCK_MID)
    draw_blob(draw, R2cx - 8, R2cy - 8, R2r - 20, jitter=0.18, seed=83,
              fill=ROCK_LIGHT)

    # Rock 3 — small, bottom
    R3cx, R3cy, R3r = 105, 172, 36
    draw_blob(draw, R3cx, R3cy, R3r,     jitter=0.18, seed=91, fill=ROCK_SHADOW)
    draw_blob(draw, R3cx, R3cy, R3r - 5, jitter=0.15, seed=92, fill=ROCK_MID)
    draw_blob(draw, R3cx - 6, R3cy - 6, R3r - 14, jitter=0.20, seed=93,
              fill=ROCK_LIGHT)

    # Moss patches — small green splotches on seams between rocks
    moss_spots = [(110, 138, 12, 101), (90, 150, 9, 102), (155, 168, 11, 103)]
    for (mx, my, mr, ms) in moss_spots:
        draw_blob(draw, mx, my, mr, jitter=0.30, seed=ms, fill=ROCK_MOSS)

    return img.resize((FINAL_SIZE, FINAL_SIZE), Image.LANCZOS)


# ── tile-water.png ────────────────────────────────────────────────────────────

def gen_water():
    """Small pond — organic shoreline, subtle ripples, top-down."""
    img = Image.new('RGBA', (W, W), CLEAR)
    draw = ImageDraw.Draw(img)

    # Wet shoreline rim (sedge / muddy edge)
    draw_blob(draw, 128, 128, 110, jitter=0.22, seed=111, fill=WATER_SHORE)

    # Deep water base
    draw_blob(draw, 128, 128, 96,  jitter=0.20, seed=112, fill=WATER_DEEP)

    # Mid water
    draw_blob(draw, 128, 128, 82,  jitter=0.18, seed=113, fill=WATER_MID)

    # Lighter inner water
    draw_blob(draw, 122, 122, 60,  jitter=0.16, seed=114, fill=WATER_LIGHT)

    # Ripple rings — elongated ellipses, slightly off-centre
    # Outer ripple
    ell(draw, 120, 124, 62, 46, outline=(*WATER_LIGHT[:3], 120), width=4)
    # Mid ripple
    ell(draw, 118, 122, 42, 30, outline=(*WATER_SHINE[:3], 140), width=3)
    # Inner ripple
    ell(draw, 116, 120, 24, 16, outline=(*WATER_SHINE[:3], 160), width=3)

    # Surface highlight — top-right catch light
    draw_blob(draw, 148, 105, 28, jitter=0.25, seed=120, fill=(*WATER_SHINE[:3], 200))

    # Small glint dots
    rng = random.Random(130)
    for _ in range(6):
        gx = int(rng.uniform(85, 165))
        gy = int(rng.uniform(85, 165))
        gr = int(rng.uniform(3, 7))
        draw_blob(draw, gx, gy, gr, jitter=0.20, seed=rng.randint(0, 999),
                  fill=(*WATER_SHINE[:3], 180))

    return img.resize((FINAL_SIZE, FINAL_SIZE), Image.LANCZOS)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    tiles = [
        ('tile-tree.png',  gen_tree),
        ('tile-brush.png', gen_brush),
        ('tile-rock.png',  gen_rock),
        ('tile-water.png', gen_water),
    ]

    for filename, generator in tiles:
        img = generator()
        assert img.size == (FINAL_SIZE, FINAL_SIZE), \
            f"{filename}: expected {FINAL_SIZE}×{FINAL_SIZE}, got {img.size}"
        path = os.path.join(OUT_DIR, filename)
        img.save(path)
        size = os.path.getsize(path)
        print(f"Saved {filename} ({FINAL_SIZE}×{FINAL_SIZE}, {size} bytes)")


if __name__ == '__main__':
    main()
