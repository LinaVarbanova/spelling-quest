# Spelling Quest | 3D quest build brief ("Sky Trail")

Put this file in the repo root next to `CODEX_BRIEF.md`. `CODEX_BRIEF.md` still governs. Nothing here relaxes its rules on curriculum integrity, accessibility, offline use, supported devices, or never showing the answer before submission.

## The game in one paragraph
Each quest is a chain of floating islands in that world's style. A low-poly hero stands on the first island. **Each word is the gap to the next island.** As the child types, every letter rises out of the clouds as a glowing rune stone in the gap, so their spelling literally becomes the path. A correct spell turns the stones gold and snaps them into a rope-bridge curve. The hero walks across, the camera follows, and the lantern on the next island lights, so the sky gets brighter. A miss is gentle: the stones crumble softly into the clouds, and the wisp companion lays the correct word as pale-blue stones so the hero still crosses. That island's lantern glows blue, which marks a word that comes back in review. On the last island the gate opens (or, in boss quests, the guardian's shield breaks) and the camera circles the hero.

## Reference prototype
`quest3d/sky-trail.html` in this package is a working, single-file prototype of the full loop (5 words). Serve it over http to try it (`python3 -m http.server`), and add `?debug` to expose `window.__sq.state()`. **Port its behaviour and timings, not its code style.** Note the differences:
- The prototype uses the Three.js r128 global build. The repo uses `three@0.187` ES modules. Use `renderer.outputColorSpace = SRGBColorSpace` (not `outputEncoding`), and retune light intensities for physically correct lighting. The repo's playground uses hemisphere 2.6 and directional 4.1, which is a good starting range.
- The prototype shows the word in the hint so it can be played without audio. **The game must not.** Keep the existing listen-only prompt.

## Where it goes in the code (verified on `main`, commit 80738f8)
- `src/main.tsx`, `page === "quest"`: today `.battle-art` renders `<WorldArt world={active.world} boss={active.boss} />` plus the title and objective. **Replace the art block with `<QuestScene>` when WebGL works, and keep `.battle-art` and `WorldArt` as the fallback** (no WebGL, context lost, or init error). This mirrors how `IslandPlayground` falls back.
- Load it lazily like the playground: `const QuestScene = lazy(() => import("./QuestScene"))` inside `<Suspense>`, with the current `WorldArt` banner as the Suspense fallback.
- Reuse `src/playground-scene.ts`. Export its private helpers (`mesh`, `tree`, `cone`, `crystal`, `portal`, `tower`, `castle`, `dragon`, `material`) and `palette` / `realmColors`, so quest islands match the hero playground's art. Don't change how the playground looks.
- State you hook into: `answer` (typed or recognized letters), `submit()` (after `recordAnswer` sets `result`), `next()` / `resetRound()`, `round`, `score`, `lives`, `active.boss`, `active.words.length`, `reduced` plus the `reduced-motion` class and `prefers-reduced-motion`.

## New files
### `src/quest-scene.ts` (imperative, framework-free, like `createPlayground`)
```ts
export type QuestSceneOptions = {
  world: number;          // 0..5, chooses island style, stone material, light type
  boss: boolean;
  wordCount: number;      // active.words.length (islands = wordCount + 1)
  seed: string;           // active.id, so prop placement is stable per quest
  motion: boolean;
};
export type QuestSceneState = { arrived: number; gap: number; gold: number; blue: number; walking: boolean; phase: "intro" | "ready" | "crossing" | "finished" };
export function createQuestScene(container: HTMLElement, opts: QuestSceneOptions, onState?: (s: QuestSceneState) => void): {
  typed(letters: string): void;                        // sync stones in the current gap with what was typed (a–z only, max 14)
  resolve(r: { correct: boolean; word: string; retrySameGap?: boolean }): Promise<void>; // queued; never awaited by the UI
  finish(): Promise<void>;                             // gate opens / shield shatters, orbit camera
  setMotion(on: boolean): void;
  dispose(): void;
};
```
### `src/QuestScene.tsx` (thin React wrapper)
- It mounts the scene, calls `typed(answer)` whenever `answer` changes and no `result` is set, calls `resolve(...)` in an effect when `result` goes from null to a value, and calls `finish()` once the last word resolves with lives left. It disposes on unmount and on quest change.
- Write the scene state to `data-scene-*` attributes on the container (`data-scene-arrived`, `data-scene-gold`, `data-scene-blue`, `data-scene-phase`) for tests.
- Dispatch `playground-unavailable`-style fallback on `webglcontextlost` or an init error, so `main.tsx` shows `WorldArt` again.

## Behaviour spec (timings from the prototype)
**Layout**
- Island centres: `x = i * 10.5`, `y = sin(i * 1.3) * 0.9`, `z = sin(i * 0.75) * 4.2` (a gentle winding chain). Island top radius 2.3. Bridges span edge to edge with a 0.55 sag at the middle.
- Each island: the world's ground and rock from `palette[world]`, plus 0–9 props from the world's set. **Place props only on the far side of the path** (dot with the path's side vector > 0.8), so nothing hides the hero from the stage camera. The last island has no props except the gate or guardian.
- Every island after the first has a light post on the far side. The light type follows each world's `objective` in `game.ts`: 0 lantern, 1 crystal shard, 2 summit beacon, 3 candle window, 4 ember brazier, 5 crown jewel.

**Stones (the spelling)**
- Typing a letter: a stone (0.42×0.16×0.95 box, world-tinted material) plus an upright letter sprite (canvas texture, display serif, cached per letter and colour) rises 3.2 units from below into slot `k` (slot fraction `(k + 0.6) / 11` along the bridge curve) over 340ms with a back-out ease. Deleting: the stone floats up 0.2 and fades over 200ms. Editing mid-word just relabels the stone.
- The stones show **only what the child typed**. Don't size the gap or space the slots by the target word length, because that would leak the length. Slot spacing is fixed.
- Spoken mode: recognized candidate letters (`answer`) drive `typed()` the same way.

**Correct**
1. The stones turn gold (gold material, warm emissive, letter colour #fff2cf).
2. They stretch to even spacing along the curve, `(k + .5) / n`, over 380ms in-out.
3. The hero walks edge A → stones → edge B → landing spot at 4.2 units/s, with a body bob of `|sin(9t)| * .09` and a sway of `sin(9t) * .06`.
4. On arrival, the post lights: emissive 0 → 1.4 and point light 0 → 1.6 over 700ms, plus a 26-particle additive burst. The world brightens: hemisphere intensity goes up by about 0.11 per lit light, and fog density goes down from 0.03 towards 0.018, over 1.2s.

**Miss** (not in boss quests)
1. The stones turn muted lavender. After 250ms they crumble one by one, 60ms apart: each falls 5 units with tumble rotation and fades over 900ms.
2. The wisp flies to edge A, then lays the correct word's stones in pale blue at 120ms per letter. This runs only after `result` is set, which is allowed.
3. Stretch, then cross, as with a correct spell. The post lights **blue** (#bfe3ff), and the world does not brighten.
4. The `.life` gem dims in the DOM HUD. There is no shake and no red anywhere.

**Boss quests**
- The last island holds the guardian. Reuse the `Crest` motif and the world's tower or castle helpers, surrounded by a ring of `wordCount` shield segments.
- A correct spell builds the bridge as usual, and a light bolt arcs from the bridge to crack one shield segment (it falls away and fades over 600ms).
- A miss: the stones crumble, there's no wisp bridge, and the guardian sways ±2° over 500ms. The hero stays, because `next()` already retries the same word in boss quests (`retrySameGap: true`).
- Victory: the remaining shield bursts into 40 gold particles, then the orbit camera.

**Camera** (perspective; fov 48, or 60 when the aspect ratio is below 1.2)
- *Intro:* start high and wide over the whole chain (offset (chain mid, 22, -26)), then swoop down to the stage view. The follow factor ramps up from 0.9 over the first 2s.
- *Stage view* (whenever the hero isn't walking): side-on to the current gap, so the hero is on the left and the bridge reads **left to right**. Position: gap point at 0.36, minus the side vector × 10 (× 12.5 in portrait), plus up 3.4, minus the direction × 2.2. Look at the gap point at 0.36 + up 0.5. This is what makes the letters readable.
- *Follow* (while walking): behind and above the hero, at heading × −6.8 + up 3.9 + side × −1.6, looking 3 units ahead.
- *Orbit* (finished): circle the last island at radius 7, height 3.6, 0.18 rad/s.
- Drag rotates the view ±1.1 rad and springs back when released. Smooth everything with frame-rate-independent lerps.

**Hero and wisp**
- The hero is built from primitives: a robe cone, a cape, a head sphere, a hat cone with a gold brim torus, and a staff with a glowing orb plus a warm point light. Add a blob shadow (a transparent circle). There are no external models.
- The wisp is a pale-blue core plus an additive glow sprite plus a small point light. It orbits the hero at radius 1.15 and height 2.05. It flies to targets on "Hear the word" (hovering above the hero while the audio plays) and during a miss.

**Never block the child**
- `resolve()` calls are queued, and the UI never awaits them. The feedback card and the Next button behave exactly as they do today.
- When resolves queue up, the hero walks faster: speed × (1 + (pending − 1) × 0.8).
- Typing for the next word can start while the hero is still walking. Its stones appear in the next gap.

**Reduced motion** (the `reduced` setting, the `reduced-motion` class or the media query; the global CSS rule doesn't reach WebGL)
- No intro swoop. Camera changes are cuts. Stones appear in place. The hero moves to the landing spot instantly. No particles, no bob, no cloud drift.
- Render on demand only (after a state change), not in a continuous loop, the same as the playground's `motion` flag.

**Ambient**
- About 90 firefly points (additive), a star dome of about 700 points, and about 70 cloud sprites below the islands drifting slowly in x. Fog is `FogExp2`.

## Performance budget (Android tablet in Chrome is the priority device)
- `powerPreference: "low-power"`, pixel ratio capped at 1.75 (1.5 when `matchMedia("(pointer: coarse)")`). Cap at 30fps while moving, like the playground. No shadow maps (use the blob shadow).
- Keep the scene under about 25k triangles. Share materials. Merge static island geometry per island. Cache letter textures. Dispose all geometry, materials and textures on `dispose()`.
- Pause when offscreen (IntersectionObserver) or when `document.hidden`. Code-split: the quest scene loads only when a quest opens.

## Integrity and accessibility
- The canvas is `aria-hidden`. Everything a screen reader needs stays in the existing DOM: the quest title, `role="status"` feedback, the lives label and progress.
- Before submission, the canvas only ever shows letters the child typed. The correct word appears (wisp stones) only after `result` is set.
- All art is original and procedural (Three.js primitives plus canvas textures). Don't add any external assets.

## Keep the existing tests passing unchanged
`tests/browser/adventure.spec.ts` uses: `getByLabel("Your spelling")` + `.fill()`, the button named "Cast spell", a `role="status"` containing the word, the buttons "Next word" and "See your journey", the heading "Another path shines brighter.", the button "Quest 2", the heading "Trail 2", `.round-body`, `.xp`, `.brand`, `.word-card`, "Start recording" and "Confirm letters & cast spell". Keep all of these names, roles and classes.

## New tests
- Unit (Vitest): `createQuestScene` state machine with a stubbed renderer. Slot positions don't depend on the target word. A miss produces `blue + 1` and never `gold + 1`. `retrySameGap` keeps `arrived`. The queue speed-up maths.
- Playwright:
  1. Open Trail 1 and spell the first word correctly. `[data-scene-gold="1"]` and `[data-scene-arrived="1"]` appear within 6s, and the "Next word" button is enabled within 300ms of casting.
  2. Spell it wrong. `data-scene-blue` becomes 1, and one `.life.full` is removed.
  3. With `page.emulateMedia({ reducedMotion: "reduce" })`, `data-scene-phase` is `ready` within 500ms of load (no intro).
  4. With WebGL forced off (an `addInitScript` that makes `HTMLCanvasElement.prototype.getContext` return null for webgl), the old `.battle-art` with `WorldArt` shows and the quest is still playable.
  5. Before submission, `.round-body` doesn't contain the word (extends the existing check).

## Milestones (commit after each; run lint, unit tests, build and e2e every time)
1. **Scene skeleton:** islands for the Enchanted Forest, the hero, the stage camera, fallback wiring, lazy loading, reduced motion, dispose. No gameplay yet.
2. **The bridge:** typed stones, correct crossing, lanterns and world brightening, the queue. This is the core: make it feel right on a tablet before moving on.
3. **Gentle miss:** crumble, wisp-laid blue bridge, blue lanterns.
4. **Six worlds:** island props, stone materials and light types per world, built from the exported playground helpers.
5. **Guardian battles:** shield ring, light bolt, sway, shatter.
6. **Polish:** intro swoop, finish orbit, ambient sky, the "Hear the word" wisp, an optional soft chime through the existing `chime()` (muted by default, as it is now).

Report at the end in the `CODEX_BRIEF.md` format: what works, what's unverified on a real Android tablet, Mac and Windows, and how to run it.
