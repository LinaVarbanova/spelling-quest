# Sky Trail implementation log

`CODEX_BRIEF.md` governs. `quest3d/sky-trail.html` is an unchanged supplied behavior/timing reference, not the shipped app: its sample words, visible hints, auto-cast controls, CDN script and fonts are not used by the game.

Backup: branch `backup/pre-sky-trail-2026-11-07` and annotated tag `pre-sky-trail-2026-11-07`, both at `f63adb6`. Implementation is isolated on `quest3d-sky-trail` until all milestones pass. Existing tests are kept byte-for-byte unchanged.

## 1 · Scene skeleton

Lazy quest scene with forest island chain, original procedural hero, side-on stage camera, drag, reduced-motion still rendering, visibility suspension and full resource disposal. The existing banner remains the loading/error/context-loss fallback. The homepage playground appearance and all gameplay state are unchanged. New unit tests stub only the renderer; new browser checks cover reduced motion and fallback. No bridge/gameplay animation is added in this milestone.

## 2 · The bridge

Child-entered letters create cached rune sprites at fixed slots (not target-length spacing). Correct answers queue gold bridges, a 4.2 units/s walk, warm lanterns and gradual world brightening. Logical gaps are reserved immediately; Next and following input never wait for animation. Hidden/offscreen scenes stop rendering and fast-forward presentation work so a queue cannot deadlock while the child uses the spellbook below it. Reduced motion resolves presentation instantly. Disposal settles pending animation promises. Scoring remains exclusively in the unchanged game logic.

## 3 · Gentle miss

Incorrect stones fade and tumble in staggered lavender; the original procedural wisp lays the official spelling only after submission. It crosses to a blue lantern without adding gold or brightening the world. Boss retries crumble without advancing. DOM feedback uses blue/lavender and defeat shake is disabled. Reduced motion cuts immediately to the resulting state. Lives, XP, actual review scheduling and voice confirmation remain unchanged.

## 4 · Six worlds

Each world now uses its existing playground palette and exported art helpers. Deterministic quest-seeded props occupy only the far side of the path; static geometry is merged by shared material per island, with lower-resolution sphere geometry for the tablet budget. The six light shapes follow the world objectives: lantern, crystal, summit beacon, candle window, ember brazier and crown jewel. Typed runes are world-tinted. Unit checks build all six worlds and verify the far-side placement and sub-25k triangle budget. The original playground helper bodies and appearance remain unchanged.

## 5 · Guardian battles

Boss destinations use the exported tower/castle art and the existing shield-and-star Crest silhouette, surrounded by one shield arc per word. Gold crossings send an arcing light bolt and drop/fade one arc. Misses crumble and gently sway the guardian without moving the hero, lighting a blue post or changing the shield. Victory clears the shield in a gold burst (no particles with reduced motion). New state-machine coverage checks retry, individual cracks and a complete victory; existing boss gameplay tests stay unchanged.

## 6 · Motion and polish

Landscape layouts keep a sticky path beside the spellbook; portrait layouts stay stacked. Partial initialization failure releases the renderer before restoring the old banner. Intro sweeps from a wide view of the chain into the side-on stage; completion opens the gate and orbits the final island. A batched 700-point star field, 90 fireflies and 70 cloud billboards use a locally generated glow texture; arrival emits 26 particles and guardian victory 40. Reduced motion removes swoops, drifting, bobbing and particles, cuts to landings and renders on demand. Visibility suspension stops the GPU and advances queued presentation to avoid blocking play. The wisp hovers over the hero only during actual speech playback; optional speaker activity callbacks cover start/end/error/cancel without changing recognition. The existing optional success chime stays muted by default. Scene-owned resources are disposed, including cached rune/glow textures; Three.js's internal shared sprite quad remains engine-owned.

The original tests are unchanged (SHA-256 checked at each milestone). New tests are separate files. Verification uses Linux Chromium with a software GPU and mocked microphone results; it does not certify Android, macOS or Windows hardware. Actual device touch/keyboard, sustained GPU performance, native microphone pauses/permissions, English voices/offline TTS, PWA installation/offline refresh and IndexedDB persistence remain manual checks. See README for run and backup instructions.

## Verification record

Every milestone runs `npm run lint`, `npm test`, `npm run build` and `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e` before its commit. The production build validates all 250 official entries.

| Milestone | Unit tests | Chromium e2e | Result |
| --- | ---: | ---: | --- |
| 1 | 30 | 15 | All passed |
| 2 | 33 | 16 | All passed |
| 3 | 35 | 17 | All passed |
| 4 | 37 | 17 | All passed |
| 5 | 38 | 17 | All passed; timing run repeated without competing screenshot renderer |
| 6 | 44 | 19 | All passed |

Milestone 6 adds complete reduced-motion trail and guardian browser playthroughs, intro/cut/finish/disposal unit checks, playback lifecycle tests, and checks the maximum 25-gap guardian geometry budget for every world. Additional verification passed with `VITE_BASE_PATH=/spelling-quest/ npm run build -- --outDir dist-pages`, serving with the same base setting, then reloading offline and opening the lazy 3D quest to score a typed word. Screenshot review covered all six world styles, a completed guardian scene, a 1024×768 landscape layout with scene and input visible together, and a 480px portrait layout. Vite retains its advisory about the shared Three.js chunk exceeding 500 kB; the code remains lazy-loaded and precached.
