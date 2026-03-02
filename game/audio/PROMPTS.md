# Ojibwe TD — Suno Audio Prompt Archive

Generated audio for Ojibwe TD using [Suno](https://suno.com). All tracks
generated under Suno's commercial-use subscription license.

**Style direction:** Indigenous-inspired ambient/world music. Instruments:
hand drum, frame drum, wooden flute, shaker/rattle, soft synth pads. Organic
over synthetic. No sacred-ceremony imitation. No electronic/EDM/pop vocals.

---

## Music Tracks

### `menu-theme.mp3` — Main Menu

**File:** `public/assets/audio/music/menu-theme.mp3`
**AudioManager key:** `music-menu`
**Loop:** seamless

**Suno prompt (v1):**
```
Style: ambient world music, wooden flute, soft hand drum, gentle nature pads
Mood: contemplative, earthy, serene, standing at a lakeshore at dawn
Tempo: 70-80 BPM
Duration: 2-3 minutes, seamless loop
Description: Main menu theme for a tower defense game set in Northern Ontario
boreal forest. A wooden flute carries a simple pentatonic melody over a soft
hand drum pulse and wind-like synth pad textures. Sparse and meditative.
Evokes stillness before the day begins. No vocals. No heavy percussion.
Loop-friendly ending that resolves back to the opening phrase.
```

**Notes:** Pick take with cleanest loop point. Export at 128kbps mp3.

---

### `gameplay-calm.mp3` — Gameplay (Calm Waves)

**File:** `public/assets/audio/music/gameplay-calm.mp3`
**AudioManager key:** `music-gameplay`
**Loop:** seamless

**Suno prompt (v1):**
```
Style: rhythmic ambient, frame drum, light shaker, nature textures, cinematic
Mood: focused, steady, building awareness, natural tension
Tempo: 90-100 BPM
Duration: 3-4 minutes, seamless loop
Description: Background music for active tower defense gameplay. A steady
frame drum pulse drives a moderate tempo without distraction. Subtle wooden
flute fragments appear and fade. Tension builds gradually through the track.
Natural, earthy, grounded. No vocals. Suitable for looping during strategic
decision-making. Moderate energy — not aggressive, not sleepy.
```

---

### `gameplay-intense.mp3` — Gameplay (Boss / Intense Waves)

**File:** `public/assets/audio/music/gameplay-intense.mp3`
**AudioManager key:** `music-intense`
**Loop:** seamless

**Suno prompt (v1):**
```
Style: cinematic world music, heavy drums, driving rhythm, layered percussion
Mood: urgent, powerful, climactic, sense of approaching danger
Tempo: 120-130 BPM
Duration: 2-3 minutes, seamless loop
Description: Boss wave music for a tower defense game. Multiple hand drums
layer building intensity. Deep bass pulse drives urgency. Wooden flute and
rattle add texture. Powerful and grounded in natural/acoustic instrumentation.
No electronics, no guitar. The sound of gathering storm over boreal forest.
Seamless loop — track must end in a way that flows back to the opening.
```

---

### `victory.mp3` — Victory Screen

**File:** `public/assets/audio/music/victory.mp3`
**AudioManager key:** `music-victory`
**Loop:** no (plays once)

**Suno prompt (v1):**
```
Style: celebratory world music, bright wooden flute, hand drum resolution
Mood: triumphant, joyful, grounded, earned victory
Tempo: 100-110 BPM
Duration: 30-60 seconds
Description: Victory music for completing a stage in a tower defense game.
Wooden flute plays an ascending, resolved melody. Hand drums provide a
celebratory rhythmic figure. Shaker/rattle adds texture. Short and punchy —
a flourish, not a full song. Sense of accomplishment rooted in nature and
community, not ego. Fades out gently at end.
```

---

### `gameover.mp3` — Game Over / Defeat Screen

**File:** `public/assets/audio/music/gameover.mp3`
**AudioManager key:** `music-gameover`
**Loop:** no (plays once)

**Suno prompt (v1):**
```
Style: reflective ambient, slow hand drum, fading flute, somber pads
Mood: contemplative, somber, not hopeless — a moment of reflection
Tempo: 50-60 BPM
Duration: 20-40 seconds
Description: Game over music for a tower defense game. A slow, low hand drum
pulse. A wooden flute plays a descending phrase and fades. Soft pad texture
like embers cooling. Not tragic or dramatic — more like sitting by a dying
fire at dusk. Short and dignified. Fades to silence.
```

---

## Sound Effects

Suno is best suited for music tracks. For SFX, use one of these workflows:

### Recommended SFX Tools
- **sfxr / jsfxr** — retro/game SFX generator, good for UI sounds
- **Freesound.org** — CC-licensed organic sounds (wind, wood, ice, water)
- **Eleven Labs SFX** — AI sound design for short clips
- **Suno clip extraction** — generate a long piece, trim best 1-2 second segment
- **Refined procedural** — improve the existing WebAudio synthesis

### SFX Inventory

| AudioManager key | File | Source | Status |
|-----------------|------|--------|--------|
| `sfx-tower-place` | `sfx/tower-place.mp3` | Wood/post hammered into earth | pending |
| `sfx-cannon` | `sfx/cannon-fire.mp3` | Deep cannon thud with reverb | pending |
| `sfx-frost` | `sfx/frost-fire.mp3` | Ice crack / crystalline chime | pending |
| `sfx-tesla` | `sfx/tesla-fire.mp3` | Electric arc / lightning snap | pending |
| `sfx-mortar` | `sfx/mortar-fire.mp3` | Mortar launch + descending whistle | pending |
| `sfx-poison` | `sfx/poison-fire.mp3` | Toxic splash / acid sizzle | pending |
| `sfx-aura` | `sfx/aura-hum.mp3` | Warm spiritual resonance / drum hum | pending |
| `sfx-creep-death-01` | `sfx/creep-death-01.mp3` | Creature death cry variant 1 | pending |
| `sfx-creep-death-02` | `sfx/creep-death-02.mp3` | Creature death cry variant 2 | pending |
| `sfx-creep-death-03` | `sfx/creep-death-03.mp3` | Creature death cry variant 3 | pending |
| `sfx-creep-escape` | `sfx/creep-escape.mp3` | Warning whoosh / escape alert | pending |
| `sfx-wave-complete` | `sfx/wave-complete.mp3` | Victory drum flourish | pending |
| `sfx-boss-death` | `sfx/boss-death.mp3` | Boss defeat — dramatic resolution | pending |
| `sfx-victory` | `sfx/victory-fanfare.mp3` | Full victory fanfare (3-5 seconds) | pending |
| `sfx-game-over` | `sfx/game-over.mp3` | Defeat theme — somber, short | pending |
| `sfx-ui-click` | `sfx/ui-click.mp3` | UI click / tap (subtle wood tap) | pending |

### Freesound Search Terms (for organic SFX)

- Tower place: "wooden stake" OR "post hammered" OR "mallet wood"
- Cannon: "cannon shot" OR "mortar blast" (low reverb, under 1s)
- Frost: "ice crack" OR "crystal chime" OR "freeze"
- Tesla: "electric arc" OR "lightning snap" OR "zap"
- Mortar: "mortar fire" OR "artillery whoosh"
- Poison: "acid sizzle" OR "liquid toxic" OR "bubbling"
- Aura: "drum hum" OR "resonance" OR "spiritual tone"
- Creep death: "monster yelp" OR "creature die" (short, < 300ms)
- Wave complete: "drum flourish" OR "snare fill"
- Boss death: "deep rumble" OR "explosion reverb" OR "boss fall"
- UI click: "wood tap" OR "wooden click" (soft, < 50ms)

### SFX Audio Specs
- Format: MP3 (128kbps minimum) or OGG
- Normalization: -12 LUFS perceived loudness
- Silence trim: < 5ms leading silence, natural decay tail
- Duration: UI < 100ms, tower fire < 500ms, events < 3s

---

## Ambient Layers (Stretch)

**File locations:** `public/assets/audio/ambient/`

| Key | File | Description |
|-----|------|-------------|
| (future) | `forest-day.mp3` | Wind through pines, distant bird calls, subtle water |
| (future) | `night.mp3` | Crickets, owl, gentle breeze |
| (future) | `storm.mp3` | Building wind, distant thunder (boss wave layers) |

**Freesound search:** "boreal forest ambience", "northern forest sounds",
"lakeshore ambience", "night insects forest"

---

## Integration Notes

- All files placed in `public/assets/audio/music/` or `public/assets/audio/sfx/`
- BootScene loads via `this.load.audio(key, path)` (Phaser loader with progress bar)
- AudioManager bridges Phaser cache → WebAudio `AudioBuffer` via `registerBuffer()`
- Missing files → graceful fallback to procedural synthesis
- Music loops: set `AudioBufferSourceNode.loop = true`; ensure clean loop point in file
- Total payload budget: < 10 MB compressed (128kbps mp3 ≈ 1 MB/min)
  - 5 music tracks × ~2 min avg × 1 MB/min = ~10 MB → use 96kbps if tight

---

*Last updated: 2026-03-01*
