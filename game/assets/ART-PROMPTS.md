# Ojibwe TD — Sprite Art Prompts

Prompts for AI art generation (DALL-E, Midjourney, or equivalent).
Use these to generate or regenerate sprite candidates that match the game's art direction.

## Art Style Guidelines

**Perspective:** Top-down / slightly angled bird's-eye view.
**Palette:** Natural earth tones for ground units; sky/blue tones for air units;
each boss has its own colour identity matching `bossDefs.ts` tint values.
**Style:** Stylized silhouettes — enough detail to identify the animal at 32-64px scale.
Think nature field guide illustrations meets pixel art. Clean outlines, crisp at native resolution.
**Background:** Transparent (PNG with alpha). No subpixel blur.
**Cultural respect:** Animal representations should be naturalistic and respectful.
Thunderbird (Animikiins) draws from Anishinaabe artistic traditions, not generic fantasy.

---

## Boss Sprites

### `boss-makwa.png` — Makwa (Bear)

**Lore:** Wave 5 boss. Heavy, armoured, 30% physical damage resistance.

**Prompt:**
> Top-down pixel art of a large brown bear viewed from directly above, 64×64px,
> transparent background. Stocky rounded silhouette. Visible shoulder hump,
> four large paws with prominent claws. Amber/brown fur (hex #B95F1E).
> Slightly darker spine stripe. No internal detail beyond fur texture suggestion.
> Crisp outline, no anti-aliasing blur. Nature field guide meets pixel art style.

**Target size:** 64×64px
**Tint reference:** `0xcc6600` (amber/brown)
**Key:** `boss-makwa`

---

### `boss-migizi.png` — Migizi (Eagle)

**Lore:** Wave 10 boss. Very fast, immune to Frost slow and freeze.

**Prompt:**
> Top-down pixel art of a bald eagle in flight viewed from directly above, 64×48px,
> transparent background. Wings fully spread wide (64px span). White head with yellow
> beak, golden-brown body and wings. Wing tips slightly darker. White tail feathers
> with dark banding (bald eagle's white tail). Majestic, streamlined silhouette.
> Crisp outlines, nature field guide pixel art style.

**Target size:** 64×48px
**Tint reference:** `0xffd700` (golden yellow)
**Key:** `boss-migizi`

---

### `boss-waabooz.png` — Waabooz (Hare)

**Lore:** Wave 15 boss. Splits into 3 mini-copies on death.

**Prompt:**
> Top-down pixel art of a snowshoe hare / jackrabbit viewed from directly above,
> 48×48px, transparent background. Compact round body, legs tucked. Very long
> upright ears (characteristic of hares — taller than the body). Pale blue-white
> fur (hex #AADDFF). Pink inner ears, small pink-red eyes. Small fluffy tail.
> Agile, alert pose. Crisp outlines, nature field guide pixel art style.

**Target size:** 48×48px
**Tint reference:** `0xaaddff` (pale blue-white)
**Key:** `boss-waabooz`

---

### `boss-animikiins.png` — Animikiins (Little Thunderbird)

**Lore:** Wave 20 boss. HP regen 1%/s, immune to Poison DoT.

**Prompt:**
> Top-down pixel art of a Thunderbird (Anishinaabe Thunder-being) in flight
> viewed from directly above, 64×48px, transparent background. Very large
> wingspan (full 64px width). Electric blue and purple feathers, bright yellow
> lightning-bolt crest on head. Fierce yellow eyes. Lightning bolt markings on
> wings. Mythic and powerful — larger than Migizi. Draws from Anishinaabe
> artistic tradition: symmetrical, bold, geometric wing patterns with lightning
> motif. Crisp outlines, pixel art style.

**Target size:** 64×48px
**Tint reference:** `0x4466ff` (electric blue)
**Key:** `boss-animikiins`

---

### `boss-waabooz-mini.png` — Mini Waabooz (Waabooz split copy)

**Lore:** Spawns ×3 when Waabooz (wave 15 boss) dies. Smaller, faster copies.

**Prompt:**
> Top-down pixel art of a baby hare / leveret viewed from directly above, 32×32px,
> transparent background. Tiny compact body. Proportionally very large ears
> (baby hares have oversized ears). Same pale blue-white palette as Waabooz
> (hex #AADDFF). Pink inner ears, small pink-red eyes. Clearly a juvenile /
> smaller version of the main Waabooz sprite. Crisp outlines, pixel art style.

**Target size:** 32×32px
**Key:** `boss-waabooz-mini`

---

## Air Creep Sprites

All air sprites should convey "airborne" at small scale. Shadow is rendered
programmatically in-engine (no need to include it in the sprite).

### `creep-air-basic.png` — Basic Flier

**Lore:** Standard air creep. Uses generic bird silhouette.

**Prompt:**
> Top-down pixel art of a generic songbird / crane in flight viewed from directly
> above, 48×48px, transparent background. Wings fully spread. Neutral blue-grey
> plumage (hex #5F7EA0). Simple rounded wing shape. Small round head, small beak.
> Fan tail. Clearly reads as "airborne bird" at small scale. Crisp outlines,
> nature field guide pixel art style.

**Target size:** 48×48px
**Key:** `creep-air-basic`

---

### `creep-air-scout.png` — Scout / Fast Flier

**Lore:** Swift air unit, analogous to ground "runner".

**Prompt:**
> Top-down pixel art of a peregrine falcon / Cooper's hawk in flight viewed from
> directly above, 48×48px, transparent background. Swept-back pointed wings
> (falcon wing shape). Slender aerodynamic body. Light blue-grey plumage with
> darker wing tips (hex #91A5CD base). Yellow eye ring. Forked tail (falcon).
> Conveys speed and agility. Crisp outlines, nature field guide pixel art style.

**Target size:** 48×48px
**Key:** `creep-air-scout`

---

### `creep-air-armored.png` — Armoured Flier

**Lore:** Heavy air unit — slower but with natural armour.

**Prompt:**
> Top-down pixel art of a common raven viewed from directly above, 48×48px,
> transparent background. Broad heavy wings (wider than falcon, more rounded).
> All-black plumage with subtle iridescent blue-purple sheen on wings (raven's
> natural iridescence). Large head, heavy curved beak. Fan tail. Heavier and
> bulkier silhouette than scout. Crisp outlines, nature field guide pixel art style.

**Target size:** 48×48px
**Key:** `creep-air-armored`

---

## Ground Creep Sprites (Refreshed)

### `creep-normal.png` — Normal Ground Creep

**Prompt:**
> Top-down pixel art of an eastern chipmunk viewed from directly above, 48×48px,
> transparent background. Small rounded body with classic chipmunk dorsal stripes
> (dark brown on tan). Bushy tail. Round head with round ears. Alert, curious pose.
> Warm earth tones (hex #916F2D base). Crisp outlines, nature pixel art style.

**Key:** `creep-normal`

---

### `creep-fast.png` — Fast Ground Creep

**Prompt:**
> Top-down pixel art of a red fox running, viewed from directly above, 48×48px,
> transparent background. Elongated body suggesting speed (legs extended in run).
> Orange-red fur (hex #C84B12), white belly stripe. Bushy tail with white tip.
> Pointed ears, narrow snout. Crisp outlines, nature pixel art style.

**Key:** `creep-fast`

---

### `creep-armored.png` — Armoured Ground Creep

**Prompt:**
> Top-down pixel art of a snapping turtle / painted turtle viewed from directly
> above, 48×48px, transparent background. Large dome-shaped shell takes up most
> of the frame. Green shell with hexagonal plate pattern. Small head peeking out
> the front, four stumpy legs at corners, tiny tail. Shell green (hex #467630).
> Crisp outlines, nature pixel art style.

**Key:** `creep-armored`

---

### `creep-immune.png` — Immune Ground Creep

**Prompt:**
> Top-down pixel art of a translucent spirit / ghost creature viewed from directly
> above, 48×48px, transparent background. Wispy upward-tapering body with trailing
> ghost tails at the bottom. Pale blue-white translucent form (hex #C3D4FF at 75%
> opacity). Three-pronged crown symbol on head (represents immunity / invulnerability).
> Two hollow glowing eyes. Ethereal, otherworldly appearance. Crisp outlines,
> pixel art style.

**Key:** `creep-immune`

---

### `creep-regen.png` — Regenerating Ground Creep

**Prompt:**
> Top-down pixel art of a red-backed salamander / fire salamander viewed from
> directly above, 48×48px, transparent background. Elongated body with long tail.
> Orange-red body (hex #C34810) with bright yellow dorsal spots (natural
> salamander warning colouration that also evokes "life regeneration"). Gill
> frills on the head. Four short legs. Crisp outlines, nature pixel art style.

**Key:** `creep-regen`

---

## Generation Notes

1. **Multiple candidates per sprite** — generate 4-8 candidates, pick the one
   that reads clearest at 32-48px final display size.

2. **Post-processing** — resize to target dimensions with nearest-neighbour
   (not bicubic) to preserve crisp pixel art edges. Remove background (magic
   wand on white/grey bg or use alpha channel).

3. **Consistency** — all sprites should feel like they belong to the same set.
   Use the same lighting angle (top-down, diffuse, no harsh shadows within the
   sprite — shadow is rendered in-engine).

4. **Cultural note** — for Thunderbird (Animikiins), reference Anishinaabe
   beadwork and woodland art traditions for wing patterns. Avoid appropriative
   or inaccurate generic "fantasy" imagery.

5. **File format** — PNG with alpha channel. No lossy compression artefacts.
   Total payload for all sprites must remain under 2 MB.
