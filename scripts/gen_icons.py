#!/usr/bin/env python3
"""
Generate 8 original 64×64 PNG tower icons for Ojibwe TD.
Uses only SVG primitives — no Blizzard-derived content.
Run from any directory; outputs to converted_assets/.
"""

import os
import subprocess
import math

OUT = os.path.join(os.path.dirname(__file__), '..', 'converted_assets')
TMP = '/tmp/ojibwe_icons'
os.makedirs(TMP, exist_ok=True)


def icon(name: str, body: str) -> None:
    """Wrap body SVG in the standard 64×64 template and convert to PNG."""
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <!-- Dark rounded background -->
  <rect x="1" y="1" width="62" height="62" rx="9" ry="9"
        fill="#0a120a" stroke="#1e301e" stroke-width="2"/>
{body}
</svg>"""
    svg_path = os.path.join(TMP, f'{name}.svg')
    png_path = os.path.join(OUT, f'{name}.png')

    with open(svg_path, 'w') as f:
        f.write(svg)

    result = subprocess.run(
        ['convert', '-background', 'none', '-density', '96', svg_path, png_path],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f'  ERROR {name}: {result.stderr.strip()}')
    else:
        print(f'  ✓  {name}.png')


def arm(cx, cy, r, angle_deg):
    """Return (x, y) of a point at angle_deg from center at radius r."""
    a = math.radians(angle_deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


# ─────────────────────────────────────────────────────────────────────────────
# 1. CANNON — solid iron cannonball with specular highlight
# ─────────────────────────────────────────────────────────────────────────────
icon('icon-cannon', """
  <!-- Ball shadow -->
  <circle cx="33" cy="36" r="19" fill="#1a2233" opacity="0.6"/>
  <!-- Ball body -->
  <circle cx="31" cy="33" r="19" fill="#3c4e5a"/>
  <!-- Mid tone band -->
  <circle cx="31" cy="33" r="14" fill="#4a606e"/>
  <!-- Specular highlight -->
  <ellipse cx="25" cy="25" rx="6" ry="4" fill="#c0d4e0" opacity="0.55"
           transform="rotate(-25 25 25)"/>
  <ellipse cx="23" cy="23" rx="2.5" ry="1.5" fill="white" opacity="0.7"
           transform="rotate(-25 23 23)"/>
""")


# ─────────────────────────────────────────────────────────────────────────────
# 2. FROST — 6-arm snowflake, icy blue-white
# ─────────────────────────────────────────────────────────────────────────────
# Arms at 90°, 30°, 150° (and their opposites at 270°, 210°, 330°)
_frost_lines = []
for angle in [90, 30, 150]:
    x1, y1 = arm(32, 32, 22, angle)
    x2, y2 = arm(32, 32, 22, angle + 180)
    _frost_lines.append(
        f'  <line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>'
    )
    # Crossbars at 55% and 85% from center on each arm end
    for dist in [13, 20]:
        for sign in [1, -1]:
            ex, ey = arm(32, 32, dist * sign, angle)
            bx1, by1 = arm(ex, ey, 5, angle + 90)
            bx2, by2 = arm(ex, ey, 5, angle - 90)
            _frost_lines.append(
                f'  <line x1="{bx1:.1f}" y1="{by1:.1f}" x2="{bx2:.1f}" y2="{by2:.1f}"/>'
            )

icon('icon-frost', f"""
  <g stroke="#88ccff" stroke-width="2.5" stroke-linecap="round">
{chr(10).join(_frost_lines)}
  </g>
  <!-- Hex tips -->
  {''.join(f'<circle cx="{arm(32,32,22,a)[0]:.1f}" cy="{arm(32,32,22,a)[1]:.1f}" r="2.5" fill="#bbddff"/>'
           for a in [90, 150, 210, 270, 330, 30])}
  <!-- Center hub -->
  <circle cx="32" cy="32" r="4" fill="#ddeeff"/>
""")


# ─────────────────────────────────────────────────────────────────────────────
# 3. MORTAR — starburst explosion (ground AoE)
# ─────────────────────────────────────────────────────────────────────────────
# 8-pointed star polygon: outer at r=21, inner at r=9, 8 points
_mortar_pts = []
for i in range(16):
    r = 21 if i % 2 == 0 else 9
    a = math.radians(i * 22.5 - 90)
    _mortar_pts.append(f'{32 + r*math.cos(a):.1f},{32 + r*math.sin(a):.1f}')
_mortar_star = ' '.join(_mortar_pts)

icon('icon-mortar', f"""
  <!-- Outer glow -->
  <polygon points="{_mortar_star}" fill="#ff7700" opacity="0.35"/>
  <!-- Core star -->
  <polygon points="{_mortar_star}" fill="#ffaa22" transform="scale(0.85) translate(5.6 5.6)"/>
  <!-- Hot center -->
  <circle cx="32" cy="32" r="10" fill="#ffdd44"/>
  <circle cx="32" cy="32" r="5"  fill="white" opacity="0.8"/>
""")


# ─────────────────────────────────────────────────────────────────────────────
# 4. POISON — venomous spider (top-down view, green palette)
# ─────────────────────────────────────────────────────────────────────────────
icon('icon-poison', """
  <!-- Legs (behind body) — 4 pairs with knee bends -->
  <g stroke="#22aa44" stroke-width="2.8" stroke-linecap="round" fill="none">
    <!-- Right legs (front to back) -->
    <path d="M37,20 Q46,8 53,10"/>
    <path d="M39,25 Q52,14 57,20"/>
    <path d="M39,31 Q52,40 56,48"/>
    <path d="M37,36 Q44,50 50,56"/>
    <!-- Left legs (front to back) -->
    <path d="M27,20 Q18,8 11,10"/>
    <path d="M25,25 Q12,14 7,20"/>
    <path d="M25,31 Q12,40 8,48"/>
    <path d="M27,36 Q20,50 14,56"/>
  </g>
  <!-- Abdomen (rear, larger) -->
  <ellipse cx="32" cy="39" rx="11" ry="12" fill="#22bb44"/>
  <ellipse cx="30" cy="36" rx="6" ry="6" fill="#44dd66" opacity="0.35"/>
  <!-- Hourglass marking -->
  <path d="M32,33 L29,37 L32,42 L35,37 Z" fill="#cc2222" opacity="0.75"/>
  <!-- Waist connector -->
  <ellipse cx="32" cy="29" rx="4" ry="3" fill="#1a8833"/>
  <!-- Cephalothorax (front, smaller) -->
  <ellipse cx="32" cy="22" rx="8" ry="7" fill="#22bb44"/>
  <ellipse cx="30" cy="20" rx="4" ry="3.5" fill="#44dd66" opacity="0.4"/>
  <!-- Eyes (main pair — bright) -->
  <circle cx="29" cy="19" r="2" fill="#88ff44"/>
  <circle cx="35" cy="19" r="2" fill="#88ff44"/>
  <circle cx="29" cy="19" r="0.8" fill="white" opacity="0.7"/>
  <circle cx="35" cy="19" r="0.8" fill="white" opacity="0.7"/>
  <!-- Fangs (small venom drips) -->
  <line x1="30" y1="26" x2="28" y2="29" stroke="#55ff99" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="34" y1="26" x2="36" y2="29" stroke="#55ff99" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Venom droplets -->
  <circle cx="28" cy="30" r="1.2" fill="#55ff99" opacity="0.7"/>
  <circle cx="36" cy="30" r="1.2" fill="#55ff99" opacity="0.7"/>
""")


# ─────────────────────────────────────────────────────────────────────────────
# 5. TESLA — lightning bolt, electric yellow
# ─────────────────────────────────────────────────────────────────────────────
icon('icon-tesla', """
  <!-- Outer glow / shadow -->
  <polygon points="40,8 27,32 35,32 24,56 45,28 35,28 46,8"
           fill="#ff9900" opacity="0.3" transform="translate(1,1)"/>
  <!-- Bolt body -->
  <polygon points="39,8 26,32 34,32 23,56 44,28 34,28 45,8"
           fill="#ffdd00"/>
  <!-- Inner highlight -->
  <polygon points="36,14 27,32 33,32 26,48 40,30 34,30 41,14"
           fill="white" opacity="0.45"/>
""")


# ─────────────────────────────────────────────────────────────────────────────
# 6. AURA — concentric golden radiance rings
# ─────────────────────────────────────────────────────────────────────────────
icon('icon-aura', """
  <!-- Outer ring glow -->
  <circle cx="32" cy="32" r="26" fill="none" stroke="#ffcc00" stroke-width="2" opacity="0.25"/>
  <!-- Outer ring -->
  <circle cx="32" cy="32" r="22" fill="none" stroke="#ffcc00" stroke-width="3" opacity="0.55"/>
  <!-- Mid ring -->
  <circle cx="32" cy="32" r="15" fill="none" stroke="#ffdd44" stroke-width="3" opacity="0.75"/>
  <!-- Inner ring -->
  <circle cx="32" cy="32" r="9"  fill="none" stroke="#ffee88" stroke-width="3"/>
  <!-- Core -->
  <circle cx="32" cy="32" r="4"  fill="#fff0aa"/>
  <!-- 8 radial tick marks between rings -->
  """ + ''.join(
      f'<line x1="{arm(32,32,11,a)[0]:.1f}" y1="{arm(32,32,11,a)[1]:.1f}"'
      f'      x2="{arm(32,32,19,a)[0]:.1f}" y2="{arm(32,32,19,a)[1]:.1f}"'
      f'      stroke="#ffdd44" stroke-width="1.5" opacity="0.6"/>'
      for a in range(0, 360, 45)
  ) + """
""")


# ─────────────────────────────────────────────────────────────────────────────
# 7. DICE — classic six-face die
# ─────────────────────────────────────────────────────────────────────────────
# Dots layout for face 6: two columns of 3
_dot_positions = [
    (20, 20), (44, 20),   # top row
    (20, 32), (44, 32),   # mid row
    (20, 44), (44, 44),   # bottom row
]
_dots = ''.join(
    f'<circle cx="{x}" cy="{y}" r="4" fill="#111"/>'
    for x, y in _dot_positions
)

icon('icon-dice', f"""
  <!-- Die body -->
  <rect x="8" y="8" width="48" height="48" rx="10" ry="10"
        fill="#f0f0e8" stroke="#888" stroke-width="2"/>
  <!-- Top face highlight -->
  <rect x="10" y="10" width="44" height="20" rx="8" ry="8"
        fill="white" opacity="0.4"/>
  <!-- Dots -->
  {_dots}
""")


# ─────────────────────────────────────────────────────────────────────────────
# 8. MYSTERY — card back with 4-pointed star sparkle
# ─────────────────────────────────────────────────────────────────────────────
# 4-pointed star: outer r=20, inner r=8
_star4 = []
for i in range(8):
    r = 20 if i % 2 == 0 else 8
    a = math.radians(i * 45 - 90)
    _star4.append(f'{32 + r*math.cos(a):.1f},{32 + r*math.sin(a):.1f}')
_star4_pts = ' '.join(_star4)

# Smaller secondary star rotated 45°
_star4b = []
for i in range(8):
    r = 12 if i % 2 == 0 else 5
    a = math.radians(i * 45 - 45)
    _star4b.append(f'{32 + r*math.cos(a):.1f},{32 + r*math.sin(a):.1f}')
_star4b_pts = ' '.join(_star4b)

icon('icon-mystery', f"""
  <!-- Outer glow -->
  <polygon points="{_star4_pts}" fill="#aa44ff" opacity="0.3"
           transform="scale(1.08) translate(-2.56 -2.56)"/>
  <!-- Main star -->
  <polygon points="{_star4_pts}" fill="#cc66ff"/>
  <!-- Inner star -->
  <polygon points="{_star4b_pts}" fill="#eebb ff"/>
  <!-- Highlight -->
  <polygon points="{_star4b_pts}" fill="white" opacity="0.5"
           transform="scale(0.5) translate(32 32)"/>
  <!-- Center dot -->
  <circle cx="32" cy="32" r="4" fill="white" opacity="0.9"/>
  <!-- Corner sparkle dots -->
  <circle cx="18" cy="18" r="2" fill="#dd99ff" opacity="0.7"/>
  <circle cx="46" cy="18" r="2" fill="#dd99ff" opacity="0.7"/>
  <circle cx="18" cy="46" r="2" fill="#dd99ff" opacity="0.7"/>
  <circle cx="46" cy="46" r="2" fill="#dd99ff" opacity="0.7"/>
""")


# ─────────────────────────────────────────────────────────────────────────────
# 9. ARROW — recurve bow with arrow, earth-tone palette (birch/sinew/flint)
# ─────────────────────────────────────────────────────────────────────────────
icon('icon-arrow', """
  <!-- Bow shadow -->
  <path d="M18,49 Q10,32 18,15"
        fill="none" stroke="#1a0e05" stroke-width="5" opacity="0.4"
        stroke-linecap="round" transform="translate(2,2)"/>
  <!-- Bow limb — birch bark wood -->
  <path d="M17,48 Q9,32 17,16"
        fill="none" stroke="#8b6b3d" stroke-width="4.5"
        stroke-linecap="round"/>
  <!-- Bow inner grain highlight -->
  <path d="M17,44 Q11,32 17,20"
        fill="none" stroke="#c4a265" stroke-width="2"
        stroke-linecap="round" opacity="0.6"/>
  <!-- Bowstring — sinew -->
  <line x1="17" y1="16" x2="17" y2="48"
        stroke="#d4c8a0" stroke-width="1.5" opacity="0.8"/>
  <!-- Arrow shaft -->
  <line x1="17" y1="32" x2="52" y2="32"
        stroke="#a08050" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Arrow shaft grain -->
  <line x1="22" y1="32" x2="46" y2="32"
        stroke="#c4a265" stroke-width="1" opacity="0.5"/>
  <!-- Flint arrowhead -->
  <polygon points="52,32 44,27 44,37" fill="#556666"/>
  <polygon points="50,32 45,28.5 45,35.5" fill="#778888" opacity="0.7"/>
  <!-- Arrowhead edge highlight -->
  <line x1="52" y1="32" x2="45" y2="28" stroke="#99aabb" stroke-width="0.8" opacity="0.6"/>
  <!-- Fletching feathers -->
  <polygon points="22,32 18,27 20,32" fill="#8b4513" opacity="0.8"/>
  <polygon points="22,32 18,37 20,32" fill="#6b3410" opacity="0.8"/>
  <!-- Fletching detail lines -->
  <line x1="19" y1="28" x2="21" y2="32" stroke="#aa6633" stroke-width="0.7" opacity="0.5"/>
  <line x1="19" y1="36" x2="21" y2="32" stroke="#aa6633" stroke-width="0.7" opacity="0.5"/>
  <!-- Bow tip accents (sinew wrapping) -->
  <circle cx="17" cy="16" r="2" fill="#d4c8a0" opacity="0.6"/>
  <circle cx="17" cy="48" r="2" fill="#d4c8a0" opacity="0.6"/>
""")


print('\nDone — 9 icons written to converted_assets/')
