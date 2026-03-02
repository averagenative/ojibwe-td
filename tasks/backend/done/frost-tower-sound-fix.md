---
id: TASK-097
title: Frost Tower Sound — Less Annoying
status: done
category: backend
priority: high
depends_on: []
created: 2026-03-02
---

## Description

The frost tower's procedural firing sound is annoying/grating during gameplay. Rework
the synthesis to be less harsh — a softer crystalline shimmer rather than a piercing tone.

## Acceptance Criteria

- [ ] Frost tower firing sound is noticeably less harsh/annoying
- [ ] Sound still communicates "frost/ice" — cold, crystalline character
- [ ] Volume balanced with other tower sounds (not louder than cannon/arrow)
- [ ] Sounds good when multiple frost towers fire in rapid succession
- [ ] `npm run typecheck` clean

## Notes

- The procedural SFX is in `AudioManager.ts` — look for the frost/ice synthesis parameters
- Key adjustments: lower the base frequency, shorter duration, softer attack envelope, less harsh waveform (sine instead of square/sawtooth)
- Consider adding a subtle high-pass filter to remove bass rumble
- If an mp3 SFX file is later added via Suno, it will override the procedural version
