#!/usr/bin/env python3
"""
Generate character portrait assets for Ojibwe TD.

Creates 96×96 RGBA PNG portraits at 2× internal resolution (192×192)
then downscales for anti-aliasing.

Portraits generated:
  Elder portraits (narrative speakers):
    - elder-mishoomis.png        (wise grandfather, warm brown)
    - elder-mishoomis-proud.png  (proud expression variant)
    - elder-nokomis.png          (wise grandmother, forest green)
    - elder-nokomis-teaching.png (teaching expression variant)
    - elder-ogichidaa.png        (war chief, deep red)
    - elder-ogichidaa-fierce.png (fierce expression variant)

  Commander portrait (missing):
    - portrait-oshkaabewis.png   (deer totem, economy, autumn gold)
"""

import math
import os
from PIL import Image, ImageDraw

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'portraits')
FINAL_SIZE = 96
WORK_SIZE = FINAL_SIZE * 3  # 3× for smooth anti-aliasing
CX = WORK_SIZE // 2
CY = WORK_SIZE // 2


def new_canvas():
    """Create a transparent RGBA canvas at working resolution."""
    return Image.new('RGBA', (WORK_SIZE, WORK_SIZE), (0, 0, 0, 0))


def save(img, filename):
    """Downscale to 96×96 and save."""
    out = img.resize((FINAL_SIZE, FINAL_SIZE), Image.LANCZOS)
    path = os.path.join(OUTPUT_DIR, filename)
    out.save(path)
    print(f"  Saved {filename} ({os.path.getsize(path)} bytes)")


def circle(draw, cx, cy, r, fill=None, outline=None, width=0):
    """Draw a circle centered at (cx, cy) with radius r."""
    draw.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        fill=fill, outline=outline, width=width
    )


def ellipse(draw, cx, cy, rx, ry, fill=None, outline=None, width=0):
    """Draw an ellipse centered at (cx, cy)."""
    draw.ellipse(
        [cx - rx, cy - ry, cx + rx, cy + ry],
        fill=fill, outline=outline, width=width
    )


def arc(draw, cx, cy, rx, ry, start, end, fill=None, width=1):
    """Draw an arc."""
    draw.arc(
        [cx - rx, cy - ry, cx + rx, cy + ry],
        start, end, fill=fill, width=width
    )


def polygon(draw, points, fill=None, outline=None, width=0):
    """Draw a polygon."""
    draw.polygon(points, fill=fill, outline=outline)
    if outline and width > 1:
        draw.line(points + [points[0]], fill=outline, width=width)


# ── Color Palettes ────────────────────────────────────────────────────────────

# Mishoomis — warm brown / earth
MISH_BG        = (62, 40, 20, 255)      # dark warm brown bg
MISH_SKIN      = (180, 140, 100, 255)   # warm skin
MISH_SKIN_LT   = (200, 165, 125, 255)   # highlight
MISH_SKIN_DK   = (140, 100, 70, 255)    # shadow
MISH_HAIR      = (60, 45, 35, 255)      # dark hair with silver
MISH_HAIR_GRAY = (140, 130, 120, 255)   # silver streaks
MISH_HEADBAND  = (160, 50, 40, 255)     # red headband
MISH_HEADBAND2 = (200, 175, 60, 255)    # yellow/gold accent
MISH_OUTLINE   = (40, 25, 15, 255)      # dark outline
MISH_EYE       = (50, 35, 25, 255)      # eye color

# Nokomis — forest green / herbal
NOK_BG        = (28, 42, 28, 255)       # dark forest green bg
NOK_SKIN      = (170, 130, 95, 255)     # warm skin
NOK_SKIN_LT   = (195, 158, 120, 255)
NOK_SKIN_DK   = (130, 95, 65, 255)
NOK_HAIR      = (55, 40, 30, 255)       # dark hair
NOK_HAIR_GRAY = (130, 120, 110, 255)    # gray streaks
NOK_SHAWL     = (45, 90, 55, 255)       # green shawl
NOK_SHAWL_LT  = (65, 120, 75, 255)
NOK_ACCENT    = (180, 160, 60, 255)     # gold accent
NOK_OUTLINE   = (20, 30, 20, 255)
NOK_EYE       = (40, 30, 20, 255)

# Ogichidaa — deep red / warrior
OGI_BG        = (50, 16, 10, 255)       # dark red bg
OGI_SKIN      = (165, 120, 85, 255)     # skin
OGI_SKIN_LT   = (190, 150, 112, 255)
OGI_SKIN_DK   = (120, 80, 55, 255)
OGI_HAIR      = (30, 20, 15, 255)       # jet black hair
OGI_PAINT     = (180, 40, 30, 255)      # war paint red
OGI_PAINT2    = (200, 50, 35, 255)      # war paint highlight
OGI_FEATHER   = (200, 190, 170, 255)    # eagle feather
OGI_FEATHER_DK= (160, 150, 130, 255)
OGI_OUTLINE   = (30, 10, 8, 255)
OGI_EYE       = (40, 20, 15, 255)

# Oshkaabewis — autumn gold / economy
OSH_BG        = (45, 35, 15, 255)       # dark warm bg
OSH_BODY      = (160, 120, 50, 255)     # deer body
OSH_BODY_LT   = (200, 160, 80, 255)    # deer highlight
OSH_BODY_DK   = (120, 85, 35, 255)     # deer shadow
OSH_ANTLER    = (140, 110, 70, 255)     # antler color
OSH_ANTLER_LT = (175, 145, 95, 255)
OSH_NOSE      = (60, 40, 25, 255)       # nose/eye
OSH_EYE       = (50, 35, 20, 255)
OSH_OUTLINE   = (35, 25, 10, 255)
OSH_ACCENT    = (200, 150, 42, 255)     # gold accent ring


# ── Elder Portrait: Mishoomis (Grandfather) ──────────────────────────────────

def draw_mishoomis_base(draw, proud=False):
    """Draw Mishoomis — wise grandfather with braids and headband."""
    # Background circle
    circle(draw, CX, CY, CX - 6, fill=MISH_BG)
    circle(draw, CX, CY, CX - 6, outline=MISH_OUTLINE, width=6)

    # Neck / collar area
    ellipse(draw, CX, CY + 80, 55, 35, fill=MISH_SKIN_DK)

    # Braids hanging down on either side
    for side in [-1, 1]:
        bx = CX + side * 62
        # Braid body
        ellipse(draw, bx, CY + 30, 14, 65, fill=MISH_HAIR)
        # Gray streak on braid
        ellipse(draw, bx + side * 3, CY + 20, 5, 50, fill=MISH_HAIR_GRAY)
        # Braid tie
        ellipse(draw, bx, CY + 80, 12, 8, fill=MISH_HEADBAND)

    # Head shape — slightly elongated oval
    ellipse(draw, CX, CY - 5, 60, 72, fill=MISH_SKIN)

    # Forehead highlight
    ellipse(draw, CX, CY - 35, 40, 25, fill=MISH_SKIN_LT)

    # Headband
    draw.rectangle([CX - 62, CY - 45, CX + 62, CY - 30], fill=MISH_HEADBAND)
    # Headband center diamond
    polygon(draw, [
        (CX, CY - 50), (CX + 10, CY - 37),
        (CX, CY - 24), (CX - 10, CY - 37)
    ], fill=MISH_HEADBAND2)

    # Hair above headband
    ellipse(draw, CX, CY - 60, 55, 30, fill=MISH_HAIR)
    ellipse(draw, CX - 10, CY - 65, 30, 18, fill=MISH_HAIR_GRAY)

    # Eyes
    eye_y = CY - 10
    for side in [-1, 1]:
        ex = CX + side * 22
        if proud:
            # Proud — slightly narrowed, upturned
            ellipse(draw, ex, eye_y, 11, 6, fill=(240, 230, 215, 255))
            circle(draw, ex + side * 2, eye_y, 5, fill=MISH_EYE)
            # Upturned crow's feet
            draw.line([(ex + side * 12, eye_y - 2), (ex + side * 18, eye_y - 6)],
                      fill=MISH_SKIN_DK, width=3)
        else:
            # Default — kind, slightly drooped
            ellipse(draw, ex, eye_y, 11, 7, fill=(240, 230, 215, 255))
            circle(draw, ex, eye_y + 1, 5, fill=MISH_EYE)
            # Gentle crow's feet
            draw.line([(ex + side * 12, eye_y), (ex + side * 17, eye_y + 3)],
                      fill=MISH_SKIN_DK, width=3)

    # Eyebrows
    for side in [-1, 1]:
        ex = CX + side * 22
        if proud:
            draw.line([(ex - 13, CY - 22), (ex + 13, CY - 25)],
                      fill=MISH_HAIR_GRAY, width=4)
        else:
            draw.line([(ex - 12, CY - 23), (ex + 12, CY - 20)],
                      fill=MISH_HAIR_GRAY, width=4)

    # Nose
    draw.line([(CX, CY - 5), (CX - 3, CY + 12)], fill=MISH_SKIN_DK, width=4)
    draw.line([(CX - 3, CY + 12), (CX + 5, CY + 14)], fill=MISH_SKIN_DK, width=3)

    # Mouth
    if proud:
        # Slight smile — proud
        arc(draw, CX, CY + 22, 14, 8, 10, 170, fill=MISH_SKIN_DK, width=4)
    else:
        # Neutral, gentle
        draw.line([(CX - 12, CY + 28), (CX + 12, CY + 27)],
                  fill=MISH_SKIN_DK, width=3)

    # Wrinkle lines (wisdom lines)
    for side in [-1, 1]:
        draw.line([(CX + side * 14, CY + 15), (CX + side * 20, CY + 30)],
                  fill=MISH_SKIN_DK, width=2)

    # Chin shadow
    arc(draw, CX, CY + 40, 30, 12, 20, 160, fill=MISH_SKIN_DK, width=3)

    if proud:
        # Subtle golden glow around headband for proud variant
        circle(draw, CX, CY - 37, 70, outline=(200, 175, 60, 40), width=4)


def make_elder_mishoomis():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    draw_mishoomis_base(draw, proud=False)
    save(img, 'elder-mishoomis.png')


def make_elder_mishoomis_proud():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    draw_mishoomis_base(draw, proud=True)
    save(img, 'elder-mishoomis-proud.png')


# ── Elder Portrait: Nokomis (Grandmother) ────────────────────────────────────

def draw_nokomis_base(draw, teaching=False):
    """Draw Nokomis — wise grandmother with shawl and medicine knowledge."""
    # Background circle
    circle(draw, CX, CY, CX - 6, fill=NOK_BG)
    circle(draw, CX, CY, CX - 6, outline=NOK_OUTLINE, width=6)

    # Shawl / wrap
    polygon(draw, [
        (CX - 75, CY + 10), (CX, CY - 30),
        (CX + 75, CY + 10), (CX + 70, CY + 100),
        (CX - 70, CY + 100)
    ], fill=NOK_SHAWL)
    # Shawl pattern — diagonal lines
    for i in range(-3, 4):
        y_off = i * 22
        draw.line([(CX - 60, CY + 30 + y_off), (CX + 60, CY + 50 + y_off)],
                  fill=NOK_SHAWL_LT, width=3)

    # Hair peeking out from shawl — wrapped/bunned style
    ellipse(draw, CX, CY - 50, 50, 28, fill=NOK_HAIR)
    ellipse(draw, CX, CY - 55, 35, 18, fill=NOK_HAIR_GRAY)

    # Head shape — rounder, softer
    ellipse(draw, CX, CY - 5, 55, 65, fill=NOK_SKIN)

    # Forehead highlight
    ellipse(draw, CX, CY - 30, 35, 20, fill=NOK_SKIN_LT)

    # Shawl over forehead
    arc(draw, CX, CY - 18, 58, 55, 200, 340, fill=NOK_SHAWL, width=12)

    # Eyes
    eye_y = CY - 8
    for side in [-1, 1]:
        ex = CX + side * 20
        if teaching:
            # Teaching — wider, more open
            ellipse(draw, ex, eye_y, 10, 8, fill=(240, 230, 215, 255))
            circle(draw, ex, eye_y, 5, fill=NOK_EYE)
            # Attentive brow
            draw.line([(ex - 12, CY - 21), (ex + 10, CY - 22)],
                      fill=NOK_HAIR_GRAY, width=4)
        else:
            # Default — warm, slightly crinkled
            ellipse(draw, ex, eye_y, 10, 6, fill=(240, 230, 215, 255))
            circle(draw, ex, eye_y + 1, 4, fill=NOK_EYE)
            # Gentle brows
            draw.line([(ex - 11, CY - 19), (ex + 11, CY - 20)],
                      fill=NOK_HAIR_GRAY, width=3)

    # Crow's feet
    for side in [-1, 1]:
        ex = CX + side * 20
        draw.line([(ex + side * 11, eye_y), (ex + side * 16, eye_y + 4)],
                  fill=NOK_SKIN_DK, width=2)

    # Nose — small, rounded
    circle(draw, CX, CY + 8, 7, fill=NOK_SKIN_DK)
    circle(draw, CX, CY + 7, 5, fill=NOK_SKIN)

    # Mouth
    if teaching:
        # Open mouth — speaking/teaching
        ellipse(draw, CX, CY + 24, 10, 7, fill=MISH_SKIN_DK)
        arc(draw, CX, CY + 22, 12, 4, 200, 340, fill=NOK_SKIN, width=3)
    else:
        # Gentle smile
        arc(draw, CX, CY + 24, 12, 6, 10, 170, fill=NOK_SKIN_DK, width=3)

    # Wrinkle / laugh lines
    for side in [-1, 1]:
        draw.line([(CX + side * 12, CY + 14), (CX + side * 17, CY + 28)],
                  fill=NOK_SKIN_DK, width=2)

    # Gold accent on shawl — small medicine wheel symbol
    acc_x, acc_y = CX, CY + 55
    circle(draw, acc_x, acc_y, 10, outline=NOK_ACCENT, width=3)
    draw.line([(acc_x - 10, acc_y), (acc_x + 10, acc_y)], fill=NOK_ACCENT, width=2)
    draw.line([(acc_x, acc_y - 10), (acc_x, acc_y + 10)], fill=NOK_ACCENT, width=2)

    if teaching:
        # Teaching hand gesture — raised hand on one side
        hx, hy = CX + 60, CY + 20
        # Forearm
        ellipse(draw, hx, hy + 15, 10, 22, fill=NOK_SKIN)
        # Hand (open, palm forward)
        ellipse(draw, hx, hy - 5, 12, 14, fill=NOK_SKIN_LT)
        # Fingers (simplified)
        for fx in [-6, -2, 2, 6]:
            draw.line([(hx + fx, hy - 16), (hx + fx, hy - 26)],
                      fill=NOK_SKIN_LT, width=4)


def make_elder_nokomis():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    draw_nokomis_base(draw, teaching=False)
    save(img, 'elder-nokomis.png')


def make_elder_nokomis_teaching():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    draw_nokomis_base(draw, teaching=True)
    save(img, 'elder-nokomis-teaching.png')


# ── Elder Portrait: Ogichidaa (War Chief) ────────────────────────────────────

def draw_ogichidaa_base(draw, fierce=False):
    """Draw Ogichidaa — fierce war chief with eagle feather and war paint."""
    # Background circle
    circle(draw, CX, CY, CX - 6, fill=OGI_BG)
    circle(draw, CX, CY, CX - 6, outline=OGI_OUTLINE, width=6)

    # Neck / shoulders
    polygon(draw, [
        (CX - 65, CY + 50), (CX - 40, CY + 15),
        (CX + 40, CY + 15), (CX + 65, CY + 50),
        (CX + 60, CY + 100), (CX - 60, CY + 100)
    ], fill=OGI_SKIN_DK)

    # Head shape — more angular, strong jaw
    ellipse(draw, CX, CY - 8, 56, 68, fill=OGI_SKIN)
    # Strong jawline overlay
    polygon(draw, [
        (CX - 45, CY + 10), (CX - 50, CY + 40),
        (CX - 15, CY + 58), (CX + 15, CY + 58),
        (CX + 50, CY + 40), (CX + 45, CY + 10)
    ], fill=OGI_SKIN)

    # Forehead highlight
    ellipse(draw, CX, CY - 35, 38, 22, fill=OGI_SKIN_LT)

    # Hair — pulled back tight, sides shaved short
    ellipse(draw, CX, CY - 60, 48, 25, fill=OGI_HAIR)
    # Mohawk / crest
    polygon(draw, [
        (CX - 12, CY - 80), (CX, CY - 95),
        (CX + 12, CY - 80), (CX + 8, CY - 45),
        (CX - 8, CY - 45)
    ], fill=OGI_HAIR)

    # Eagle feather — angled from hair
    fx, fy = CX + 35, CY - 65
    # Feather shaft
    draw.line([(fx, fy), (fx + 20, fy - 40)], fill=OGI_FEATHER_DK, width=3)
    # Feather vane
    polygon(draw, [
        (fx + 20, fy - 40), (fx + 10, fy - 20),
        (fx + 25, fy - 15), (fx + 30, fy - 35)
    ], fill=OGI_FEATHER)
    polygon(draw, [
        (fx + 20, fy - 40), (fx + 30, fy - 35),
        (fx + 35, fy - 18), (fx + 25, fy - 15)
    ], fill=OGI_FEATHER_DK)
    # Dark feather tip
    polygon(draw, [
        (fx + 20, fy - 40), (fx + 25, fy - 42),
        (fx + 30, fy - 35)
    ], fill=OGI_HAIR)

    # War paint — two bold red stripes across each cheek
    for side in [-1, 1]:
        base_x = CX + side * 25
        for i in range(2):
            py = CY + 5 + i * 12
            draw.line([(base_x - 18, py), (base_x + 10, py)],
                      fill=OGI_PAINT if i == 0 else OGI_PAINT2, width=5)

    # Eyes
    eye_y = CY - 10
    for side in [-1, 1]:
        ex = CX + side * 22
        if fierce:
            # Fierce — narrowed, intense
            ellipse(draw, ex, eye_y, 11, 5, fill=(240, 230, 215, 255))
            circle(draw, ex + side * 2, eye_y, 4, fill=OGI_EYE)
            # Angry brow — pushed down
            draw.line([(ex - side * 12, CY - 22), (ex + side * 8, CY - 17)],
                      fill=OGI_HAIR, width=5)
        else:
            # Default — stern but composed
            ellipse(draw, ex, eye_y, 11, 7, fill=(240, 230, 215, 255))
            circle(draw, ex, eye_y, 5, fill=OGI_EYE)
            # Straight stern brow
            draw.line([(ex - 13, CY - 20), (ex + 13, CY - 21)],
                      fill=OGI_HAIR, width=5)

    # Nose — strong, angular
    polygon(draw, [
        (CX - 3, CY - 8), (CX, CY + 12),
        (CX + 8, CY + 10), (CX + 3, CY - 5)
    ], fill=OGI_SKIN_DK)

    # Mouth
    if fierce:
        # Snarl — showing teeth
        draw.line([(CX - 15, CY + 26), (CX + 15, CY + 24)],
                  fill=OGI_SKIN_DK, width=4)
        # Upper teeth line
        draw.line([(CX - 10, CY + 27), (CX + 10, CY + 26)],
                  fill=(220, 210, 200, 255), width=3)
    else:
        # Firm set mouth
        draw.line([(CX - 14, CY + 27), (CX + 14, CY + 26)],
                  fill=OGI_SKIN_DK, width=4)

    if fierce:
        # Red glow around border for fierce variant
        circle(draw, CX, CY, CX - 3, outline=(180, 40, 30, 60), width=5)


def make_elder_ogichidaa():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    draw_ogichidaa_base(draw, fierce=False)
    save(img, 'elder-ogichidaa.png')


def make_elder_ogichidaa_fierce():
    img = new_canvas()
    draw = ImageDraw.Draw(img)
    draw_ogichidaa_base(draw, fierce=True)
    save(img, 'elder-ogichidaa-fierce.png')


# ── Commander Portrait: Oshkaabewis (Deer Totem) ─────────────────────────────

def make_portrait_oshkaabewis():
    """
    Deer portrait in the same iconic/geometric style as the other
    commander portraits (bear, swan, lynx, owl).
    Oshkaabewis = Loon Clan, Deer totem, Economy role, autumn gold.
    """
    img = new_canvas()
    draw = ImageDraw.Draw(img)

    # Background circle — dark warm tone
    circle(draw, CX, CY, CX - 6, fill=OSH_BG)

    # Gold accent ring (inner)
    circle(draw, CX, CY, CX - 12, outline=OSH_ACCENT, width=5)

    # Deer head — facing forward, geometric style
    # Main head shape
    ellipse(draw, CX, CY + 10, 52, 62, fill=OSH_BODY)

    # Lighter face center
    ellipse(draw, CX, CY + 18, 35, 45, fill=OSH_BODY_LT)

    # Forehead
    ellipse(draw, CX, CY - 20, 42, 30, fill=OSH_BODY)

    # Ears — pointed, angled outward
    for side in [-1, 1]:
        ear_cx = CX + side * 52
        ear_cy = CY - 28
        polygon(draw, [
            (ear_cx - side * 15, ear_cy + 18),
            (ear_cx, ear_cy - 20),
            (ear_cx + side * 12, ear_cy + 8),
        ], fill=OSH_BODY)
        # Inner ear
        polygon(draw, [
            (ear_cx - side * 8, ear_cy + 12),
            (ear_cx + side * 2, ear_cy - 10),
            (ear_cx + side * 8, ear_cy + 5),
        ], fill=OSH_BODY_LT)

    # Antlers — branching, geometric
    for side in [-1, 1]:
        ax = CX + side * 32
        ay = CY - 45

        # Main beam going up and outward
        draw.line([(ax, ay), (ax + side * 18, ay - 45)],
                  fill=OSH_ANTLER, width=7)
        # Beam highlight
        draw.line([(ax + side * 1, ay - 2), (ax + side * 17, ay - 43)],
                  fill=OSH_ANTLER_LT, width=4)

        # First tine (lower, forward)
        t1x = ax + side * 6
        t1y = ay - 15
        draw.line([(t1x, t1y), (t1x + side * 15, t1y - 18)],
                  fill=OSH_ANTLER, width=5)

        # Second tine (upper, back)
        t2x = ax + side * 14
        t2y = ay - 35
        draw.line([(t2x, t2y), (t2x + side * 18, t2y - 12)],
                  fill=OSH_ANTLER, width=5)

        # Tips — lighter
        circle(draw, ax + side * 18, ay - 45, 4, fill=OSH_ANTLER_LT)
        circle(draw, t1x + side * 15, t1y - 18, 3, fill=OSH_ANTLER_LT)
        circle(draw, t2x + side * 18, t2y - 12, 3, fill=OSH_ANTLER_LT)

    # Eyes — large, gentle, side-placed
    eye_y = CY - 2
    for side in [-1, 1]:
        ex = CX + side * 22
        # Eye white
        ellipse(draw, ex, eye_y, 12, 10, fill=(50, 35, 20, 255))
        # Iris
        ellipse(draw, ex, eye_y, 10, 8, fill=(90, 65, 35, 255))
        # Pupil
        circle(draw, ex + side * 1, eye_y, 5, fill=(30, 20, 10, 255))
        # Eye highlight
        circle(draw, ex + side * 3, eye_y - 3, 3, fill=(200, 180, 140, 255))

    # Nose — dark, heart-shaped deer nose
    ellipse(draw, CX, CY + 35, 16, 12, fill=OSH_NOSE)
    # Nostril highlights
    for side in [-1, 1]:
        circle(draw, CX + side * 6, CY + 36, 4, fill=(40, 28, 18, 255))
    # Nose bridge line
    draw.line([(CX, CY + 12), (CX, CY + 24)], fill=OSH_BODY_DK, width=3)

    # Mouth line
    draw.line([(CX, CY + 46), (CX - 8, CY + 52)], fill=OSH_BODY_DK, width=3)
    draw.line([(CX, CY + 46), (CX + 8, CY + 52)], fill=OSH_BODY_DK, width=3)

    # White chin patch
    ellipse(draw, CX, CY + 55, 20, 14, fill=(220, 200, 160, 255))

    # Subtle spots on forehead (fawn markings)
    for sx, sy in [(-12, -30), (10, -25), (-5, -40), (15, -38), (0, -15)]:
        circle(draw, CX + sx, CY + sy, 4, fill=OSH_BODY_LT)

    # Outer border
    circle(draw, CX, CY, CX - 6, outline=OSH_OUTLINE, width=6)

    save(img, 'portrait-oshkaabewis.png')


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Generating elder portraits...")
    make_elder_mishoomis()
    make_elder_mishoomis_proud()
    make_elder_nokomis()
    make_elder_nokomis_teaching()
    make_elder_ogichidaa()
    make_elder_ogichidaa_fierce()

    print("\nGenerating missing commander portrait...")
    make_portrait_oshkaabewis()

    print("\nDone! All portraits generated.")


if __name__ == '__main__':
    main()
