# Spelling Quest

**[Play Spelling Quest in your browser](https://linavarbanova.github.io/spelling-quest/)**

First-time hosting setup: open [Settings → Pages](https://github.com/LinaVarbanova/spelling-quest/settings/pages), choose **GitHub Actions** as the source, then run **Test and deploy GitHub Pages** from the [Actions tab](https://github.com/LinaVarbanova/spelling-quest/actions/workflows/deploy.yml). The play link becomes available after a successful deployment.

A free, static React + TypeScript + Vite fantasy spelling adventure for the **2027 Bulgarian National English Spelling Bee JUNIOR school level**. No accounts, tracking, paid APIs or application server.

## Run

Requires Node 22+ and npm.

```sh
npm install
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

Open the localhost URL printed by Vite. Production output is `dist/`. For browser tests:

```sh
npx playwright install chromium
npm run test:e2e
# If Chromium is already installed:
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

## Play

The six worlds contain **25 ten-word quests**, including six guardian battles. Complete quests in order to unlock paths. All **250** original entries are accessible immediately through Word Vault practice, including Bulgarian translations and original English sentences. The primary curriculum uses a deterministic spelling-complexity order. The rank ranges below refer to this game-derived order, **not official IDs**. The authoritative JSON and original IDs remain unchanged:

| World | Difficulty ranks | Quests | Mechanic |
| --- | --- | --- | --- |
| Enchanted Forest | 1–50 | 5 | Discover with optional hints |
| Crystal Caves | 51–100 | 5 | Letter-count pattern clues |
| Whispering Mountains | 101–150 | 5 | Slow pronunciation replay |
| Shadow Castle | 151–190 | 4 | Recall without hints |
| Dragon’s Lair | 191–230 | 4 | Two-life endurance |
| Champion’s Kingdom | 231–250 | 2 | No hints; optional 90-second word timer |

Regular quests have three lives (two in the last two worlds); missed words return in review. Bosses require every word correct, with retries using remaining lives. The last world culminates in a championship guardian. First quest completion gives 50 bonus XP; correct first answers give 20 XP, or 10 with hints; replays give 5. Relics, achievements, and daily review treasure are earned through play. The Word Vault also provides a ten-word weekly review challenge that can be replayed at any time. Daily treasure grants 25 XP once per local calendar day; there are no streak-loss penalties. Short sessions and breaks are encouraged.

The initial learning path is sorted **from simpler to more complex spelling**, not alphabetically. `src/difficulty.ts` combines length, vowel teams, doubled consonants, final-e patterns, less common consonant sequences, soft c/g and longer endings. An explicit reference table raises selected irregular words such as `cough`, `cupboard`, `hygiene`, `environment` and `rhythm` even when they are short. Ties use length, alphabetical order and then original ID for deterministic results. These are transparent game-derived estimates, **not official competition levels, measured student difficulty, or a claim that every learner finds the same words hard**. The Word Vault defaults to difficulty and can switch to alphabetical or official-list order; each word shows its band and pattern reasons. Worlds retain their themed mechanics, hints, life budgets, boss battles and optional championship timer. Review prioritizes overdue words, then a combined error-rate/mistake-frequency score and earliest due date. Mastery requires three successful sessions separated by at least 24 hours; a mistake resets the word’s success streak. The default review schedule is 1, 3, 7, 14, 30 days and is injectable in `recordAnswer` for alternative schedules. Per-word history retains typed/spoken provenance, hints, timestamps and outcomes.

## Two spelling modes

**Listen & Type:** select an English voice, replay pronunciation and type the spelling. The answer is not rendered during an active round. Optional translation and original sentence hints exist only in early non-boss quests. Sentence audio necessarily contains the word. After submission the official word, translation and sentence appear.

**Listen & Spell Aloud:** replay the word, press **Start recording** and say separate letter names with pauses. Take as much time as needed, then press the separate **Stop recording** button. Results accumulate while recording; scoring stays disabled until Stop has collected the final result. Browser silence/session ends are restarted automatically while retaining earlier letters. A brief gap during browser restarts is possible; permission, device and network failures stop capture visibly and retain the transcription. The app always uses the **browser speech service**; there is no engine selector or in-app consent checkbox. Your browser still controls its own microphone permission prompt. The service may process audio online through the browser provider, and availability depends on the browser and network. Spelling Quest does not store recordings.

Stop and inspect the letter tiles. Correct any misrecognized letters, then press **Confirm letters & cast spell**. This single action confirms and scores the spelling; there is no separate confirmation checkbox. Recognition requests final results rather than interim hypotheses. Drafts from a browser session ending on silence are discarded instead of being added to the next session. Some browser services replay growing full-phrase results in different result slots; the app collapses those to the latest revision and explicitly flags the result for review. Isolated repeated letters such as `B E E` are retained. This normalization never consults the expected word or silently corrects a spelling. A last unfinished draft may be offered only after Stop, marked uncertain. Recognition never submits or marks an answer wrong automatically. Low confidence and unknown tokens are flagged for review. Corrections are free and remain marked as spoken provenance. Unsupported browsers show a visible explanation; typed entry is an explicit mode choice.

The `SpellingRecognizer` interface remains modular. An experimental local Vosk adapter remains in `src/local-recognizer.ts` for possible future integration, but is not exposed, loaded or downloaded by the current app. There is no automatic local-engine switch. Microphone recording starts only when the player presses **Start recording**; choosing the browser service does not keep the microphone continuously recording.

## Persistence and backups

IndexedDB through `idb` stores a versioned progress object. Export/import is in Adventurer. Import validates the schema, vocabulary IDs, counters and attempt history and replaces current state. Export first to preserve the old device state. Devices do not sync. Browser data clearing/private mode/storage eviction can remove progress. Failed persistence is reported visibly and export remains available. Speech and comfort preferences are visit-local. No audio recordings are stored by the app.

### Difficulty-path migration

Backups retain schema `version: 1` and now carry `curriculumVersion: 2`. Earlier saves without a curriculum version are migrated on load/import: XP, individual word histories, mastery, review dates, activity days and daily treasure claims are preserved. Old alphabetical quest completions are archived in `legacyCompletedQuests`; earned relics and achievements remain visible. A new difficulty quest is carried over only when all of its words belong to previously completed alphabetical quests, and only a contiguous prefix can be unlocked this way. Otherwise its new words must be practised. This avoids silently skipping words after reordering. The journal explains why a trail may reopen. Quest-completion treasure already awarded for an earlier slot is not awarded twice. Migration is deterministic and idempotent. Original official IDs remain the storage keys throughout.

## Offline and installation

Vite PWA/Workbox precaches the app shell, official curriculum (bundled in JS), original artwork, icons and manifest after the first online load. A cached app can refresh offline. Browser speech recognition may require internet; it is not provided by the offline app cache. Updates show an in-app prompt so a child can finish the current round before reloading. The app does not force-update during a quest. GitHub Pages may require two visits for initial service-worker control; wait for the downloaded/offline-ready notification.

Install via Android Chrome’s Install app / Add to home screen or a desktop browser’s install menu. **Offline English TTS requires an installed local system voice.** A voice labeled local is a browser hint, not a guarantee on every OS. Browser online recognition is not offline. HTTPS (or localhost) is required for microphone permission. Opening from a tablet over plain LAN HTTP will not enable the microphone; use HTTPS hosting or a local trusted HTTPS setup.

## GitHub Pages

The included `.github/workflows/deploy.yml` runs lint, unit tests, Chromium integration tests, builds using `/<repository-name>/`, and deploys `dist/` using GitHub Actions. In repository Settings → Pages, choose **GitHub Actions**. Push to `main` or run the workflow manually. Source code and the deployment workflow are published. Hosting becomes live after Pages is enabled and the deployment workflow succeeds.

For a custom root domain or a `username.github.io` repository set `VITE_BASE_PATH=/` in the build step. For another project path:

```sh
VITE_BASE_PATH=/spelling-quest/ npm run build
```

No client routing paths are required; screens use local React state, avoiding Pages 404s. Service worker and manifest URLs follow the Vite base.

## Architecture

- `src/game.ts`: source-only curriculum, complexity-based world assignment, deterministic scoring, progression, review and backward-compatible backup migration.
- `src/difficulty.ts`: transparent spelling-complexity rules and curated irregular-spelling reference scores.
- `src/storage.ts`: `ProgressStore` interface and IndexedDB adapter.
- `src/speech.ts`: `PromptSpeaker`, `SpellingRecognizer`, browser adapter, conservative letter parser.
- `src/local-recognizer.ts`: optional local Vosk implementation of the recognizer contract.
- `src/Art.tsx`: separate high-resolution 3D realm posters and lightweight SVG crests/treasure artwork.
- `src/IslandPlayground.tsx` and `src/playground-scene.ts`: a lazy-loaded original Three.js playground, with draggable islands, keyboard-accessible world controls, reduced-motion support and a non-WebGL fallback.
- `src/main.tsx`: responsive screens, game loop and recognition confirmation.
- `scripts/validate-words.mjs`: build-time integrity gate, exact 250 entries, contiguous IDs, uniqueness and nonempty original fields. The authoritative JSON is unmodified.

## Verification and device limits

Automated checks cover vocabulary coverage, scoring, mastery intervals, quest unlocks, backups, IndexedDB, letter parsing, quest completion, persistence, offline refresh, all-word access, tablet viewport fit and spoken confirmation and a checkbox-free browser-service default with a **mocked browser recognition service**. Browser tests run against the production bundle. Hardware microphone/TTS testing cannot be simulated by those checks.

Before release to a child, verify on actual devices:

| Device/browser | Checks still requiring hands-on verification |
| --- | --- |
| Android tablet, current Chrome | Touch in portrait/landscape, voice installation and offline TTS, microphone permissions, native/on-device recognition capability, Vosk memory and letter latency, installation, offline refresh, save persistence |
| macOS Chrome/Safari | Installed English voices, Safari recognition availability/permissions, secure microphone context, local model compatibility, offline refresh and persistence |
| Windows Chrome/Edge | Windows English voice packs, recognition service/network behavior, microphone input, local WASM latency, installation and persistence |

Web Speech recognition is not universally supported (notably Firefox) and can vary by browser build, OS, policy, language and network. A visible typed mode is always available as an explicit player choice, never silently substituted. No universal offline recognition or platform support is claimed.

## Assets and licenses

The six current realms are original procedural 3D scenes in `src/playground-scene.ts`. The live hero renders real WebGL geometry; cards use individual 960px posters and quest scenes use individual 2400px posters. No enlarged atlas crops are used. Source notes and regeneration instructions are in `public/worlds/ARTWORK.md`. Run `npm run render:worlds` while the dev server is running to regenerate the committed assets using Playwright.

Crest, treasure and app icon SVG artwork is original code. No purchased models, franchise art, external fonts, image CDNs or recorded sounds. Fonts are installed system fonts; optional success audio uses Web Audio and defaults off. Motion respects both OS reduced-motion and Settings. The WebGL module is lazy-loaded, rendering is capped at approximately 30 FPS and pauses offscreen/in hidden tabs; reduced-motion mode uses static frames updated only by interaction. Pixel ratio is capped at 2. Context loss or lack of WebGL falls back to original static posters with the same HTML controls. Actual GPU performance on Android tablet hardware remains unverified.

The earlier ImageGen atlas remains in the repository as design history but is excluded from offline precaching. All active artwork and the 3D code are cached by the PWA; no remote assets or paid APIs are needed.

Third-party runtime packages: React (MIT), Three.js (MIT), idb (ISC), vosk-browser/Vosk (Apache-2.0; see their distributed licenses). Acoustic models have separate licenses: consult the selected model’s official catalog entry. The competition curriculum is supplied by the project; its source URL is preserved in the JSON. The app does not claim ownership of that official source.
