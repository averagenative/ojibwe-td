---
id: TASK-092
title: Mobile Audio — Music Not Playing on iOS Chrome
status: done
category: backend
priority: high
depends_on: []
created: 2026-03-02
---

## Description

Music does not play on mobile (tested on iOS/Chrome). This may be a browser autoplay policy
issue — iOS requires a user gesture to create/resume the AudioContext, and the gesture must
happen in the same call stack as the `ctx.resume()`. Investigate and fix.

## Acceptance Criteria

- [ ] Music plays on iOS Chrome after tapping the PLAY button on the splash screen
- [ ] Music plays on iOS Safari after tapping PLAY
- [ ] AudioContext resume is called directly in the user gesture handler (not deferred via setTimeout/Promise)
- [ ] If iOS WebAudio has fundamental limitations, document them and add a visible "tap to enable audio" fallback
- [ ] `npm run typecheck` clean

## Notes

- iOS WebKit requires `AudioContext.resume()` to be called synchronously inside a user gesture handler
- The current BootScene PLAY handler calls `AudioManager.getInstance().startMusicTrack('music-menu')` — verify this calls `ctx.resume()` synchronously
- Check if Phaser's WebAudio plugin interferes with our custom AudioManager on iOS
- Test on both iOS Safari and iOS Chrome (both use WebKit under the hood)
