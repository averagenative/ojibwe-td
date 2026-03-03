#!/usr/bin/env python3
"""Generate Pacific Northwest formline-style Makwa (Bear) boss sprite.

Outputs a 64×64 RGBA PNG with a FULL-BODY side-view bear design.
Bold black outlines, ovoid shapes, and red/teal accents consistent
with Pacific Northwest coastal / Ojibwe art.

Works at 4× internal resolution (256×256) and downscales for anti-aliasing.
"""

import os
from PIL import Image, ImageDraw

FINAL_SIZE = 64
WORK_SIZE = FINAL_SIZE * 4  # 256×256 working resolution

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
    """Generate the Makwa (Bear) boss sprite — full body, side view, PNW formline style."""
    img = Image.new('RGBA', (WORK_SIZE, WORK_SIZE), CLEAR)
    draw = ImageDraw.Draw(img)

    # Bear faces RIGHT in side profile. Fills the 256×256 canvas well.
    # Vertically centred with padding for legs below and ears above.

    # ── BODY — large horizontal ovoid (torso) ───────────────────────────────
    body_cx = 120
    body_cy = 118
    body_rx = 88
    body_ry = 56

    # Black formline border (thick)
    ell(draw, body_cx, body_cy, body_rx + 9, body_ry + 9, fill=BLACK)
    # Amber body fill
    ell(draw, body_cx, body_cy, body_rx, body_ry, fill=AMBER)

    # ── SHOULDER HUMP — characteristic bear hump over shoulders ─────────────
    hump_cx = 150
    hump_cy = body_cy - 38
    ell(draw, hump_cx, hump_cy, 44, 32, fill=BLACK)
    ell(draw, hump_cx, hump_cy, 36, 25, fill=AMBER_DK)

    # ── HINDQUARTERS — rounded rear ─────────────────────────────────────────
    hind_cx = 60
    hind_cy = body_cy + 6
    ell(draw, hind_cx, hind_cy, 44, 50, fill=BLACK)
    ell(draw, hind_cx, hind_cy, 36, 42, fill=AMBER)

    # ── Merge body shapes with smooth amber fill ────────────────────────────
    draw.rectangle([60, body_cy - 40, 165, body_cy + 40], fill=AMBER)
    ell(draw, body_cx, body_cy, body_rx - 8, body_ry - 6, fill=AMBER)

    # ── BELLY — lighter underside ───────────────────────────────────────────
    belly_cy = body_cy + 22
    ell(draw, body_cx - 5, belly_cy, 60, 22, fill=AMBER_LT)

    # ── FORMLINE BODY DESIGNS — ovoid accents on torso ──────────────────────
    # Shoulder ovoid (teal — primary design element)
    ell(draw, 148, body_cy - 6, 24, 32, fill=BLACK)
    ell(draw, 148, body_cy - 6, 17, 25, fill=TEAL)
    ell(draw, 148, body_cy - 6, 9, 14, fill=AMBER_LT)

    # Haunch ovoid (red)
    ell(draw, 76, body_cy + 2, 20, 28, fill=BLACK)
    ell(draw, 76, body_cy + 2, 14, 21, fill=RED)
    ell(draw, 76, body_cy + 2, 7, 11, fill=AMBER_LT)

    # ── LEGS — four sturdy bear legs with paws ──────────────────────────────
    leg_top = body_cy + 34
    paw_y = 224

    # Front right leg (foreground)
    fl1x = 155
    draw.rectangle([fl1x - 15, leg_top - 4, fl1x + 15, paw_y - 6], fill=BLACK)
    draw.rectangle([fl1x - 9, leg_top, fl1x + 9, paw_y - 8], fill=AMBER_DK)
    # Paw
    ell(draw, fl1x, paw_y - 4, 16, 12, fill=BLACK)
    ell(draw, fl1x, paw_y - 6, 10, 7, fill=AMBER_DK)
    # Claws
    for cx_off in [-5, 0, 5]:
        draw.line([(fl1x + cx_off, paw_y + 2), (fl1x + cx_off + 2, paw_y + 10)],
                  fill=BLACK, width=3)

    # Front left leg (background, slightly offset)
    fl2x = 136
    draw.rectangle([fl2x - 13, leg_top, fl2x + 13, paw_y - 4], fill=BLACK)
    draw.rectangle([fl2x - 7, leg_top + 2, fl2x + 7, paw_y - 6], fill=AMBER)
    ell(draw, fl2x, paw_y - 2, 14, 11, fill=BLACK)
    ell(draw, fl2x, paw_y - 4, 8, 6, fill=AMBER)

    # Hind right leg (foreground)
    hl1x = 72
    draw.rectangle([hl1x - 16, leg_top + 2, hl1x + 16, paw_y], fill=BLACK)
    draw.rectangle([hl1x - 10, leg_top + 4, hl1x + 10, paw_y - 2], fill=AMBER)
    ell(draw, hl1x, paw_y + 2, 16, 12, fill=BLACK)
    ell(draw, hl1x, paw_y, 10, 7, fill=AMBER)
    for cx_off in [-5, 0, 5]:
        draw.line([(hl1x + cx_off, paw_y + 8), (hl1x + cx_off + 2, paw_y + 16)],
                  fill=BLACK, width=3)

    # Hind left leg (background)
    hl2x = 52
    draw.rectangle([hl2x - 13, leg_top + 4, hl2x + 13, paw_y + 2], fill=BLACK)
    draw.rectangle([hl2x - 7, leg_top + 6, hl2x + 7, paw_y], fill=AMBER_DK)
    ell(draw, hl2x, paw_y + 4, 14, 11, fill=BLACK)
    ell(draw, hl2x, paw_y + 2, 8, 6, fill=AMBER_DK)

    # ── TAIL — small rounded tuft on the left ───────────────────────────────
    tail_cx = 26
    tail_cy = body_cy - 22
    ell(draw, tail_cx, tail_cy, 16, 14, fill=BLACK)
    ell(draw, tail_cx, tail_cy, 10, 9, fill=AMBER_DK)
    ell(draw, tail_cx, tail_cy, 5, 4, fill=RED)

    # ── NECK — connecting head to body ──────────────────────────────────────
    neck_points = [
        (165, body_cy - 36),
        (195, body_cy - 52),
        (205, body_cy - 32),
        (175, body_cy - 12),
    ]
    draw.polygon(neck_points, fill=AMBER)

    # ── HEAD — large, facing right ──────────────────────────────────────────
    head_cx = 198
    head_cy = body_cy - 46

    # Head shape — ovoid
    head_rx = 42
    head_ry = 36
    ell(draw, head_cx, head_cy, head_rx + 7, head_ry + 7, fill=BLACK)
    ell(draw, head_cx, head_cy, head_rx, head_ry, fill=AMBER)

    # ── EAR — round, on top of head ─────────────────────────────────────────
    ear_cx = head_cx - 14
    ear_cy = head_cy - 36
    circle(draw, ear_cx, ear_cy, 18, fill=BLACK)
    circle(draw, ear_cx, ear_cy, 12, fill=RED)
    circle(draw, ear_cx, ear_cy, 6, fill=TEAL)

    # ── SNOUT — prominent bear muzzle, protruding right ─────────────────────
    snout_cx = head_cx + 34
    snout_cy = head_cy + 8

    # Snout mound
    ell(draw, snout_cx, snout_cy, 26, 20, fill=BLACK)
    ell(draw, snout_cx, snout_cy, 19, 14, fill=AMBER_DK)

    # Nose pad (black with red inner)
    ell(draw, snout_cx + 10, snout_cy - 4, 12, 9, fill=BLACK)
    ell(draw, snout_cx + 10, snout_cy - 4, 7, 5, fill=RED)

    # Nostril
    circle(draw, snout_cx + 14, snout_cy - 3, 3, fill=BLACK)

    # Mouth line
    draw.line([(snout_cx - 6, snout_cy + 10), (snout_cx + 16, snout_cy + 6)],
              fill=BLACK, width=5)

    # Fang
    draw.polygon([
        (snout_cx + 2, snout_cy + 8),
        (snout_cx + 8, snout_cy + 8),
        (snout_cx + 5, snout_cy + 17),
    ], fill=WHITE, outline=BLACK, width=2)

    # ── EYE — formline ovoid style ──────────────────────────────────────────
    eye_cx = head_cx + 8
    eye_cy = head_cy - 8

    ell(draw, eye_cx, eye_cy, 14, 11, fill=BLACK)
    ell(draw, eye_cx, eye_cy, 10, 7, fill=WHITE)
    ell(draw, eye_cx + 2, eye_cy, 6, 5, fill=RED)
    circle(draw, eye_cx + 3, eye_cy, 3, fill=BLACK)
    circle(draw, eye_cx - 1, eye_cy - 3, 2, fill=WHITE)  # highlight

    # ── BROW RIDGE — heavy formline arc ─────────────────────────────────────
    draw.arc([eye_cx - 18, eye_cy - 16, eye_cx + 18, eye_cy - 2],
             200, 340, fill=BLACK, width=7)

    # ── FOREHEAD DESIGN — small teal ovoid ──────────────────────────────────
    ell(draw, head_cx - 6, head_cy - 18, 12, 8, fill=BLACK)
    ell(draw, head_cx - 6, head_cy - 18, 8, 5, fill=TEAL)

    # ── BODY OUTLINE REINFORCEMENT (crisp formlines) ────────────────────────
    ell(draw, body_cx, body_cy, body_rx + 9, body_ry + 9, outline=BLACK, width=5)
    ell(draw, head_cx, head_cy, head_rx + 7, head_ry + 7, outline=BLACK, width=5)

    # ── Downscale ────────────────────────────────────────────────────────────
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
