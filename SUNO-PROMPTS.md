# Suno Audio Prompts — Ojibwe TD

## File Placement

Once generated, download the mp3 and place here:
```
game/public/assets/audio/music/<filename>.mp3
game/public/assets/audio/sfx/<filename>.mp3
```

No code changes needed — BootScene already loads these paths and AudioManager
auto-uses them with procedural fallback if any are missing.

---

## Music Tracks (5)

### 1. Menu Theme → `music/menu-theme.mp3`

**Prompt:**
```
Ambient world music, wooden Native American flute melody over soft hand drum
heartbeat rhythm. Birch bark rattle shaker keeping gentle time. 70 BPM,
contemplative and grounding. Natural reverb like an open forest clearing.
Minor pentatonic scale. Seamless loop. 2 minutes.
```

**Style tags:** Ambient, World Music, Indigenous Flute, Cinematic
**Duration:** 2:00–2:30

---

### 2. Gameplay Calm → `music/gameplay-calm.mp3`

**Prompt:**
```
Rhythmic ambient tower defense background music. Steady hand drum pulse at
90 BPM. Wooden flute playing a simple repeating pentatonic motif. Subtle
wooden percussion layers — log drum, seed rattle. Builds slightly but stays
understated. Must loop seamlessly. Not distracting. 3 minutes.
```

**Style tags:** Ambient, World Music, Game Soundtrack, Rhythmic
**Duration:** 3:00–3:30

---

### 3. Gameplay Intense / Boss → `music/gameplay-intense.mp3`

**Prompt:**
```
Intense tribal drumming, escalating tension. Heavy hand drums and frame drums
at 120 BPM. Aggressive wooden flute stabs between drum hits. Rising energy,
war-drum urgency. Deep bass drum hits on downbeats. Shaker rattles driving
sixteenth notes. Cinematic battle tension. Seamless loop. 2 minutes.
```

**Style tags:** Cinematic, Tribal Drums, Intense, Battle Music
**Duration:** 2:00–2:30

---

### 4. Victory → `music/victory.mp3`

**Prompt:**
```
Triumphant celebration. Joyful wooden flute melody ascending over celebratory
hand drum pattern. Bright and warm. Seed rattles and shakers adding texture.
Feeling of earned achievement and community celebration. Resolves on a
satisfying major chord. 30 seconds.
```

**Style tags:** Cinematic, Triumphant, World Music, Celebration
**Duration:** 0:25–0:40

---

### 5. Game Over → `music/gameover.mp3`

**Prompt:**
```
Reflective and somber. Solo wooden flute playing a slow descending melody.
Minimal accompaniment — just breath and wood. Fading like dying embers.
Gentle, not harsh. Pentatonic minor. Ends with silence. 20 seconds.
```

**Style tags:** Ambient, Melancholic, Solo Flute, Cinematic
**Duration:** 0:20–0:30

---

## Sound Effects (16)

### Tower Placement → `sfx/tower-place.mp3`

**Prompt:**
```
Short wooden thunk sound. Heavy log being placed on soft earth. Deep and
satisfying. Single hit, no reverb tail. 0.5 seconds.
```

**Style tags:** Sound Effect, Foley, Wood Impact
**Duration:** <1s

---

### Cannon Fire → `sfx/cannon-fire.mp3`

**Prompt:**
```
Deep stone cannon blast. Heavy thud with a crack. Like a boulder launched
from a wooden catapult. Short punchy impact. 0.3 seconds.
```

**Style tags:** Sound Effect, Impact, Explosion
**Duration:** <0.5s

---

### Frost Fire → `sfx/frost-fire.mp3`

**Prompt:**
```
Icy crystalline burst. High-pitched shimmering crack like breaking thin ice.
Sparkle and frost. Brief and sharp. 0.3 seconds.
```

**Style tags:** Sound Effect, Ice, Magic, Crystal
**Duration:** <0.5s

---

### Tesla Fire → `sfx/tesla-fire.mp3`

**Prompt:**
```
Electric zap. Sharp buzzing lightning crack. Quick electrical discharge with
a sizzle tail. Like a static shock amplified. 0.3 seconds.
```

**Style tags:** Sound Effect, Electric, Lightning, Zap
**Duration:** <0.5s

---

### Mortar Fire → `sfx/mortar-fire.mp3`

**Prompt:**
```
Low heavy thump. Deep bass mortar launch like a hollow log being struck hard
from inside. Muffled boom with slight whoosh. 0.4 seconds.
```

**Style tags:** Sound Effect, Explosion, Deep Impact, Launch
**Duration:** <0.5s

---

### Poison Fire → `sfx/poison-fire.mp3`

**Prompt:**
```
Wet bubbling hiss. Like a poison vial shattering on stone. Brief acidic
sizzle with a squelch. Organic and toxic sounding. 0.3 seconds.
```

**Style tags:** Sound Effect, Liquid, Poison, Organic
**Duration:** <0.5s

---

### Aura Hum → `sfx/aura-hum.mp3`

**Prompt:**
```
Soft mystical hum. Gentle resonant tone like wind through a hollow log.
Warm and steady. Subtle harmonic overtones. Fades in and out softly.
1 second.
```

**Style tags:** Sound Effect, Ambient, Magic, Resonance
**Duration:** ~1s

---

### Creep Death 01 → `sfx/creep-death-01.mp3`

**Prompt:**
```
Quick creature defeat sound. Short descending squeak-pop. Tiny and
cartoonish. Like a small creature popping. 0.2 seconds.
```

**Style tags:** Sound Effect, Game SFX, Creature, Pop
**Duration:** <0.3s

---

### Creep Death 02 → `sfx/creep-death-02.mp3`

**Prompt:**
```
Creature defeat variant. Brief crunch-splat. Slightly different pitch from
variant 01. Small and quick. Cartoonish. 0.2 seconds.
```

**Style tags:** Sound Effect, Game SFX, Creature, Crunch
**Duration:** <0.3s

---

### Creep Death 03 → `sfx/creep-death-03.mp3`

**Prompt:**
```
Creature defeat variant. Quick fizz-poof. Like a small spirit dissipating.
Airy and light. Different character from variants 01 and 02. 0.2 seconds.
```

**Style tags:** Sound Effect, Game SFX, Creature, Poof
**Duration:** <0.3s

---

### Creep Escape → `sfx/creep-escape.mp3`

**Prompt:**
```
Negative alert sound. Descending tone, like something slipping away.
Slightly alarming but not harsh. Wooden wind-down. 0.5 seconds.
```

**Style tags:** Sound Effect, Alert, Negative, Descending
**Duration:** <0.6s

---

### Wave Complete → `sfx/wave-complete.mp3`

**Prompt:**
```
Positive three-note ascending chime. Wooden xylophone or log drum hitting
three rising notes. Bright and rewarding. Clean and short. 0.8 seconds.
```

**Style tags:** Sound Effect, Chime, Positive, Achievement
**Duration:** <1s

---

### Boss Death → `sfx/boss-death.mp3`

**Prompt:**
```
Heavy dramatic impact sequence. Three deep hits — boom boom BOOM — each
bigger than the last. Reverberant. Earth-shaking. Like a great tree falling.
Echoing aftermath. 1.5 seconds.
```

**Style tags:** Sound Effect, Epic Impact, Boss Defeat, Dramatic
**Duration:** 1–2s

---

### Victory Fanfare → `sfx/victory-fanfare.mp3`

**Prompt:**
```
Short triumphant fanfare sting. Wooden flute plays a quick ascending
celebratory phrase. Hand drum accent on the final beat. Joyful and punchy.
2 seconds.
```

**Style tags:** Sound Effect, Fanfare, Triumph, Celebration
**Duration:** 1.5–2.5s

---

### Game Over → `sfx/game-over.mp3`

**Prompt:**
```
Somber descending four-note phrase. Low wooden flute, slow and mournful.
Each note lower and quieter than the last. Fades to silence. 2 seconds.
```

**Style tags:** Sound Effect, Game Over, Somber, Descending
**Duration:** 1.5–2.5s

---

### UI Click → `sfx/ui-click.mp3`

**Prompt:**
```
Crisp wooden click. Like two small sticks tapping together. Bright, clean,
instant. No tail. Perfect for button press feedback. 0.1 seconds.
```

**Style tags:** Sound Effect, UI, Click, Wood
**Duration:** <0.15s

---

## Tips for Suno

- **Looping music**: After downloading, test loops by playing the track twice
  back-to-back. If there's a gap or jarring transition, try regenerating or
  trim the silence from start/end with Audacity.
- **SFX length**: Suno tends to generate longer clips. You may need to trim
  SFX down to the specified duration using Audacity or ffmpeg:
  `ffmpeg -i input.mp3 -t 0.5 -af "afade=t=out:st=0.3:d=0.2" output.mp3`
- **File size target**: Keep total audio payload under 10 MB (compressed mp3).
  Music tracks at 128kbps: ~2MB for 2min, ~3MB for 3min.
- **Format**: mp3 is fine (Suno default). The system handles mp3 natively.
- **If Suno can't do short SFX well**: Consider using sfxr.me or jsfxr.app
  for the very short effects (<0.5s) and Suno for the longer musical pieces.
