# Code Review Checklist — Ojibwe TD

Used by Agent 2 (Review) in the orchestrator pipeline.
Work through every category. Fix issues before moving on. Do not skip sections.

---

## 1. Acceptance Criteria Coverage
- [ ] Every criterion in the task file is satisfied — re-read each one and verify in code
- [ ] No criterion is partially implemented or deferred with a TODO
- [ ] Criteria that specify "MUST" are treated as hard requirements, not suggestions

## 2. Stubs & Fake Implementations
- [ ] No function body that only contains `throw new Error('not implemented')` or similar
- [ ] No placeholder `return null`, `return []`, `return 0` where real logic is expected
- [ ] No empty function body `{}` where behaviour was required
- [ ] No `// TODO`, `// FIXME`, `// HACK`, `// STUB` comments left in new code
- [ ] No hardcoded magic values used in place of real computation (e.g. `return 42`)

## 3. Integrations — Wired, Not Orphaned
- [ ] Every new class/system is actually instantiated somewhere (GameScene or appropriate scene)
- [ ] Every new event emitted (`scene.events.emit(...)`) has at least one subscriber
- [ ] Every new event subscribed (`scene.events.on(...)`) is actually emitted somewhere
- [ ] New UI panels are added to the scene's update/resize flow
- [ ] New systems that need `update(dt)` called are registered in the scene's update loop
- [ ] Anything that needs teardown has `destroy()` implemented and called

## 4. TypeScript Correctness
- [ ] `npm run typecheck` exits 0 with zero errors
- [ ] No `any` type used (use `unknown` + narrowing, or proper types)
- [ ] No `as SomeType` casts that hide real type mismatches
- [ ] All exported interfaces/types are consumed correctly at call sites
- [ ] No implicit `undefined` access without a guard

## 5. Memory & Cleanup
- [ ] Every `scene.events.on(...)` has a corresponding `off(...)` in `destroy()`
- [ ] Every `setInterval` / `setTimeout` is cleared in `destroy()`
- [ ] Phaser GameObjects removed from scene when no longer needed (`destroy()` called)
- [ ] No accumulating arrays/maps that grow without bound during a run

## 6. Edge Cases
- [ ] Empty collections handled (no tower placed yet, wave with 0 creeps, etc.)
- [ ] Boundary values tested (tier 0, tier 5, 0 gold, max gold, 0 lives)
- [ ] Negative / NaN inputs guarded where they can arrive from external data
- [ ] Concurrent events handled (e.g. creep dies the same frame it's targeted)

## 7. Code Style Consistency
- [ ] Naming matches existing conventions (camelCase props, PascalCase classes, SCREAMING_SNAKE constants)
- [ ] New files follow the same import ordering as adjacent files
- [ ] No logic duplicated that already exists in a sibling system
- [ ] Comments explain *why*, not *what* (the code says what; comments say why)

## 8. Test Coverage
- [ ] Unit tests written for all new pure logic (engines, calculators, state machines)
- [ ] Tests live in `src/systems/__tests__/` following Vitest + jsdom pattern
- [ ] Happy path covered
- [ ] At least one boundary/edge case per function
- [ ] At least one error/invalid-input case per function
- [ ] `npm run test` exits 0 with zero failures

## 9. Performance (update-loop safety)
- [ ] No `new` allocations inside Phaser `update()` (use object pools or pre-allocate)
- [ ] No expensive array searches (`find`, `filter`) run every frame on large sets — cache or index
- [ ] No DOM queries or `document.querySelector` inside the update loop

## 10. Final Gate
- [ ] `npm run check` (typecheck + lint + test) exits 0
- [ ] A manual smoke-test in the browser shows the feature working as described
- [ ] No regressions: existing features from prior phases still function
