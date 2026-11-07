# Sky Trail implementation log

`CODEX_BRIEF.md` governs. `quest3d/sky-trail.html` is an unchanged supplied behavior/timing reference, not the shipped app: its sample words, visible hints, auto-cast controls, CDN script and fonts are not used by the game.

Backup: branch `backup/pre-sky-trail-2026-11-07` and annotated tag `pre-sky-trail-2026-11-07`, both at `f63adb6`. Implementation is isolated on `quest3d-sky-trail` until all milestones pass. Existing tests are kept byte-for-byte unchanged.

## 1 · Scene skeleton

Lazy quest scene with forest island chain, original procedural hero, side-on stage camera, drag, reduced-motion still rendering, visibility suspension and full resource disposal. The existing banner remains the loading/error/context-loss fallback. The homepage playground appearance and all gameplay state are unchanged. New unit tests stub only the renderer; new browser checks cover reduced motion and fallback. No bridge/gameplay animation is added in this milestone.

## 2 · The bridge

Child-entered letters create cached rune sprites at fixed slots (not target-length spacing). Correct answers queue gold bridges, a 4.2 units/s walk, warm lanterns and gradual world brightening. Logical gaps are reserved immediately; Next and following input never wait for animation. Hidden/offscreen scenes stop rendering and fast-forward presentation work so a queue cannot deadlock while the child uses the spellbook below it. Reduced motion resolves presentation instantly. Disposal settles pending animation promises. Scoring remains exclusively in the unchanged game logic.

## 3 · Gentle miss

Incorrect stones fade and tumble in staggered lavender; the original procedural wisp lays the official spelling only after submission. It crosses to a blue lantern without adding gold or brightening the world. Boss retries crumble without advancing. DOM feedback uses blue/lavender and defeat shake is disabled. Reduced motion cuts immediately to the resulting state. Lives, XP, actual review scheduling and voice confirmation remain unchanged.
