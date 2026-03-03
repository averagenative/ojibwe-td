---
id: TASK-100
title: Victory Music Not Playing — Falls Back to Procedural
status: done
category: backend
priority: medium
depends_on: []
created: 2026-03-02
---

## Description

After winning a map, the victory music doesn't play the Suno-generated track. Instead it
falls back to procedural generated music. The music files exist at
`public/assets/audio/music/victory_001.mp3` and `victory_002.mp3` but aren't being played.

## Acceptance Criteria

- [ ] Victory music plays the file-based Suno track after winning a map
- [ ] Verify the `music-victory` key is registered in AudioManager after BootScene bridge
- [ ] Verify GameScene/GameOverScene calls the correct music key on victory
- [ ] Falls back gracefully to procedural if files are missing
- [ ] `npm run typecheck` clean

## Notes

- BootScene loads `music-victory` via `pickVariant('assets/audio/music/victory')` → `victory_001.mp3` or `_002.mp3`
- Check that the bridge in `_bridgeAudioToManager()` successfully registers the decoded buffer
- Check that `AudioManager.startMusicTrack('music-victory')` is called at the right time
- The procedural fallback means the key might not be registered — add console logging to debug
