#!/usr/bin/env python3
"""
Generate character portrait assets for Ojibwe TD — TASK-166 (regenerated style).

Semi-flat Ojibwe woodland art style: bold geometric shapes, warm earth tones,
dark backgrounds, consistent with commander portrait aesthetic.

Portraits generated:
  Elder portraits (narrative speakers):
    - elder-mishoomis.png        (wise grandfather, warm brown / ochre)
    - elder-mishoomis-proud.png  (proud expression variant)
    - elder-nokomis.png          (wise grandmother, sage green / silver)
    - elder-nokomis-teaching.png (teaching expression variant)
    - elder-ogichidaa.png        (war chief, deep crimson / warrior)
    - elder-ogichidaa-fierce.png (fierce expression variant)

  Commander portrait (missing):
    - portrait-oshkaabewis.png   (deer totem, economy, autumn gold)
"""

import math
import os
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'portraits')
FINAL_SIZE = 96
WORK_SIZE = FINAL_SIZE * 4   # 4× for crisp anti-aliasing
CX = WORK_SIZE // 2
CY = WORK_SIZE // 2
R  = CX - 8  # usable radius inside border


def new_canvas(bg=(0, 0, 0, 0)):
    """Create a transparent RGBA canvas at working resolution."""
    return Image.new('RGBA', (WORK_SIZE, WORK_SIZE), bg)


def save(img, filename):
    """Downscale to 96×96 and save."""
    out = img.resize((FINAL_SIZE, FINAL_SIZE), Image.LANCZOS)
    path = os.path.join(OUTPUT_DIR, filename)
    out.save(path, optimize=True)
    print(f"  Saved {filename} ({os.path.getsize(path):,} bytes)")


# ─── Drawing helpers ─────────────────────────────────────────────────────────

def circle(draw, cx, cy, r, **kw):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], **kw)


def ell(draw, cx, cy, rx, ry, **kw):
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], **kw)


def soften(img, radius=1.5):
    """Apply a subtle gaussian blur on the RGBA image."""
    return img.filter(ImageFilter.GaussianBlur(radius=radius))


def gradient_circle(img, cx, cy, r, inner_col, outer_col):
    """Paint a radial gradient circle using concentric rings."""
    draw = ImageDraw.Draw(img)
    steps = 48
    for i in range(steps, 0, -1):
        t = i / steps
        ir = tuple(int(inner_col[c] * (1 - t) + outer_col[c] * t) for c in range(4))
        ri = int(r * (i / steps))
        circle(draw, cx, cy, ri, fill=ir)


def poly(draw, pts, **kw):
    draw.polygon(pts, **kw)


def luma_overlay(draw, cx, cy, r, color, alpha=40):
    """Subtle highlight/shadow overlay ring."""
    col = color[:3] + (alpha,)
    circle(draw, cx, cy, r, outline=col, width=10)


# ─── Colour Palettes ─────────────────────────────────────────────────────────

# Mishoomis — grandfather, warm ochre / earth
M_BG1      = (50, 28, 8, 255)       # darkest bg
M_BG2      = (80, 48, 18, 255)      # lighter bg ring
M_BORDER   = (155, 100, 40, 255)    # gold-brown border
M_SKIN     = (175, 128, 80, 255)
M_SKIN_HI  = (208, 165, 110, 255)
M_SKIN_SH  = (125, 85, 50, 255)
M_HAIR     = (48, 38, 30, 255)
M_HAIR_GR  = (155, 145, 130, 255)   # silver-grey
M_BAND     = (160, 50, 35, 255)     # red headband
M_BAND2    = (210, 175, 50, 255)    # gold accent
M_EYES     = (40, 28, 18, 255)
M_EYE_WH   = (235, 225, 210, 255)
M_OUTLINE  = (30, 18, 8, 255)
M_CLOTH    = (90, 55, 25, 255)

# Nokomis — grandmother, sage-forest green / silver
N_BG1      = (18, 32, 18, 255)
N_BG2      = (30, 52, 30, 255)
N_BORDER   = (90, 145, 80, 255)     # green border
N_SKIN     = (168, 125, 82, 255)
N_SKIN_HI  = (200, 158, 112, 255)
N_SKIN_SH  = (118, 82, 52, 255)
N_HAIR     = (48, 38, 30, 255)
N_HAIR_GR  = (190, 185, 175, 255)   # bright silver
N_SHAWL    = (45, 88, 48, 255)
N_SHAWL_LT = (65, 118, 68, 255)
N_SHAWL_DK = (28, 55, 30, 255)
N_BEAD     = (185, 155, 50, 255)    # gold beads
N_EYES     = (38, 28, 18, 255)
N_EYE_WH   = (235, 225, 210, 255)
N_OUTLINE  = (15, 25, 15, 255)

# Ogichidaa — war chief, deep crimson / warrior
G_BG1      = (42, 10, 6, 255)
G_BG2      = (65, 20, 12, 255)
G_BORDER   = (165, 38, 28, 255)     # red border
G_SKIN     = (158, 112, 72, 255)
G_SKIN_HI  = (188, 145, 100, 255)
G_SKIN_SH  = (112, 72, 45, 255)
G_HAIR     = (22, 14, 10, 255)
G_PAINT1   = (185, 35, 22, 255)     # war paint red
G_PAINT2   = (225, 80, 20, 255)     # war paint orange-red
G_FEATHER  = (215, 205, 185, 255)
G_FEATH_DK = (145, 135, 118, 255)
G_FEATH_TIP= (18, 12, 8, 255)
G_EYES     = (30, 16, 10, 255)
G_EYE_WH   = (228, 218, 205, 255)
G_OUTLINE  = (20, 8, 5, 255)
G_CLOTH    = (80, 25, 15, 255)

# Oshkaabewis — deer / autumn gold
OSH_BG        = (45, 35, 15, 255)
OSH_BG2       = (68, 52, 22, 255)
OSH_BORDER    = (195, 148, 40, 255)
OSH_BODY      = (162, 118, 52, 255)
OSH_BODY_LT   = (200, 162, 82, 255)
OSH_BODY_DK   = (115, 82, 35, 255)
OSH_ANTLER    = (138, 108, 68, 255)
OSH_ANTLER_LT = (178, 148, 98, 255)
OSH_NOSE      = (55, 38, 22, 255)
OSH_EYE       = (48, 32, 18, 255)
OSH_OUTLINE   = (32, 22, 8, 255)
OSH_ACCENT    = (205, 158, 42, 255)


# ─── Border / Background helpers ─────────────────────────────────────────────

def draw_bg(img, bg1, bg2, border_col):
    """Dark radial-gradient background circle + ornate border."""
    # Radial gradient from bg2 (centre) to bg1 (edge)
    gradient_circle(img, CX, CY, R + 8, bg2, bg1)
    draw = ImageDraw.Draw(img)
    # Outer hard border
    circle(draw, CX, CY, R + 4, outline=border_col, width=10)
    # Inner thin accent ring
    circle(draw, CX, CY, R - 18, outline=(*border_col[:3], 80), width=4)
    # Trim mask — erase outside the circle so we get a clean disc
    mask = Image.new('L', (WORK_SIZE, WORK_SIZE), 0)
    md = ImageDraw.Draw(mask)
    circle(md, CX, CY, R + 4, fill=255)
    # Apply mask to make transparent outside circle
    img_rgba = img.split()
    img.putalpha(mask)


def draw_geometric_symbols(draw, bg1, border_col, quad_pts=None):
    """
    Small decorative dots at cardinal and diagonal positions inside the border,
    plus optional small diamond motifs — Ojibwe woodland art feel.
    """
    col = (*border_col[:3], 120)
    rim = R - 6
    for angle_deg in range(0, 360, 45):
        angle = math.radians(angle_deg)
        px = int(CX + rim * math.cos(angle))
        py = int(CY + rim * math.sin(angle))
        circle(draw, px, py, 6, fill=col)


# ─── Shared face utilities ───────────────────────────────────────────────────

def draw_neck_shoulders(draw, skin, skin_sh, cloth, cx=CX, cy=CY):
    """Draw neck and upper body below head."""
    # Shoulder mass
    poly(draw, [
        (cx - 90, cy + 120), (cx - 55, cy + 40),
        (cx + 55, cy + 40),  (cx + 90, cy + 120),
    ], fill=cloth)
    # Neck
    ell(draw, cx, cy + 42, 26, 22, fill=skin)
    ell(draw, cx, cy + 48, 20, 16, fill=skin_sh)


def draw_ear(draw, cx, cy, rx, ry, skin, skin_sh):
    ell(draw, cx, cy, rx, ry, fill=skin)
    ell(draw, cx, cy, int(rx * 0.5), int(ry * 0.5), fill=skin_sh)


def draw_eye(draw, cx, cy, eye_wh, iris, narrowed=False, upturned=False):
    """Draw a single eye at (cx, cy)."""
    h = 6 if narrowed else 9
    if upturned:
        # Slight upward tilt for pride/surprise
        ell(draw, cx, cy - 3, 14, h, fill=eye_wh)
    else:
        ell(draw, cx, cy, 14, h, fill=eye_wh)
    # Iris
    icy = cy - 3 if upturned else cy
    circle(draw, cx, icy, 7, fill=iris)
    # Pupil
    circle(draw, cx, icy, 4, fill=(12, 8, 5, 255))
    # Catchlight
    circle(draw, cx + 3, icy - 3, 2, fill=(220, 210, 195, 200))


def draw_eyebrow(draw, cx, cy, col, angry=False, raised=False, width=5):
    if angry:
        # Angled down toward centre — stern
        draw.line([(cx - 16, cy - 5), (cx + 14, cy + 4)], fill=col, width=width)
    elif raised:
        # Slightly raised for surprise/teaching
        draw.line([(cx - 14, cy - 4), (cx + 14, cy - 8)], fill=col, width=width)
    else:
        # Natural arc
        draw.line([(cx - 14, cy), (cx + 14, cy - 3)], fill=col, width=width)


def draw_nose(draw, cx, cy, skin_sh, skin, style='round'):
    if style == 'round':
        circle(draw, cx, cy, 9, fill=skin_sh)
        circle(draw, cx, cy - 2, 6, fill=skin)
    elif style == 'angular':
        # Angular bridge + nostrils
        draw.line([(cx, cy - 16), (cx - 4, cy + 8)], fill=skin_sh, width=5)
        draw.line([(cx - 4, cy + 8), (cx + 8, cy + 10)], fill=skin_sh, width=4)
        ell(draw, cx - 8, cy + 6, 6, 5, fill=skin_sh)
        ell(draw, cx + 6, cy + 8, 6, 5, fill=skin_sh)
    elif style == 'gentle':
        draw.line([(cx, cy - 10), (cx - 3, cy + 6)], fill=skin_sh, width=4)
        draw.line([(cx - 3, cy + 6), (cx + 6, cy + 8)], fill=skin_sh, width=3)


def draw_mouth(draw, cx, cy, skin_sh, style='neutral'):
    if style == 'neutral':
        draw.line([(cx - 14, cy + 1), (cx + 14, cy)], fill=skin_sh, width=5)
    elif style == 'smile':
        draw.arc([cx - 14, cy - 4, cx + 14, cy + 12], 10, 170, fill=skin_sh, width=5)
    elif style == 'proud-smile':
        # Slight upturn at corners
        draw.line([(cx - 14, cy + 2), (cx + 14, cy)], fill=skin_sh, width=5)
        draw.line([(cx + 10, cy), (cx + 16, cy - 5)], fill=skin_sh, width=4)
        draw.line([(cx - 10, cy + 2), (cx - 16, cy - 3)], fill=skin_sh, width=4)
    elif style == 'open':
        # Slightly open mouth for speaking
        ell(draw, cx, cy + 4, 13, 9, fill=skin_sh)
        draw.line([(cx - 13, cy + 2), (cx + 13, cy + 1)], fill=skin_sh, width=4)
    elif style == 'snarl':
        draw.line([(cx - 15, cy + 2), (cx + 15, cy)], fill=skin_sh, width=5)
        # Show upper teeth
        draw.line([(cx - 10, cy + 3), (cx + 10, cy + 2)], fill=(215, 205, 192, 255), width=4)


def draw_wrinkles(draw, cx, cy, skin_sh, count=3, width=2):
    """Nasolabial + forehead wrinkle lines for age."""
    for side in [-1, 1]:
        bx = cx + side * 12
        draw.line([(bx, cy + 6), (bx + side * 8, cy + 22)], fill=skin_sh, width=width)
    # Forehead lines
    for i in range(count):
        fy = cy - 50 + i * 10
        draw.line([(cx - 22, fy), (cx + 22, fy - 2)], fill=(*skin_sh[:3], 100), width=width)


# ─── Elder Portrait: Mishoomis (Grandfather) ─────────────────────────────────

def make_elder_mishoomis(proud=False):
    img = new_canvas()
    draw_bg(img, M_BG1, M_BG2, M_BORDER)
    draw = ImageDraw.Draw(img)

    draw_geometric_symbols(draw, M_BG1, M_BORDER)

    # ── Shoulders & neck ──
    draw_neck_shoulders(draw, M_SKIN, M_SKIN_SH, M_CLOTH)

    # ── Braids (behind head) ──
    for side in [-1, 1]:
        bx = CX + side * 64
        # Main braid column
        ell(draw, bx, CY + 25, 16, 72, fill=M_HAIR)
        # Gray streak
        ell(draw, bx + side * 3, CY + 10, 6, 55, fill=M_HAIR_GR)
        # Braid sections (horizontal lines)
        for bi in range(-3, 5):
            by = CY + bi * 16 + 20
            draw.line([(bx - 14, by), (bx + 14, by)], fill=M_OUTLINE, width=3)
        # Braid tie
        ell(draw, bx, CY + 82, 14, 10, fill=M_BAND)

    # ── Head shape ──
    ell(draw, CX, CY - 8, 62, 76, fill=M_SKIN_SH)   # jaw shadow
    ell(draw, CX, CY - 12, 60, 72, fill=M_SKIN)
    ell(draw, CX, CY - 38, 42, 28, fill=M_SKIN_HI)  # forehead highlight

    # ── Ears ──
    draw_ear(draw, CX - 60, CY - 4, 14, 18, M_SKIN, M_SKIN_SH)
    draw_ear(draw, CX + 60, CY - 4, 14, 18, M_SKIN, M_SKIN_SH)

    # ── Headband ──
    draw.rectangle([CX - 64, CY - 50, CX + 64, CY - 34], fill=M_BAND)
    # Medicine wheel diamond centre
    poly(draw, [
        (CX, CY - 56), (CX + 14, CY - 42),
        (CX, CY - 28), (CX - 14, CY - 42),
    ], fill=M_BAND2)
    # Cross of medicine wheel
    draw.line([(CX, CY - 56), (CX, CY - 28)], fill=(*M_OUTLINE[:3], 160), width=3)
    draw.line([(CX - 14, CY - 42), (CX + 14, CY - 42)], fill=(*M_OUTLINE[:3], 160), width=3)
    # Headband pattern dots
    for side in [-1, 1]:
        for di in range(1, 4):
            dx = CX + side * di * 22
            circle(draw, dx, CY - 42, 5, fill=M_BAND2)

    # ── Hair above headband ──
    ell(draw, CX, CY - 65, 56, 28, fill=M_HAIR)
    ell(draw, CX - 8, CY - 70, 30, 18, fill=M_HAIR_GR)
    ell(draw, CX + 10, CY - 72, 22, 14, fill=M_HAIR_GR)

    # ── Wrinkles ──
    draw_wrinkles(draw, CX, CY, M_SKIN_SH, count=3)

    # ── Eyes ──
    ey = CY - 16
    draw_eye(draw, CX - 24, ey, M_EYE_WH, M_EYES, narrowed=proud, upturned=proud)
    draw_eye(draw, CX + 24, ey, M_EYE_WH, M_EYES, narrowed=proud, upturned=proud)
    # Eyelid shadow
    for side in [-1, 1]:
        ell(draw, CX + side * 24, ey - 5, 16, 5, fill=(*M_SKIN_SH[:3], 140))

    # ── Eyebrows ──
    draw_eyebrow(draw, CX - 24, CY - 28, M_HAIR_GR, raised=proud)
    draw_eyebrow(draw, CX + 24, CY - 28, M_HAIR_GR, raised=proud)

    # ── Nose ──
    draw_nose(draw, CX, CY + 4, M_SKIN_SH, M_SKIN, style='round')

    # ── Mouth ──
    draw_mouth(draw, CX, CY + 24, M_SKIN_SH, style='proud-smile' if proud else 'neutral')

    # ── Chin ──
    ell(draw, CX, CY + 52, 28, 14, fill=M_SKIN_SH)

    # ── Proud glow ──
    if proud:
        circle(draw, CX, CY, R - 4, outline=(*M_BAND2[:3], 50), width=8)

    img = soften(img, radius=1.0)
    return img


def gen_elder_mishoomis():
    save(make_elder_mishoomis(proud=False), 'elder-mishoomis.png')


def gen_elder_mishoomis_proud():
    save(make_elder_mishoomis(proud=True), 'elder-mishoomis-proud.png')


# ─── Elder Portrait: Nokomis (Grandmother) ───────────────────────────────────

def make_elder_nokomis(teaching=False):
    """
    Nokomis: elder grandmother with silver braids, sage-green shawl.
    Drawing order: bg → shawl body → neck → head → ears → hair → face details → accessories.
    Nothing is drawn on top of the face after it is placed.
    """
    img = new_canvas()
    draw_bg(img, N_BG1, N_BG2, N_BORDER)
    draw = ImageDraw.Draw(img)

    draw_geometric_symbols(draw, N_BG1, N_BORDER)

    # Face is positioned high (FY = face centre Y), shawl occupies only bottom ~30%
    FY = CY - 28   # face centre — upper portion of disc

    # ── Shawl — only bottom third of disc ──
    poly(draw, [
        (CX - 88, CY + 118), (CX - 72, CY + 58),
        (CX - 36, CY + 38),  (CX + 36, CY + 38),
        (CX + 72, CY + 58),  (CX + 88, CY + 118),
    ], fill=N_SHAWL_DK)
    poly(draw, [
        (CX - 76, CY + 118), (CX - 60, CY + 62),
        (CX - 28, CY + 44),  (CX + 28, CY + 44),
        (CX + 60, CY + 62),  (CX + 76, CY + 118),
    ], fill=N_SHAWL)
    for i in range(3):
        sy = CY + 65 + i * 18
        draw.line([(CX - 65 + i * 10, sy), (CX + 65 - i * 10, sy)],
                  fill=N_SHAWL_LT, width=4)

    # ── Teaching hand ──
    if teaching:
        hx, hy = CX + 74, FY + 20
        ell(draw, hx, hy + 22, 10, 24, fill=N_SKIN)
        ell(draw, hx, hy + 6, 12, 14, fill=N_SKIN_HI)
        for fi, fx in enumerate([-5, 0, 5, 10]):
            fh = 18 + fi * 3
            draw.line([(hx + fx, hy - 2), (hx + fx, hy - 2 - fh)],
                      fill=N_SKIN_HI, width=5)

    # ── Neck ──
    ell(draw, CX, FY + 60, 22, 18, fill=N_SKIN_SH)
    ell(draw, CX, FY + 56, 18, 14, fill=N_SKIN)

    # ── Silver braids — outside the face ──
    for side in [-1, 1]:
        bx = CX + side * 74
        ell(draw, bx, FY + 22, 12, 60, fill=N_HAIR)
        ell(draw, bx, FY + 18, 7, 52, fill=N_HAIR_GR)
        for bi in range(-2, 5):
            by = FY + bi * 13 + 22
            draw.line([(bx - 10, by), (bx + 10, by)], fill=N_HAIR, width=3)
        ell(draw, bx, FY + 76, 8, 6, fill=N_BEAD)

    # ── Head — large, centered at FY ──
    ell(draw, CX, FY + 2, 62, 76, fill=N_SKIN_SH)
    ell(draw, CX, FY, 60, 74, fill=N_SKIN)
    ell(draw, CX, FY - 28, 42, 26, fill=N_SKIN_HI)

    # ── Ears ──
    draw_ear(draw, CX - 60, FY + 4, 12, 15, N_SKIN, N_SKIN_SH)
    draw_ear(draw, CX + 60, FY + 4, 12, 15, N_SKIN, N_SKIN_SH)
    for side in [-1, 1]:
        circle(draw, CX + side * 60, FY + 10, 5, fill=N_BEAD)

    # ── Hair bun (above face) ──
    ell(draw, CX, FY - 62, 48, 20, fill=N_HAIR_GR)
    ell(draw, CX + 3, FY - 65, 32, 14, fill=N_HAIR)
    circle(draw, CX, FY - 62, 12, outline=N_HAIR, width=4)
    circle(draw, CX, FY - 62, 5, fill=N_HAIR)

    # ── Wrinkles ──
    draw_wrinkles(draw, CX, FY + 10, N_SKIN_SH, count=2, width=2)

    # ── Eyes ──
    ey = FY - 8
    draw_eye(draw, CX - 22, ey, N_EYE_WH, N_EYES, upturned=teaching)
    draw_eye(draw, CX + 22, ey, N_EYE_WH, N_EYES, upturned=teaching)
    for side in [-1, 1]:
        ell(draw, CX + side * 22, ey - 5, 15, 4, fill=(*N_SKIN_SH[:3], 120))

    # ── Eyebrows ──
    draw_eyebrow(draw, CX - 22, FY - 20, N_HAIR_GR, raised=teaching)
    draw_eyebrow(draw, CX + 22, FY - 20, N_HAIR_GR, raised=teaching)

    # ── Nose ──
    draw_nose(draw, CX, FY + 14, N_SKIN_SH, N_SKIN, style='gentle')

    # ── Mouth ──
    draw_mouth(draw, CX, FY + 32, N_SKIN_SH, style='open' if teaching else 'smile')

    # ── Chin ──
    ell(draw, CX, FY + 60, 22, 10, fill=N_SKIN_SH)

    # ── Medicine wheel pendant ──
    cx2, cy2 = CX, CY + 52
    circle(draw, cx2, cy2, 10, outline=N_BEAD, width=4)
    draw.line([(cx2 - 10, cy2), (cx2 + 10, cy2)], fill=N_BEAD, width=3)
    draw.line([(cx2, cy2 - 10), (cx2, cy2 + 10)], fill=N_BEAD, width=3)
    for side2 in [-1, 1]:
        circle(draw, cx2 + side2 * 18, cy2 + 3, 4, fill=N_BEAD)

    # ── Teaching radiance ──
    if teaching:
        circle(draw, CX, CY, R - 4, outline=(*N_BORDER[:3], 40), width=6)

    img = soften(img, radius=1.0)
    return img


def gen_elder_nokomis():
    save(make_elder_nokomis(teaching=False), 'elder-nokomis.png')


def gen_elder_nokomis_teaching():
    save(make_elder_nokomis(teaching=True), 'elder-nokomis-teaching.png')


# ─── Elder Portrait: Ogichidaa (War Chief) ───────────────────────────────────

def make_elder_ogichidaa(fierce=False):
    img = new_canvas()
    draw_bg(img, G_BG1, G_BG2, G_BORDER)
    draw = ImageDraw.Draw(img)

    draw_geometric_symbols(draw, G_BG1, G_BORDER)

    # ── Warrior upper body ──
    poly(draw, [
        (CX - 90, CY + 120), (CX - 58, CY + 32),
        (CX - 38, CY + 20),  (CX + 38, CY + 20),
        (CX + 58, CY + 32),  (CX + 90, CY + 120),
    ], fill=G_CLOTH)
    # Warrior sash / collar details
    draw.line([(CX - 30, CY + 25), (CX + 30, CY + 25)], fill=G_PAINT1, width=6)

    # ── Neck ──
    ell(draw, CX, CY + 36, 28, 24, fill=G_SKIN_SH)
    ell(draw, CX, CY + 32, 24, 20, fill=G_SKIN)

    # ── Head shape — angular, strong jaw ──
    # Jaw shape (wider at cheeks, strong chin)
    poly(draw, [
        (CX - 52, CY - 12), (CX - 58, CY + 10),
        (CX - 48, CY + 45), (CX - 20, CY + 62),
        (CX + 20, CY + 62), (CX + 48, CY + 45),
        (CX + 58, CY + 10), (CX + 52, CY - 12),
    ], fill=G_SKIN_SH)
    poly(draw, [
        (CX - 50, CY - 14), (CX - 56, CY + 8),
        (CX - 46, CY + 42), (CX - 18, CY + 58),
        (CX + 18, CY + 58), (CX + 46, CY + 42),
        (CX + 56, CY + 8), (CX + 50, CY - 14),
    ], fill=G_SKIN)
    ell(draw, CX, CY - 38, 44, 28, fill=G_SKIN_HI)  # forehead highlight

    # ── Ears ──
    draw_ear(draw, CX - 56, CY, 13, 17, G_SKIN, G_SKIN_SH)
    draw_ear(draw, CX + 56, CY, 13, 17, G_SKIN, G_SKIN_SH)

    # ── Hair — pulled back, sides tight ──
    ell(draw, CX, CY - 62, 50, 24, fill=G_HAIR)
    # Top ridge / crest
    poly(draw, [
        (CX - 14, CY - 78), (CX, CY - 96),
        (CX + 14, CY - 78), (CX + 10, CY - 52),
        (CX - 10, CY - 52),
    ], fill=G_HAIR)
    # Hair highlight
    ell(draw, CX, CY - 70, 30, 14, fill=(*G_HAIR[:3], 180))

    # ── Eagle feather ──
    # Angled from right side of hair, tilted back
    fx0, fy0 = CX + 28, CY - 62
    angle_r = math.radians(-65)
    flen = 100
    fx1 = int(fx0 + flen * math.cos(angle_r))
    fy1 = int(fy0 + flen * math.sin(angle_r))
    # Shaft
    draw.line([(fx0, fy0), (fx1, fy1)], fill=G_FEATH_DK, width=5)
    # Vane (wider part of feather)
    fmid_x = (fx0 + fx1) // 2
    fmid_y = (fy0 + fy1) // 2
    perp = math.radians(-65 + 90)
    for side in [-1, 1]:
        vane_pts = []
        for t in [0.15, 0.35, 0.55, 0.75, 0.9]:
            bx = fx0 + (fx1 - fx0) * t
            by = fy0 + (fy1 - fy0) * t
            spread = 22 * (1 - t) + 4
            vx = bx + side * spread * math.cos(perp)
            vy = by + side * spread * math.sin(perp)
            vane_pts.append((int(vx), int(vy)))
        vane_pts_full = [(fx0, fy0)] + vane_pts + [(fx1, fy1)]
        poly(draw, vane_pts_full, fill=G_FEATHER if side == 1 else G_FEATH_DK)
    # Dark tip
    circle(draw, fx1, fy1, 8, fill=G_FEATH_TIP)
    # Feather binding
    circle(draw, fx0, fy0, 6, fill=G_PAINT2)

    # ── War paint — two bold horizontal stripes per cheek ──
    for side in [-1, 1]:
        px_base = CX + side * 28
        for i in range(2):
            py = CY + 2 + i * 14
            paint_col = G_PAINT1 if i == 0 else G_PAINT2
            draw.line([(px_base - side * 8, py), (px_base + side * 22, py)],
                      fill=paint_col, width=6)
        if fierce:
            # Extra stripe for fierce variant
            draw.line([(px_base - side * 4, CY + 30), (px_base + side * 18, CY + 30)],
                      fill=G_PAINT1, width=5)

    # ── Wrinkles (stern, fewer than elders) ──
    draw_wrinkles(draw, CX, CY, G_SKIN_SH, count=2, width=2)

    # ── Eyes ──
    ey = CY - 14
    draw_eye(draw, CX - 24, ey, G_EYE_WH, G_EYES, narrowed=fierce)
    draw_eye(draw, CX + 24, ey, G_EYE_WH, G_EYES, narrowed=fierce)
    for side in [-1, 1]:
        ell(draw, CX + side * 24, ey - 4, 16, 4, fill=(*G_SKIN_SH[:3], 130))

    # ── Eyebrows ──
    draw_eyebrow(draw, CX - 24, CY - 28, G_HAIR, angry=fierce, width=7)
    draw_eyebrow(draw, CX + 24, CY - 28, G_HAIR, angry=fierce, width=7)

    # ── Nose ──
    draw_nose(draw, CX, CY + 4, G_SKIN_SH, G_SKIN, style='angular')

    # ── Mouth ──
    draw_mouth(draw, CX, CY + 26, G_SKIN_SH, style='snarl' if fierce else 'neutral')

    # ── Chin — strong, defined ──
    ell(draw, CX, CY + 55, 22, 10, fill=G_SKIN_SH)

    # ── Fierce aura ──
    if fierce:
        circle(draw, CX, CY, R - 4, outline=(*G_BORDER[:3], 70), width=10)

    img = soften(img, radius=1.0)
    return img


def gen_elder_ogichidaa():
    save(make_elder_ogichidaa(fierce=False), 'elder-ogichidaa.png')


def gen_elder_ogichidaa_fierce():
    save(make_elder_ogichidaa(fierce=True), 'elder-ogichidaa-fierce.png')


# ─── Commander Portrait: Oshkaabewis (Deer Totem) ────────────────────────────

def make_portrait_oshkaabewis():
    img = new_canvas()
    draw_bg(img, OSH_BG, OSH_BG2, OSH_BORDER)
    draw = ImageDraw.Draw(img)
    draw_geometric_symbols(draw, OSH_BG, OSH_BORDER)

    # ── Deer head ──
    ell(draw, CX, CY + 8, 54, 65, fill=OSH_BODY)
    ell(draw, CX, CY + 14, 40, 50, fill=OSH_BODY_LT)
    ell(draw, CX, CY - 18, 45, 32, fill=OSH_BODY)
    ell(draw, CX, CY - 25, 32, 20, fill=OSH_BODY_LT)

    # ── Ears ──
    for side in [-1, 1]:
        ecx, ecy = CX + side * 55, CY - 30
        poly(draw, [
            (ecx - side * 14, ecy + 20),
            (ecx + side * 4, ecy - 26),
            (ecx + side * 14, ecy + 10),
        ], fill=OSH_BODY)
        poly(draw, [
            (ecx - side * 7, ecy + 14),
            (ecx + side * 4, ecy - 14),
            (ecx + side * 10, ecy + 6),
        ], fill=OSH_BODY_LT)

    # ── Antlers ──
    for side in [-1, 1]:
        ax, ay = CX + side * 34, CY - 48
        end_x = ax + side * 22
        end_y = ay - 52
        draw.line([(ax, ay), (end_x, end_y)], fill=OSH_ANTLER, width=8)
        draw.line([(ax + side, ay - 2), (end_x + side, end_y - 2)],
                  fill=OSH_ANTLER_LT, width=4)
        # First tine
        t1x = ax + side * 8
        t1y = ay - 18
        draw.line([(t1x, t1y), (t1x + side * 18, t1y - 20)], fill=OSH_ANTLER, width=6)
        # Second tine
        t2x = ax + side * 16
        t2y = ay - 38
        draw.line([(t2x, t2y), (t2x + side * 20, t2y - 14)], fill=OSH_ANTLER, width=6)
        # Tips
        circle(draw, end_x, end_y, 5, fill=OSH_ANTLER_LT)
        circle(draw, t1x + side * 18, t1y - 20, 4, fill=OSH_ANTLER_LT)
        circle(draw, t2x + side * 20, t2y - 14, 4, fill=OSH_ANTLER_LT)

    # ── Eyes ──
    for side in [-1, 1]:
        ex, ey = CX + side * 23, CY - 2
        ell(draw, ex, ey, 13, 11, fill=(45, 30, 15, 255))
        ell(draw, ex, ey, 10, 8, fill=(85, 62, 32, 255))
        circle(draw, ex + side, ey, 5, fill=(28, 18, 8, 255))
        circle(draw, ex + side * 3, ey - 3, 3, fill=(195, 175, 138, 200))

    # ── Nose ──
    ell(draw, CX, CY + 34, 18, 13, fill=OSH_NOSE)
    for side in [-1, 1]:
        circle(draw, CX + side * 7, CY + 35, 5, fill=(38, 26, 16, 255))
    draw.line([(CX, CY + 14), (CX, CY + 22)], fill=OSH_BODY_DK, width=4)

    # ── Mouth ──
    draw.line([(CX, CY + 46), (CX - 9, CY + 54)], fill=OSH_BODY_DK, width=4)
    draw.line([(CX, CY + 46), (CX + 9, CY + 54)], fill=OSH_BODY_DK, width=4)

    # ── Chin patch (white) ──
    ell(draw, CX, CY + 56, 18, 12, fill=(218, 198, 158, 255))

    # ── Fawn spot pattern ──
    for sx, sy in [(-14, -32), (11, -28), (-4, -44), (14, -40), (1, -18)]:
        circle(draw, CX + sx, CY + sy, 5, fill=OSH_BODY_LT)

    img = soften(img, radius=1.0)
    return img


def gen_portrait_oshkaabewis():
    save(make_portrait_oshkaabewis(), 'portrait-oshkaabewis.png')


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Generating elder portraits (TASK-166 semi-flat Ojibwe style)...")
    gen_elder_mishoomis()
    gen_elder_mishoomis_proud()
    gen_elder_nokomis()
    gen_elder_nokomis_teaching()
    gen_elder_ogichidaa()
    gen_elder_ogichidaa_fierce()

    print("\nGenerating commander portrait (portrait-oshkaabewis)...")
    gen_portrait_oshkaabewis()

    print("\nDone!")


if __name__ == '__main__':
    main()
