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

The six worlds contain **25 ten-word quests**, including six guardian battles. Complete quests in order to unlock paths. All **250** original entries are accessible immediately through Word Vault practice, including Bulgarian translations and original English sentences. The primary curriculum assignment is deliberate, contiguous, and exhaustive:

| World | Official IDs | Quests | Mechanic |
| --- | --- | --- | --- |
| Enchanted Forest | 1–50 | 5 | Discover with optional hints |
| Crystal Caves | 51–100 | 5 | Letter-count pattern clues |
| Whispering Mountains | 101–150 | 5 | Slow pronunciation replay |
| Shadow Castle | 151–190 | 4 | Recall without hints |
| Dragon’s Lair | 191–230 | 4 | Two-life endurance |
| Champion’s Kingdom | 231–250 | 2 | No hints; optional 90-second word timer |

Regular quests have three lives (two in the last two worlds); missed words return in review. Bosses require every word correct, with retries using remaining lives. The last world culminates in a championship guardian. First quest completion gives 50 bonus XP; correct first answers give 20 XP, or 10 with hints; replays give 5. Relics, achievements, and daily review treasure are earned through play. The Word Vault also provides a ten-word weekly review challenge that can be replayed at any time. Daily treasure grants 25 XP once per local calendar day; there are no streak-loss penalties. Short sessions and breaks are encouraged.

The initial order is the source order, **not an official difficulty ranking**. Difficulty changes through hints, life budget, boss retries, and optional championship time pressure. Review prioritizes overdue words, then a combined error-rate/mistake-frequency score and earliest due date. Mastery requires three successful sessions separated by at least 24 hours; a mistake resets the word’s success streak. The default review schedule is 1, 3, 7, 14, 30 days and is injectable in `recordAnswer` for alternative schedules. Per-word history retains typed/spoken provenance, hints, timestamps and outcomes.

## Two spelling modes

**Listen & Type:** select an English voice, replay pronunciation and type the spelling. The answer is not rendered during an active round. Optional translation and original sentence hints exist only in early non-boss quests. Sentence audio necessarily contains the word. After submission the official word, translation and sentence appear.

**Listen & Spell Aloud:** select an engine, replay the word, start the microphone and say separate letter names with pauses. Stop and inspect the letter tiles. Correct misrecognized letters and check the confirmation box before casting the spell. Recognition never submits or marks an answer wrong automatically. An unknown whole-word transcript is marked uncertain, not treated as its correct spelling. Low confidence, B/P confusion, or missing letters must be resolved by the player. Corrections are free and remain marked as spoken provenance.

Engines:

1. **Browser on-device:** capability-detected `SpeechRecognition.processLocally`. Requires a browser with this experimental feature and a locally installed matching English language pack. Missing packs produce a visible error. It never silently falls back online.
2. **Browser service:** standard / prefixed Web Speech recognition in supporting browsers. Explicit per-visit consent is required because the browser vendor may process audio online. No service key or paid API is needed. Availability, privacy policy and connectivity are controlled by the browser vendor. Unsupported browsers get a visible explanation; the game does not disguise typed entry as microphone recognition.
3. **Optional local Vosk:** Apache-2.0 WASM engine in a worker, using `getUserMedia` audio entirely locally. The ~5.8 MB engine is lazy-loaded only when a model is selected; it is cached after that. **No large acoustic model is bundled or automatically downloaded.** Load a compatible English model archive from your disk in Settings, then select Vosk in spoken mode. Model initialization/permission errors are shown without scoring. This adapter is experimental pending hardware QA, especially Android memory/latency and isolated-letter accuracy.

### Preparing the optional Vosk model

Acquire a small English model from [Vosk’s official model catalog](https://alphacephei.com/vosk/models), for example `vosk-model-small-en-us-0.15` (catalog lists Apache-2.0, approximately 40 MB compressed). Verify its license when downloading. Download/extract it yourself; the app makes no request to the catalog. Vosk-browser expects a gzipped tar with a top-level folder called `model`, not the original ZIP:

```sh
unzip vosk-model-small-en-us-0.15.zip
mv vosk-model-small-en-us-0.15 model
tar -czf model.tar.gz model
```

Choose `model.tar.gz` in Settings. The file is processed locally; no recording or model file is uploaded. Archive limit: 150 MB. Models can consume substantially more RAM after decompression. The engine uses a ScriptProcessor bridge for broad compatibility (deprecated browser API; replace with AudioWorklet after device profiling). Vosk may cache extracted model files internally in its own browser filesystem; the selected model must be loaded again each visit. Retain your model archive for offline reopening. For first-time offline use, load the engine while online once; subsequent use can reopen the cached engine and select the local archive. Performance and actual acoustic recognition have **not** been validated on target hardware. Do not interpret automated mocked-transcript tests as acoustic accuracy certification.

## Persistence and backups

IndexedDB through `idb` stores a versioned progress object. Export/import is in Adventurer. Import validates the schema, vocabulary IDs, counters and attempt history and replaces current state. Export first to preserve the old device state. Devices do not sync. Browser data clearing/private mode/storage eviction can remove progress. Failed persistence is reported visibly and export remains available. Preferences and microphone online consent are visit-local. No audio recordings are stored by the app.

## Offline and installation

Vite PWA/Workbox precaches the app shell, official curriculum (bundled in JS), original artwork, icons and manifest after the first online load. A cached app can refresh offline. The optional Vosk engine is cached only after use; models are not app-precache assets. Updates show an in-app prompt so a child can finish the current round before reloading. The app does not force-update during a quest. GitHub Pages may require two visits for initial service-worker control; wait for the downloaded/offline-ready notification.

Install via Android Chrome’s Install app / Add to home screen or a desktop browser’s install menu. **Offline English TTS requires an installed local system voice.** A voice labeled local is a browser hint, not a guarantee on every OS. Browser online recognition is not offline. HTTPS (or localhost) is required for microphone permission. Opening from a tablet over plain LAN HTTP will not enable the microphone; use HTTPS hosting or a local trusted HTTPS setup.

## GitHub Pages

The included `.github/workflows/deploy.yml` runs lint, unit tests, Chromium integration tests, builds using `/<repository-name>/`, and deploys `dist/` using GitHub Actions. In repository Settings → Pages, choose **GitHub Actions**. Push to `main` or run the workflow manually. Source code and the deployment workflow are published. Hosting becomes live after Pages is enabled and the deployment workflow succeeds.

For a custom root domain or a `username.github.io` repository set `VITE_BASE_PATH=/` in the build step. For another project path:

```sh
VITE_BASE_PATH=/spelling-quest/ npm run build
```

No client routing paths are required; screens use local React state, avoiding Pages 404s. Service worker and manifest URLs follow the Vite base.

## Architecture

- `src/game.ts`: source-only curriculum, world assignment, deterministic scoring, progression, review, backup validation.
- `src/storage.ts`: `ProgressStore` interface and IndexedDB adapter.
- `src/speech.ts`: `PromptSpeaker`, `SpellingRecognizer`, browser adapter, conservative letter parser.
- `src/local-recognizer.ts`: optional local Vosk implementation of the recognizer contract.
- `src/Art.tsx`: original lightweight vector environments and guardians.
- `src/main.tsx`: responsive screens, game loop and recognition confirmation.
- `scripts/validate-words.mjs`: build-time integrity gate, exact 250 entries, contiguous IDs, uniqueness and nonempty original fields. The authoritative JSON is unmodified.

## Verification and device limits

Automated checks cover vocabulary coverage, scoring, mastery intervals, quest unlocks, backups, IndexedDB, letter parsing, quest completion, persistence, offline refresh, all-word access, tablet viewport fit and spoken confirmation with a **mocked browser recognition service**. Browser tests run against the production bundle. Hardware microphone/TTS testing cannot be simulated by those checks.

Before release to a child, verify on actual devices:

| Device/browser | Checks still requiring hands-on verification |
| --- | --- |
| Android tablet, current Chrome | Touch in portrait/landscape, voice installation and offline TTS, microphone permissions, native/on-device recognition capability, Vosk memory and letter latency, installation, offline refresh, save persistence |
| macOS Chrome/Safari | Installed English voices, Safari recognition availability/permissions, secure microphone context, local model compatibility, offline refresh and persistence |
| Windows Chrome/Edge | Windows English voice packs, recognition service/network behavior, microphone input, local WASM latency, installation and persistence |

Web Speech recognition is not universally supported (notably Firefox) and can vary by browser build, OS, policy, language and network. A visible typed mode is always available as an explicit player choice, never silently substituted. No universal offline recognition or platform support is claimed.

## Assets and licenses

All environment, guardian, crest and app icon SVG artwork is original code in this repository; no third-party franchise art, external fonts, image CDNs or recorded sound files. Fonts are installed system fonts. Optional success tone is synthesized with Web Audio and defaults off. Decorative motion respects OS reduced-motion and can be disabled in Settings. App shell remains ~334 KiB precached; optional Vosk is separate.

Third-party runtime packages: React (MIT), idb (ISC), vosk-browser/Vosk (Apache-2.0; see their distributed licenses). Acoustic models have separate licenses: consult the selected model’s official catalog entry. The competition curriculum is supplied by the project; its source URL is preserved in the JSON. The app does not claim ownership of that official source.
