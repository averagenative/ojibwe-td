---
id: TASK-053
title: Audio Generation — Suno Music & Sound Design Pipeline
status: in-progress
priority: medium
phase: polish
interactive: true
---

# Audio Generation — Suno Music & Sound Design Pipeline

## Problem

All game audio is procedural WebAudio synthesis — OscillatorNode beeps, chirps,
and a simple A2 minor pentatonic arpeggio loop. It works as placeholder but
sounds robotic and generic. The game's Ojibwe aesthetic deserves real music and
designed sound effects — drums, flute, ambient forest, wind, thunder — not
synthesizer chirps.

## Goal

Replace procedural audio with generated music tracks and sound effects using
Suno.com (subscription available). This is an **interactive task** — Claude and
the user collaborate on prompt engineering for Suno, review generated outputs,
and integrate the best results into the game. The task also explores
programmatic Suno access for batch generation.

## Current Audio Inventory

These are the procedural sounds currently in `AudioManager.ts` that need real
audio replacements:

### Sound Effects (SFX)
| Event | Current Sound | Target Replacement |
|-------|--------------|-------------------|
| `playTowerPlaced()` | Sawtooth thunk | Wooden stake/post hammered into earth |
| `playProjectileFired('cannon')` | Low boom | Deep cannon thud, reverb |
| `playProjectileFired('frost')` | High shimmer | Ice crack / crystalline chime |
| `playProjectileFired('tesla')` | Crackling buzz | Electric arc / lightning snap |
| `playProjectileFired('mortar')` | Thud + whistle | Mortar launch + descending whistle |
| `playProjectileFired('poison')` | Bubbling hiss | Toxic splash / acid sizzle |
| `playProjectileFired('aura')` | Soft hum | Warm spiritual resonance / drum hum |
| `playCreepKilled()` | Creature yelp (3 variants) | Short creature death cry (3 variants) |
| `playCreepEscaped()` | Descending wah | Warning whoosh / escape alert |
| `playWaveComplete()` | Rising arpeggio | Victory drum flourish |
| `playBossDeath()` | Low rumble + fanfare | Boss defeat — dramatic resolution |
| `playVictory()` | Major chord sequence | Full victory fanfare (3-5 seconds) |
| `playGameOver()` | Descending minor | Defeat theme — somber, short |
| `playUiClick()` | Soft click | UI click / tap (subtle) |

### Music Tracks
| Context | Current | Target |
|---------|---------|--------|
| Main menu | (none) | Ambient — forest + water + wind, soft flute melody |
| Gameplay (calm waves) | Arpeggio loop | Steady rhythm, hand drum pulse, building tension |
| Gameplay (intense/boss) | Same arpeggio | Faster tempo, layered drums, urgent energy |
| Between waves | (none) | Breathing room — ambient nature, gentle melody |
| Victory screen | (none) | Celebratory — drums + flute resolution |
| Game over screen | (none) | Reflective — fading embers, wind |

### Ambient Layers (stretch)
| Layer | Description |
|-------|-------------|
| Forest ambience | Wind through pines, distant bird calls, subtle water |
| Night ambience | Crickets, owl, gentle breeze |
| Storm ambience | Building wind, distant thunder (for boss waves) |

## Acceptance Criteria

### Phase 1: Suno Prompt Engineering (Interactive)
- [ ] Draft Suno prompts for each music track, refining style/genre tags
- [ ] Generate 2-3 candidates per track, user picks best
- [ ] Document winning prompts in `game/audio/PROMPTS.md` for reproducibility
- [ ] Export final tracks as `.mp3` or `.ogg` (Suno default is mp3)

### Phase 2: Sound Effect Generation
- [ ] Determine if Suno is suitable for short SFX (< 2 seconds) or if another
  tool is better (e.g. sfxr, Freesound, manual WebAudio refinement)
- [ ] Generate or source SFX for each event in the inventory above
- [ ] Normalize volume levels across all SFX (consistent perceived loudness)
- [ ] Trim silence from start/end of each clip

### Phase 3: AudioManager Integration
- [ ] Add audio file loading to `BootScene.loadAssets()`:
  - `this.load.audio('music-menu', 'assets/audio/music-menu.mp3')`
  - `this.load.audio('sfx-cannon', 'assets/audio/sfx-cannon.mp3')` etc.
- [ ] Update `AudioManager` to play loaded audio files instead of procedural:
  - Music: use Phaser's `this.sound.add()` or keep raw WebAudio with
    `AudioBufferSourceNode` for more control
  - SFX: `AudioBufferSourceNode` for low-latency playback (< 5ms response)
- [ ] Keep procedural synthesis as fallback if audio files fail to load
- [ ] Music crossfade between tracks (menu → gameplay, calm → boss)
- [ ] SFX pooling — pre-decode buffers, reuse for rapid fire sounds

### Phase 4: Programmatic Suno Access (Optional/Stretch)
- [ ] Research unofficial Suno API projects on GitHub
  - Known: `gcui-art/suno-api`, `SunoAI-API/Suno-API`
  - Evaluate: auth method, rate limits, output quality, TOS risk
- [ ] If viable: script to batch-generate from prompt file
- [ ] If not viable: document manual workflow (prompt → download → rename → place)

### File Structure
```
game/
├── public/assets/audio/
│   ├── music/
│   │   ├── menu-theme.mp3
│   │   ├── gameplay-calm.mp3
│   │   ├── gameplay-intense.mp3
│   │   ├── victory.mp3
│   │   └── gameover.mp3
│   ├── sfx/
│   │   ├── tower-place.mp3
│   │   ├── cannon-fire.mp3
│   │   ├── frost-fire.mp3
│   │   ├── tesla-fire.mp3
│   │   ├── mortar-fire.mp3
│   │   ├── poison-fire.mp3
│   │   ├── aura-hum.mp3
│   │   ├── creep-death-01.mp3
│   │   ├── creep-death-02.mp3
│   │   ├── creep-death-03.mp3
│   │   ├── creep-escape.mp3
│   │   ├── wave-complete.mp3
│   │   ├── boss-death.mp3
│   │   ├── victory-fanfare.mp3
│   │   ├── game-over.mp3
│   │   └── ui-click.mp3
│   └── ambient/ (stretch)
│       ├── forest-day.mp3
│       ├── night.mp3
│       └── storm.mp3
├── audio/
│   └── PROMPTS.md          ← Suno prompt archive
```

### Audio Style Direction

The Ojibwe aesthetic should guide all audio choices:

**Music style tags for Suno prompts:**
- Instruments: hand drum, frame drum, wooden flute, shaker/rattle, soft synth pads
- Genre: ambient, world music, indigenous-inspired, cinematic, lo-fi
- Mood: earthy, natural, spiritual, grounded, contemplative (menu/between waves)
  → building, urgent, powerful, driving (gameplay/boss)
- Avoid: electronic/EDM, heavy guitar, pop vocals, anything culturally
  appropriative or sacred-ceremony-imitating

**SFX style:**
- Organic over synthetic — wood, stone, ice, fire, wind
- Short and punchy (< 1 second for tower fires, < 3 seconds for events)
- Spatially aware — lower volume for distant sounds (future: positional audio)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Total audio payload < 10 MB (compressed mp3/ogg)
- [ ] Music loops seamlessly (no audible gap at loop point)
- [ ] SFX latency < 50ms from event trigger to audible sound
- [ ] Graceful fallback to procedural audio if files missing
- [ ] Volume/mute controls continue to work with file-based audio
- [ ] Mobile: audio resumes after first user interaction (existing pattern)

## Suno Prompt Templates (Starting Points)

These are initial drafts to iterate on interactively:

### Menu Theme
```
Style: ambient world music, wooden flute, soft hand drum
Mood: contemplative, earthy, natural landscape
Tempo: 70-80 BPM
Duration: 2-3 minutes, seamless loop
Description: A gentle melody for a tower defense game set in Northern Ontario
boreal forest. Wooden flute carries the melody over soft hand drum pulse and
wind-like pad textures. Evokes standing at a lakeshore at dawn.
```

### Gameplay (Calm)
```
Style: rhythmic ambient, frame drum, light percussion, nature textures
Mood: focused, steady, building awareness
Tempo: 90-100 BPM
Duration: 3-4 minutes, seamless loop
Description: Background music for active tower defense gameplay. Steady drum
pulse provides rhythm without distraction. Subtle melodic fragments come and
go. Tension builds gradually. Natural and earthy.
```

### Gameplay (Boss/Intense)
```
Style: cinematic world music, heavy drums, driving rhythm
Mood: urgent, powerful, climactic
Tempo: 120-130 BPM
Duration: 2-3 minutes, seamless loop
Description: Boss wave music for a tower defense game. Layered drums build
intensity. Deep bass pulse. Sense of approaching danger and determination.
Powerful but grounded in natural/acoustic instrumentation.
```

## Notes

- This task is **interactive** — not suitable for the autonomous orchestrator.
  Requires human ears to evaluate generated audio quality.
- Suno generates full songs (30s-4min). For SFX we may need to:
  - Generate longer pieces and trim the best 1-2 second segments
  - Use a different tool entirely (sfxr.me, freesound.org, Eleven Labs SFX)
  - Keep refined procedural synthesis for some events (ui-click, tower-place)
- Copyright: Suno subscription grants commercial usage rights for generated
  audio. Verify current TOS before shipping.
- The procedural AudioManager should remain as the default/fallback — file-based
  audio is an enhancement layer on top.
- Consider generating season-specific ambient variants (winter = more wind/quiet,
  summer = more birds/insects) to match the map themes.
