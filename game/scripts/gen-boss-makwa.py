#!/usr/bin/env python3
"""Generate Pacific Northwest formline-style Makwa (Bear) boss sprite.

Outputs a 64×64 RGBA PNG with bold black outlines, ovoid shapes,
and red/teal accents consistent with Pacific Northwest coastal art.

Works at 4× internal resolution (256×256) and downscales for anti-aliasing.
"""

import math
import os
from PIL import Image, ImageDraw

FINAL_SIZE = 64
WORK_SIZE = FINAL_SIZE * 4  # 256×256 working resolution
CX = WORK_SIZE // 2
CY = WORK_SIZE // 2

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'sprites')

# ── Pacific NW Formline Palette ──────────────────────────────────────────────
BLACK    = (15, 12, 10, 255)       # formline black (slightly warm)
RED      = (175, 38, 28, 255)      # formline red
RED_LT   = (200, 60, 45, 255)     # lighter red highlight
TEAL     = (35, 130, 120, 255)    # formline blue-green
TEAL_LT  = (60, 165, 150, 255)   # lighter teal
AMBER    = (185, 115, 38, 255)    # warm amber fill (bear body)
AMBER_LT = (215, 155, 65, 255)   # lighter amber highlight
AMBER_DK = (135, 78, 22, 255)    # darker amber shadow
WHITE    = (232, 222, 208, 255)   # off-white accent
CLEAR    = (0, 0, 0, 0)


def circle(draw, cx, cy, r, **kw):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], **kw)


def ell(draw, cx, cy, rx, ry, **kw):
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], **kw)


def generate_makwa():
    """Generate the Makwa (Bear) boss sprite in Pacific NW formline style."""
    img = Image.new('RGBA', (WORK_SIZE, WORK_SIZE), CLEAR)
    draw = ImageDraw.Draw(img)

    head_cx = CX
    head_cy = CY + 6

    # ── EARS — round forms at top corners ─────────────────────────────────
    for side in [-1, 1]:
        ear_cx = head_cx + side * 72
        ear_cy = head_cy - 90

        # Black formline outer
        circle(draw, ear_cx, ear_cy, 34, fill=BLACK)
        # Red fill
        circle(draw, ear_cx, ear_cy, 24, fill=RED)
        # Teal inner ovoid
        circle(draw, ear_cx, ear_cy, 14, fill=TEAL)

    # ── HEAD SHAPE — large ovoid with bold formline border ────────────────
    head_rx = 105
    head_ry = 110

    # Black border (thick formline)
    ell(draw, head_cx, head_cy, head_rx, head_ry, fill=BLACK)
    # Amber fill
    ell(draw, head_cx, head_cy, head_rx - 10, head_ry - 10, fill=AMBER)

    # ── FOREHEAD DESIGN — central ovoid crest ────────────────────────────
    # Teal ovoid on forehead
    ell(draw, head_cx, head_cy - 52, 34, 22, fill=BLACK)
    ell(draw, head_cx, head_cy - 52, 26, 16, fill=TEAL)
    # Inner amber accent
    ell(draw, head_cx, head_cy - 52, 14, 9, fill=AMBER_LT)

    # ── EYEBROW RIDGES — bold arcs ───────────────────────────────────────
    for side in [-1, 1]:
        ex = head_cx + side * 42
        # Thick black brow ridge
        draw.arc([ex - 34, head_cy - 46, ex + 34, head_cy - 12],
                 200, 340, fill=BLACK, width=10)

    # ── EYES — formline ovoids with red iris ─────────────────────────────
    eye_y = head_cy - 14
    for side in [-1, 1]:
        ex = head_cx + side * 42

        # Outer black formline
        ell(draw, ex, eye_y, 30, 22, fill=BLACK)
        # White eye
        ell(draw, ex, eye_y, 23, 16, fill=WHITE)
        # Red iris (formline red)
        ell(draw, ex + side * 3, eye_y + 1, 14, 11, fill=RED)
        # Black pupil
        circle(draw, ex + side * 5, eye_y + 1, 7, fill=BLACK)
        # Highlight
        circle(draw, ex + side * 0, eye_y - 4, 4, fill=WHITE)

    # ── NOSE BRIDGE — vertical formline ──────────────────────────────────
    draw.line([(head_cx, head_cy - 30), (head_cx, head_cy + 6)],
              fill=BLACK, width=7)

    # ── SNOUT / NOSE — large prominent bear nose ─────────────────────────
    nose_cy = head_cy + 22

    # Snout mound (darker amber, wider)
    ell(draw, head_cx, nose_cy + 4, 44, 32, fill=AMBER_DK)
    # Black outline around snout
    ell(draw, head_cx, nose_cy + 4, 44, 32, outline=BLACK, width=6)

    # Nose pad (large black ovoid)
    ell(draw, head_cx, nose_cy - 2, 26, 18, fill=BLACK)
    # Red nose inner
    ell(draw, head_cx, nose_cy - 2, 18, 12, fill=RED)
    # Nostrils
    for side in [-1, 1]:
        circle(draw, head_cx + side * 9, nose_cy, 5, fill=BLACK)

    # ── MOUTH — simple bold line with subtle fangs ───────────────────────
    mouth_cy = head_cy + 52

    # Mouth line
    draw.line([(head_cx - 36, mouth_cy), (head_cx + 36, mouth_cy)],
              fill=BLACK, width=7)

    # Upper lip arcs
    draw.arc([head_cx - 38, mouth_cy - 14, head_cx - 2, mouth_cy + 6],
             0, 180, fill=BLACK, width=5)
    draw.arc([head_cx + 2, mouth_cy - 14, head_cx + 38, mouth_cy + 6],
             0, 180, fill=BLACK, width=5)

    # Two fangs (simplified, larger for readability)
    for side in [-1, 1]:
        fx = head_cx + side * 16
        # White fang
        draw.polygon([
            (fx - 5, mouth_cy - 2),
            (fx + 5, mouth_cy - 2),
            (fx, mouth_cy + 12),
        ], fill=WHITE, outline=BLACK, width=2)

    # ── CHEEK ACCENTS — teal formline ovoids ─────────────────────────────
    for side in [-1, 1]:
        cx = head_cx + side * 72
        cy = head_cy + 8

        # Black border
        ell(draw, cx, cy, 18, 26, fill=BLACK)
        # Teal fill
        ell(draw, cx, cy, 12, 20, fill=TEAL)

    # ── CHIN — red formline accent ───────────────────────────────────────
    chin_cy = head_cy + 74
    ell(draw, head_cx, chin_cy, 24, 14, fill=BLACK)
    ell(draw, head_cx, chin_cy, 17, 9, fill=RED)

    # ── SIDE FORMLINES — connecting lines along face ─────────────────────
    for side in [-1, 1]:
        sx = head_cx + side * 88
        # Vertical side formline
        draw.line([(head_cx + side * 72, head_cy - 60),
                   (sx, head_cy - 30),
                   (sx, head_cy + 30)],
                  fill=BLACK, width=7)

    # ── FINAL BORDER REINFORCEMENT ───────────────────────────────────────
    ell(draw, head_cx, head_cy, head_rx, head_ry, outline=BLACK, width=9)

    # ── Downscale ────────────────────────────────────────────────────────
    final = img.resize((FINAL_SIZE, FINAL_SIZE), Image.LANCZOS)
    return final


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    sprite = generate_makwa()
    path = os.path.join(OUT_DIR, 'boss-makwa.png')
    sprite.save(path)
    size = os.path.getsize(path)
    print(f"Saved boss-makwa.png ({FINAL_SIZE}×{FINAL_SIZE}, {size} bytes)")


if __name__ == '__main__':
    main()
