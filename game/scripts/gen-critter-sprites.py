#!/usr/bin/env python3
"""Generate tiny 16×16 pixel-art critter spritesheets for Ojibwe TD.

Each spritesheet is 48×16 (3 frames): idle, walk-1, walk-2.
Top-down perspective, region-appropriate colour palettes.
"""

from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'critters')
os.makedirs(OUT, exist_ok=True)

def new_sheet():
    """Create a 48×16 RGBA sheet (3 frames)."""
    return Image.new('RGBA', (48, 16), (0, 0, 0, 0))

def frame(sheet, idx):
    """Return a drawing region for frame idx (0-2)."""
    return sheet.crop((idx * 16, 0, (idx + 1) * 16, 16)).copy()

def paste_frame(sheet, img, idx):
    sheet.paste(img, (idx * 16, 0))

def make_frame():
    return Image.new('RGBA', (16, 16), (0, 0, 0, 0))


# ── Squirrel (zaagaiganing – warm brown) ──────────────────────────────────

def gen_squirrel():
    sheet = new_sheet()
    body = (139, 90, 43)
    belly = (200, 160, 100)
    eye = (20, 20, 20)
    tail = (120, 75, 30)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        yo = 0 if fi == 0 else (-1 if fi == 1 else 1)
        # body oval
        d.ellipse([5, 5 + yo, 11, 12 + yo], fill=body)
        # belly
        d.rectangle([7, 8 + yo, 9, 11 + yo], fill=belly)
        # head
        d.ellipse([6, 2 + yo, 10, 6 + yo], fill=body)
        # eye
        d.point((7, 4 + yo), fill=eye)
        # ears
        d.point((6, 2 + yo), fill=body)
        d.point((10, 2 + yo), fill=body)
        # tail (curly)
        d.line([(9, 10 + yo), (12, 8 + yo), (13, 5 + yo)], fill=tail, width=1)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'squirrel.png'))


# ── Frog (zaagaiganing, mashkiig – green) ─────────────────────────────────

def gen_frog():
    sheet = new_sheet()
    body = (60, 140, 50)
    belly = (120, 190, 100)
    eye = (200, 200, 40)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        yo = 0 if fi == 0 else (-1 if fi == 1 else 1)
        # body
        d.ellipse([4, 5 + yo, 12, 13 + yo], fill=body)
        # belly spot
        d.ellipse([6, 8 + yo, 10, 12 + yo], fill=belly)
        # eyes (big, froggy)
        d.ellipse([4, 3 + yo, 7, 6 + yo], fill=eye)
        d.ellipse([9, 3 + yo, 12, 6 + yo], fill=eye)
        d.point((5, 4 + yo), fill=(20, 20, 20))
        d.point((10, 4 + yo), fill=(20, 20, 20))
        # legs spread on walk frames
        if fi == 1:
            d.line([(3, 12), (1, 14)], fill=body, width=1)
            d.line([(13, 12), (15, 14)], fill=body, width=1)
        elif fi == 2:
            d.line([(5, 13), (3, 15)], fill=body, width=1)
            d.line([(11, 13), (13, 15)], fill=body, width=1)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'frog.png'))


# ── Loon (zaagaiganing – black/white waterbird) ──────────────────────────

def gen_loon():
    sheet = new_sheet()
    body = (30, 30, 35)
    white = (220, 220, 225)
    beak = (100, 100, 100)
    eye = (180, 30, 30)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        yo = 0 if fi == 0 else (-1 if fi == 1 else 1)
        # body oval (elongated)
        d.ellipse([3, 6 + yo, 13, 13 + yo], fill=body)
        # white chest spots
        d.point((6, 9 + yo), fill=white)
        d.point((8, 10 + yo), fill=white)
        d.point((10, 9 + yo), fill=white)
        # neck/head
        d.ellipse([5, 2 + yo, 9, 6 + yo], fill=body)
        # white neck band
        d.line([(5, 5 + yo), (9, 5 + yo)], fill=white)
        # eye
        d.point((6, 3 + yo), fill=eye)
        # beak
        d.line([(4, 4 + yo), (2, 4 + yo)], fill=beak)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'loon.png'))


# ── Turtle (mashkiig – brown/green shell) ────────────────────────────────

def gen_turtle():
    sheet = new_sheet()
    shell = (80, 100, 50)
    shell_d = (60, 75, 35)
    skin = (90, 120, 70)
    eye = (20, 20, 20)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        xo = 0 if fi == 0 else (1 if fi == 1 else -1)
        # shell (dome)
        d.ellipse([4, 4, 12, 12], fill=shell)
        # shell pattern
        d.line([(6, 5), (6, 11)], fill=shell_d)
        d.line([(10, 5), (10, 11)], fill=shell_d)
        d.line([(5, 8), (11, 8)], fill=shell_d)
        # head
        d.ellipse([1 + xo, 6, 5 + xo, 10], fill=skin)
        d.point((2 + xo, 7), fill=eye)
        # legs
        d.rectangle([4, 12, 5, 14], fill=skin)
        d.rectangle([11, 12, 12, 14], fill=skin)
        d.rectangle([4, 2, 5, 4], fill=skin)
        d.rectangle([11, 2, 12, 4], fill=skin)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'turtle.png'))


# ── Heron (mashkiig – tall grey/blue standing bird) ──────────────────────

def gen_heron():
    sheet = new_sheet()
    body = (140, 150, 170)
    wing = (110, 120, 140)
    beak = (180, 160, 60)
    eye = (20, 20, 20)
    legs = (160, 140, 80)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        # Heron stands mostly still, slight head bob
        yo = 0 if fi == 0 else (-1 if fi == 1 else 1)
        # body
        d.ellipse([5, 6, 11, 14], fill=body)
        # wing accent
        d.line([(6, 8), (10, 8)], fill=wing)
        # neck
        d.line([(8, 6), (8, 3 + yo)], fill=body, width=1)
        # head
        d.ellipse([6, 1 + yo, 10, 4 + yo], fill=body)
        # eye
        d.point((7, 2 + yo), fill=eye)
        # beak
        d.line([(5, 3 + yo), (3, 3 + yo)], fill=beak)
        # legs
        d.line([(7, 14), (7, 15)], fill=legs)
        d.line([(9, 14), (9, 15)], fill=legs)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'heron.png'))


# ── Rabbit (mitigomizh – grey/brown) ─────────────────────────────────────

def gen_rabbit():
    sheet = new_sheet()
    body = (160, 150, 130)
    belly = (200, 195, 185)
    ear = (180, 160, 140)
    eye = (30, 20, 20)
    nose = (200, 140, 140)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        yo = 0 if fi == 0 else (-1 if fi == 1 else 1)
        # body
        d.ellipse([5, 7 + yo, 12, 14 + yo], fill=body)
        # belly
        d.ellipse([7, 9 + yo, 10, 13 + yo], fill=belly)
        # head
        d.ellipse([5, 3 + yo, 11, 8 + yo], fill=body)
        # ears (tall)
        d.rectangle([6, 0 + yo, 7, 4 + yo], fill=ear)
        d.rectangle([9, 0 + yo, 10, 4 + yo], fill=ear)
        # eye
        d.point((7, 5 + yo), fill=eye)
        # nose
        d.point((6, 6 + yo), fill=nose)
        # tail (cotton)
        d.point((12, 10 + yo), fill=belly)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'rabbit.png'))


# ── Turkey (mitigomizh – dark brown, red wattle) ─────────────────────────

def gen_turkey():
    sheet = new_sheet()
    body = (80, 55, 35)
    tail = (100, 70, 40)
    head = (60, 40, 30)
    wattle = (200, 50, 40)
    eye = (20, 20, 20)
    legs = (160, 130, 60)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        yo = 0 if fi == 0 else (-1 if fi == 1 else 1)
        # body
        d.ellipse([4, 6 + yo, 12, 13 + yo], fill=body)
        # tail fan
        d.ellipse([9, 4 + yo, 15, 11 + yo], fill=tail)
        # head/neck
        d.ellipse([3, 3 + yo, 7, 7 + yo], fill=head)
        # wattle
        d.point((4, 6 + yo), fill=wattle)
        d.point((3, 5 + yo), fill=wattle)
        # eye
        d.point((4, 4 + yo), fill=eye)
        # legs
        d.line([(6, 13 + yo), (6, 15)], fill=legs)
        d.line([(10, 13 + yo), (10, 15)], fill=legs)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'turkey.png'))


# ── Hare (biboon-aki – white/pale, snowshoe hare) ────────────────────────

def gen_hare():
    sheet = new_sheet()
    body = (230, 230, 240)
    belly = (245, 245, 250)
    ear_in = (200, 180, 190)
    eye = (30, 20, 30)
    nose = (200, 160, 170)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        yo = 0 if fi == 0 else (-1 if fi == 1 else 1)
        # body
        d.ellipse([4, 7 + yo, 12, 14 + yo], fill=body)
        d.ellipse([6, 9 + yo, 10, 13 + yo], fill=belly)
        # head
        d.ellipse([4, 3 + yo, 11, 9 + yo], fill=body)
        # ears (long)
        d.rectangle([5, 0 + yo, 6, 4 + yo], fill=body)
        d.rectangle([9, 0 + yo, 10, 4 + yo], fill=body)
        d.point((5, 1 + yo), fill=ear_in)
        d.point((9, 1 + yo), fill=ear_in)
        # eye
        d.point((6, 5 + yo), fill=eye)
        # nose
        d.point((5, 6 + yo), fill=nose)
        # big feet (snowshoe)
        d.rectangle([4, 14 + yo, 6, 15], fill=body)
        d.rectangle([10, 14 + yo, 12, 15], fill=body)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'hare.png'))


# ── Fox (biboon-aki – orange/russet) ─────────────────────────────────────

def gen_fox():
    sheet = new_sheet()
    body = (190, 100, 40)
    belly = (230, 200, 160)
    tail_tip = (240, 235, 230)
    ear = (50, 30, 20)
    eye = (30, 30, 20)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        yo = 0 if fi == 0 else (-1 if fi == 1 else 1)
        # body
        d.ellipse([4, 6 + yo, 11, 13 + yo], fill=body)
        d.ellipse([6, 8 + yo, 9, 12 + yo], fill=belly)
        # head (pointed snout)
        d.ellipse([4, 2 + yo, 10, 7 + yo], fill=body)
        d.point((3, 4 + yo), fill=body)  # snout
        # ears
        d.point((5, 1 + yo), fill=ear)
        d.point((9, 1 + yo), fill=ear)
        # eye
        d.point((6, 4 + yo), fill=eye)
        # tail (bushy)
        d.line([(10, 10 + yo), (13, 8 + yo), (14, 6 + yo)], fill=body, width=1)
        d.point((14, 6 + yo), fill=tail_tip)
        # legs
        d.line([(5, 13 + yo), (5, 15)], fill=ear)
        d.line([(10, 13 + yo), (10, 15)], fill=ear)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'fox.png'))


# ── Owl (biboon-aki – white/grey snowy owl, perched) ─────────────────────

def gen_owl():
    sheet = new_sheet()
    body = (220, 220, 230)
    spots = (180, 180, 190)
    eye = (200, 170, 30)
    beak = (140, 130, 60)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        # Owl is mostly still, head rotation
        xo = 0 if fi == 0 else (1 if fi == 1 else -1)
        # body
        d.ellipse([4, 6, 12, 15], fill=body)
        # spots/bars
        d.point((6, 9), fill=spots)
        d.point((10, 9), fill=spots)
        d.point((8, 11), fill=spots)
        d.point((6, 13), fill=spots)
        d.point((10, 13), fill=spots)
        # head (round)
        d.ellipse([4 + xo, 1, 12 + xo, 8], fill=body)
        # facial disc
        d.ellipse([5 + xo, 2, 11 + xo, 7], fill=(235, 235, 240))
        # eyes (big, yellow)
        d.ellipse([5 + xo, 3, 7 + xo, 5], fill=eye)
        d.ellipse([9 + xo, 3, 11 + xo, 5], fill=eye)
        d.point((6 + xo, 4), fill=(20, 20, 20))
        d.point((10 + xo, 4), fill=(20, 20, 20))
        # beak
        d.point((8 + xo, 5), fill=beak)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'owl.png'))


# ── Raccoon (niizh-miikana – grey with mask) ─────────────────────────────

def gen_raccoon():
    sheet = new_sheet()
    body = (120, 120, 115)
    mask = (40, 40, 40)
    belly = (170, 170, 165)
    eye = (200, 200, 200)
    tail_ring = (60, 60, 55)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        yo = 0 if fi == 0 else (-1 if fi == 1 else 1)
        # body
        d.ellipse([4, 6 + yo, 12, 13 + yo], fill=body)
        d.ellipse([6, 8 + yo, 10, 12 + yo], fill=belly)
        # head
        d.ellipse([4, 2 + yo, 11, 7 + yo], fill=body)
        # mask
        d.line([(5, 4 + yo), (10, 4 + yo)], fill=mask)
        # eyes (in mask)
        d.point((6, 4 + yo), fill=eye)
        d.point((9, 4 + yo), fill=eye)
        # nose
        d.point((7, 5 + yo), fill=(30, 30, 30))
        # ringed tail
        d.line([(10, 11 + yo), (13, 9 + yo), (14, 7 + yo)], fill=body, width=1)
        d.point((12, 9 + yo), fill=tail_ring)
        d.point((14, 7 + yo), fill=tail_ring)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'raccoon.png'))


# ── Beaver (niizh-miikana – dark brown, flat tail) ───────────────────────

def gen_beaver():
    sheet = new_sheet()
    body = (90, 60, 30)
    belly = (140, 110, 70)
    tail = (60, 40, 20)
    eye = (20, 20, 20)
    teeth = (240, 235, 210)

    for fi in range(3):
        f = make_frame()
        d = ImageDraw.Draw(f)
        yo = 0 if fi == 0 else (-1 if fi == 1 else 1)
        # body (chunky)
        d.ellipse([3, 5 + yo, 11, 13 + yo], fill=body)
        d.ellipse([5, 7 + yo, 9, 12 + yo], fill=belly)
        # head
        d.ellipse([3, 2 + yo, 9, 6 + yo], fill=body)
        # eye
        d.point((5, 3 + yo), fill=eye)
        # teeth
        d.point((3, 5 + yo), fill=teeth)
        # flat tail
        d.rectangle([11, 8 + yo, 15, 11 + yo], fill=tail)
        paste_frame(sheet, f, fi)

    sheet.save(os.path.join(OUT, 'beaver.png'))


# ── Generate all ──────────────────────────────────────────────────────────

if __name__ == '__main__':
    gen_squirrel()
    gen_frog()
    gen_loon()
    gen_turtle()
    gen_heron()
    gen_rabbit()
    gen_turkey()
    gen_hare()
    gen_fox()
    gen_owl()
    gen_raccoon()
    gen_beaver()
    print(f'Generated 12 critter spritesheets in {OUT}')
