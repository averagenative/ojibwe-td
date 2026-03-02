# Suno Audio Prompts — Ojibwe TD

## How to Generate

### Music Tracks (Song tab → Custom → Instrumental)
1. Open **Create** (left sidebar)
2. Click **Song** tab (top of create panel)
3. Switch to **Custom** mode (toggle near top)
4. Turn **Instrumental** ON (no vocals — these are game BGM tracks)
5. Paste the **Style of Music** tags into the "Style of Music" field
6. Paste the **Prompt** into the **Lyrics** field (even though instrumental,
   the description here guides the composition)
7. Click **Create** — generates two options
8. Listen, pick the best one
9. Download as **.wav**: click the track → download icon → select WAV format

### Sound Effects
Suno doesn't have a separate Sounds tab in all accounts. For SFX, try:
1. Use **Song** tab → **Custom** → **Instrumental** ON
2. Paste the SFX prompt into **Style of Music**
3. Set duration as short as possible
4. Download and trim with ffmpeg/Audacity

**Better alternatives for short SFX (<1s):**
- [jsfxr.app](https://sfxr.me) — browser-based retro SFX generator, export as wav
- [Freesound.org](https://freesound.org) — CC-licensed sound library
- Keep using the existing procedural WebAudio synthesis (it already works)

### Tips
- Use specific vocabulary: "whoosh", "thunk", "crack", "sizzle", "rumble"
- Specify duration explicitly (e.g., "0.3 seconds")
- If SFX results sound too musical, add "no melody, no rhythm, pure sound effect"
- Very short SFX (<0.2s) may be hard — try [jsfxr.app](https://sfxr.me) as backup
- You get two options per generation — try 2-3 generations per sound to find the best
- For music tracks: try generating 2-3 times and keep the best version

---

## File Drop Location

Download all files as **.wav** and drop them here:

```
game/public/assets/audio/source/music/       ← music .wav files
game/public/assets/audio/source/sfx/          ← SFX .wav files
```

Claude will then convert to mp3 (128kbps) and place the final files in:
```
game/public/assets/audio/music/<filename>.mp3   ← BootScene loads these
game/public/assets/audio/sfx/<filename>.mp3     ← BootScene loads these
```

**Prerequisite**: `sudo apt-get install -y ffmpeg` (needed for wav→mp3 conversion)

### Naming Convention

When downloading from Suno, rename the files to match exactly:

**Music files** (drop in `source/music/`):
- `menu-theme.wav`
- `gameplay-calm.wav`
- `gameplay-intense.wav`
- `victory.wav`
- `gameover.wav`

**SFX files** (drop in `source/sfx/`):
- `tower-place.wav`
- `cannon-fire.wav`
- `frost-fire.wav`
- `tesla-fire.wav`
- `mortar-fire.wav`
- `poison-fire.wav`
- `aura-hum.wav`
- `creep-death-01.wav`
- `creep-death-02.wav`
- `creep-death-03.wav`
- `creep-escape.wav`
- `wave-complete.wav`
- `boss-death.wav`
- `victory-fanfare.wav`
- `game-over.wav`
- `ui-click.wav`

---

## Music Tracks (5) — Use Song/Custom Mode

### 1. Menu Theme → `menu-theme.wav`

**Prompt:**
```
Ambient world music, wooden Native American flute melody over soft hand drum
heartbeat rhythm. Birch bark rattle shaker keeping gentle time. 70 BPM,
contemplative and grounding. Natural reverb like an open forest clearing.
Minor pentatonic scale. Seamless loop. 2 minutes.
```

**Style of Music:** Ambient, World Music, Indigenous Flute, Cinematic
**Duration:** 2:00–2:30

---

### 2. Gameplay Calm → `gameplay-calm.wav`

**Prompt:**
```
Rhythmic ambient tower defense background music. Steady hand drum pulse at
90 BPM. Wooden flute playing a simple repeating pentatonic motif. Subtle
wooden percussion layers — log drum, seed rattle. Builds slightly but stays
understated. Must loop seamlessly. Not distracting. 3 minutes.
```

**Style of Music:** Ambient, World Music, Game Soundtrack, Rhythmic
**Duration:** 3:00–3:30

---

### 3. Gameplay Intense / Boss → `gameplay-intense.wav`

**Prompt:**
```
Intense tribal drumming, escalating tension. Heavy hand drums and frame drums
at 120 BPM. Aggressive wooden flute stabs between drum hits. Rising energy,
war-drum urgency. Deep bass drum hits on downbeats. Shaker rattles driving
sixteenth notes. Cinematic battle tension. Seamless loop. 2 minutes.
```

**Style of Music:** Cinematic, Tribal Drums, Intense, Battle Music
**Duration:** 2:00–2:30

---

### 4. Victory → `victory.wav`

**Prompt:**
```
Triumphant celebration. Joyful wooden flute melody ascending over celebratory
hand drum pattern. Bright and warm. Seed rattles and shakers adding texture.
Feeling of earned achievement and community celebration. Resolves on a
satisfying major chord. 30 seconds.
```

**Style of Music:** Cinematic, Triumphant, World Music, Celebration
**Duration:** 0:25–0:40

---

### 5. Game Over → `gameover.wav`

**Prompt:**
```
Reflective and somber. Solo wooden flute playing a slow descending melody.
Minimal accompaniment — just breath and wood. Fading like dying embers.
Gentle, not harsh. Pentatonic minor. Ends with silence. 20 seconds.
```

**Style of Music:** Ambient, Melancholic, Solo Flute, Cinematic
**Duration:** 0:20–0:30

---

## Sound Effects (16) — Use Sounds Mode (One Shot)

To access: Create → Custom dropdown → **Sounds** → Type: **One Shot**

### Tower Placement → `tower-place.wav`

**Prompt:**
```
Heavy wooden thunk. Log placed on soft earth. Deep satisfying single hit.
No reverb tail. 0.5 seconds.
```

---

### Cannon Fire → `cannon-fire.wav`

**Prompt:**
```
Deep stone cannon blast. Heavy thud with a crack. Boulder launched from
wooden catapult. Short punchy impact. 0.3 seconds.
```

---

### Frost Fire → `frost-fire.wav`

**Prompt:**
```
Icy crystalline burst. High-pitched shimmering crack like breaking thin ice.
Sparkle and frost. Brief and sharp. 0.3 seconds.
```

---

### Tesla Fire → `tesla-fire.wav`

**Prompt:**
```
Electric zap. Sharp buzzing lightning crack. Quick electrical discharge with
sizzle tail. Static shock amplified. 0.3 seconds.
```

---

### Mortar Fire → `mortar-fire.wav`

**Prompt:**
```
Low heavy thump. Deep bass mortar launch. Hollow log struck hard from inside.
Muffled boom with slight whoosh. 0.4 seconds.
```

---

### Poison Fire → `poison-fire.wav`

**Prompt:**
```
Wet bubbling hiss. Poison vial shattering on stone. Brief acidic sizzle
with squelch. Organic and toxic. 0.3 seconds.
```

---

### Aura Hum → `aura-hum.wav`

**Prompt:**
```
Soft mystical hum. Gentle resonant tone like wind through hollow log.
Warm and steady. Subtle harmonic overtones. Fades softly. 1 second.
```

---

### Creep Death 01 → `creep-death-01.wav`

**Prompt:**
```
Quick creature defeat. Short descending squeak-pop. Tiny cartoonish.
Small creature popping. 0.3 seconds.
```

---

### Creep Death 02 → `creep-death-02.wav`

**Prompt:**
```
Creature defeat variant. Brief crunch-splat. Different pitch. Small quick
cartoonish impact. 0.3 seconds.
```

---

### Creep Death 03 → `creep-death-03.wav`

**Prompt:**
```
Creature defeat variant. Quick fizz-poof. Small spirit dissipating.
Airy and light. 0.3 seconds.
```

---

### Creep Escape → `creep-escape.wav`

**Prompt:**
```
Negative alert. Descending tone, something slipping away. Slightly alarming
but not harsh. Wooden wind-down. 0.5 seconds.
```

---

### Wave Complete → `wave-complete.wav`

**Prompt:**
```
Positive three-note ascending chime. Wooden xylophone or log drum.
Three rising notes. Bright and rewarding. Clean short. 0.8 seconds.
```

---

### Boss Death → `boss-death.wav`

**Prompt:**
```
Heavy dramatic impact sequence. Three deep hits — boom boom BOOM — each bigger.
Reverberant earth-shaking. Great tree falling. Echoing aftermath. 1.5 seconds.
```

---

### Victory Fanfare → `victory-fanfare.wav`

**Prompt:**
```
Short triumphant fanfare sting. Wooden flute quick ascending celebratory phrase.
Hand drum accent on final beat. Joyful punchy. 2 seconds.
```

---

### Game Over SFX → `game-over.wav`

**Prompt:**
```
Somber descending four-note phrase. Low wooden flute, slow mournful.
Each note lower and quieter. Fades to silence. 2 seconds.
```

---

### UI Click → `ui-click.wav`

**Prompt:**
```
Crisp wooden click. Two small sticks tapping together. Bright clean instant.
No tail. Button press feedback. 0.1 seconds.
```

---

## Post-Download Processing

Once wav files are dropped in `source/`, Claude will run:

```bash
# Music: convert to 128kbps mp3
ffmpeg -i source/music/menu-theme.wav -b:a 128k music/menu-theme.mp3

# SFX: convert, trim silence, normalize volume
ffmpeg -i source/sfx/cannon-fire.wav -af "silenceremove=1:0:-50dB,loudnorm" -b:a 128k sfx/cannon-fire.mp3
```

### Size Budget
- Target: < 10 MB total (all audio combined)
- Music at 128kbps: ~1 MB/min
- SFX at 128kbps: negligible (< 50 KB each)
- 5 music tracks (~8 min total) + 16 SFX = ~8-9 MB estimated

### If Suno Sounds Doesn't Work Well for Short SFX

Backup options for very short effects (<0.3s):
- **[jsfxr.app](https://sfxr.me)** — browser-based retro SFX generator, export as wav
- **[Freesound.org](https://freesound.org)** — CC-licensed sound library
- Keep using the existing procedural WebAudio synthesis (it works, just less polished)
