# Spelling Quest | Codex implementation brief

## Mission
Build a beautiful, genuinely playable, mobile-first adventure spelling game for a 12-year-old preparing for the **2027 Bulgarian National English Spelling Bee JUNIOR school level**. Use the provided `words-2027-junior.json` as the authoritative curriculum. The goal is memorization, confident spoken spelling, retention, and enjoyment. Deliver working code, not mockups or just a project plan.

## Non-negotiable architecture
- Static Progressive Web App (PWA), TypeScript, React, Vite. Free GitHub Pages deployment via GitHub Actions. Also runs locally with `npm install`, `npm run dev`.
- No paid APIs, server, accounts, passwords, tracking, analytics, or network inference required.
- Responsive tablet-first UI, accessible keyboard controls, clear readable typography, optimized for Android tablets running Chrome, plus macOS (Chrome and Safari) and Windows laptops (Chrome and Edge). Do not target iPad/iPadOS as a required device.
- Store progress in IndexedDB, using a maintained small wrapper if helpful, plus export/import JSON backup with versioning. Different devices do not automatically sync.
- Offline-first app shell/service-worker cache, carefully handling updates and cached assets. Offline voice output is only guaranteed where an installed local system voice is available; disclose this limitation in UI.
- Separate game logic, data, speech synthesis, speech recognition, and storage behind testable interfaces. Never couple game progression to a particular speech service.
- No LLM required at runtime. All score and progression decisions must be deterministic/testable.

## Curriculum and integrity
- `words-2027-junior.json` contains **exactly 250** indexed entries, preserving the official word, Bulgarian translation and English example sentence. Never silently correct source text. Do not invent definitions, pronunciations, or word entries and present them as official.
- Validate contiguous IDs 1 through 250, uniqueness and nonempty fields at import/build time. Keep original ID for reference.
- Organize into six themed worlds with all 250 words assigned exactly once in their primary learning progression, plus repeated review across worlds. World themes: Enchanted Forest (discovery), Crystal Caves (patterns), Whispering Mountains (listen/type), Shadow Castle (spell aloud), Dragon's Lair (review), Champion's Kingdom (simulation). Review-only worlds may replay previously introduced words, so primary assignments may be concentrated in early worlds. Make distribution deliberate and visible.
- Use mistake frequency, accuracy, and review due dates to adapt sequence. Initial difficulty heuristic should be clearly labeled game-derived, not official ranking. Flag tricky spelling patterns (e.g. `rhythm`, `cupboard`, `knowledge` only when actually in list, `environment`), without creating words outside the official list.
- In active spelling rounds never render the answer, including via visible translated word labels, before submission. For a spoken prompt, offering the original example sentence orally is fine, but be mindful it contains the target word. Preserve exact original sentences.

## Gameplay
- World map with distinct environments; quests, 8-12 word missions, lives, XP, unlocks, badges, rewards, boss battles, a Word Vault for mistakes, weekly review challenge, and final championship. Make the loop pleasant, challenging, and not cluttered.
- Core challenge modes: listen-and-type, fill-in-the-missing-letters (learning only), unscramble (learning only), listen-and-spell-aloud (subject to microphone support), mixed boss battles, and championship with no hints and optional time pressure.
- Track each word separately: attempts, typed/spoken attempt provenance, correct/incorrect outcomes, consecutive successful sessions, last seen, next review date, hint usage, and mastery state. Do not equate one correct guess with mastery. Use spaced repetition with configurable schedule and tests.
- If speech recognition is unavailable, allow a typed fallback in the exact same quest, without blocking progression. Clearly disclose when spoken scoring is not supported.
- Parent dashboard with completion, accuracy by mode, words mastered, due reviews, weak words and export/import. Avoid manipulative game mechanics or excessive screen time incentives; support 10-15 minute sessions.

## Speech: major design challenge
1. Audio prompt uses `speechSynthesis` with English locale preference `en-GB` or `en-US` selected in settings; show installed available voices, allow replay and rate adjustments. Actual offline availability varies with installed browser/system voices. No promise of universal offline TTS.
2. Spoken spelling: microphone capture is opt-in, secure context required (HTTPS GitHub Pages or localhost), clear mic status, stop/retry and no upload by default. Do NOT assume Web Speech API recognition runs offline; in many browsers it uses network or is unsupported.
3. Define an interface `SpellingRecognizer` with a capability check, status/result/errors and multiple implementations: safe/manual confirmation fallback, optional browser recognition, later a locally executed WASM/model engine if measured to be performant on Android tablets and desktop browsers. Avoid downloading very large models by default.
4. Ordinary speech-to-text is unreliable for isolated letters (`B E E` vs `bee`, B/P, M/N). Build a candidate parser for letter-name tokens and phonetic markers, show detected letters one by one, and **ask the child to confirm or edit the transcription before scoring**. If confidence is low or ambiguous, do not mark wrong automatically. Prioritize fairness and accuracy over automated scoring.
5. Never send recordings to any API without a separately enabled, explicit option. Free-only offline mode must never silently switch to cloud recognition.
6. Add clear feedback for microphone denial, unsupported browsers, model load failures and offline TTS unavailability. Test Android Chrome microphone and audio behavior first, then macOS Chrome/Safari and Windows Chrome/Edge. Do not falsely claim universal support.

## Supported devices and browser QA
- Priority 1: Android tablet with current Chrome, using touch controls, device microphone and speech synthesis.
- Priority 2: Mac laptop with Chrome and Safari, using keyboard and microphone.
- Priority 3: Windows laptop with Chrome and Edge, using keyboard and microphone.
- Verify microphone permissions, TTS voice availability, storage persistence and offline refresh on each platform.
- Use feature detection and manual fallback rather than treating an unavailable speech API as a game failure.

## UI and art direction
- Polished fantasy adventure with 6 recognizable world themes, world map, progress rings, quest cards, reward animations, animated but lightweight backgrounds, celebratory boss screens and user-selectable reduced motion.
- Do not make it look like a school worksheet. Visually age-appropriate for a 12-year-old: slightly sophisticated, joyful, quest-driven, clear goals and a sense of exploration.
- Design primarily for Android tablet landscape and portrait, with responsive layouts for Mac and Windows laptop screens and optional phone use. Ensure buttons and microphone controls are touch-friendly.
- No copyrighted franchise art. Use original CSS/SVG artwork or freely licensed assets whose licenses are verified and documented. Optional sound effects muted by default.

## GitHub Pages, PWA, documentation
- Include GH Actions workflow for build/test/deploy, configurable Vite `base` for project-name Pages URLs, `manifest.webmanifest`, icons, offline caching and a clear README for local/Pages installation.
- Provide `.gitignore`, lint config, unit tests (Vitest), integration or browser tests (Playwright if feasible) and sample fixture based on actual supplied entries. Ensure no secrets and no paid services.
- App must build cleanly, deploy in production base path, persist after refresh, support import/export and still work without internet once assets are cached. Document local HTTPS/localhost mic permission rules.

## Milestones and acceptance criteria
1. **Working vertical slice**: a real homepage, map, one 10-word quest, usable browser TTS, typed answer checking, real XP/progress persistence, feedback, and production build. Use actual list. No placeholder-only UI.
2. **Full progression**: six worlds, all 250 words covered, Word Vault, reviews, dashboard, tests and polished graphics.
3. **Spoken spelling**: browser capability detection, speech-input prototype, letter-sequence confirmation, manual fallback and an honestly documented offline-model feasibility assessment for Android tablets and macOS/Windows laptops.
4. **Championship and shipping**: mixed boss fights, final tournament, PWA QA and GitHub Pages CI/CD.

Before considering any milestone done, run relevant test/build checks and give a concise summary of what works, what is unverified on actual Android tablets, Mac, and Windows laptops, and how to run it. Start implementing milestone 1 now rather than replying only with a plan. Do not ask for the word list again; it is included.
