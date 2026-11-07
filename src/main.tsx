import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import {
  completeQuest,
  compareComplexity,
  learningWords,
  difficultyBands,
  worldForWord,
  wordComplexity,
  hasRelic,
  freshProgress,
  isUnlocked,
  parseBackup,
  practiceStreak,
  quests,
  recordAnswer,
  reviewWords,
  words,
  worlds,
  type Mode,
  type Progress,
  type Quest,
} from "./game";
import { progressStore } from "./storage";
import {
  BrowserSpellingRecognizer,
  speaker,
  type SpeechSettings,
  type Candidate,
} from "./speech";
import { Crest, TreasureChest, WorldArt } from "./Art";
import "./style.css";
import "./playground.css";
import "./quest-scene.css";
const QuestScene = lazy(() => import("./QuestScene"));
const IslandPlayground = lazy(() => import("./IslandPlayground"));
const recognizer = new BrowserSpellingRecognizer();
const today = () => new Date().toLocaleDateString("en-CA");
function App() {
  const [progress, setProgress] = useState<Progress>(freshProgress),
    [ready, setReady] = useState(false),
    [page, setPage] = useState("map"),
    [sceneRun, setSceneRun] = useState(0),
    [world, setWorld] = useState(0),
    [active, setActive] = useState<Quest>(quests[0]),
    [round, setRound] = useState(0),
    [answer, setAnswer] = useState(""),
    [result, setResult] = useState<{ correct: boolean; earned: number } | null>(
      null,
    ),
    [lives, setLives] = useState(3),
    [score, setScore] = useState(0),
    [notice, setNotice] = useState(""),
    [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [settings, setSettings] = useState<SpeechSettings>({
      locale: "en-GB",
      voice: "",
      rate: 0.85,
    }),
    [update, setUpdate] = useState<null | (() => void)>(null),
    [saving, setSaving] = useState(false),
    [hint, setHint] = useState(false),
    [translation, setTranslation] = useState(false),
    [mode, setMode] = useState<Mode>("typed"),
    [listening, setListening] = useState(false),
    [finishing, setFinishing] = useState(false),
    [candidate, setCandidate] = useState<Candidate | null>(null),
    [micError, setMicError] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [vaultSort, setVaultSort] = useState("complexity"),
    [reduced, setReduced] = useState(false),
    [sounds, setSounds] = useState(false),
    [countdown, setCountdown] = useState(90),
    [timed, setTimed] = useState(false);
  const busy = useRef(false);
  const win = worlds[active.world];
  const word = active.words[round];
  const cap = recognizer.capability();
  useEffect(() => {
    progressStore
      .load()
      .then(setProgress)
      .catch(() =>
        setNotice(
          "Storage unavailable. Progress lasts for this visit; export a backup before leaving.",
        ),
      )
      .finally(() => setReady(true));
    if (speaker.available()) {
      const load = () =>
        setVoices(
          speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en")),
        );
      load();
      speechSynthesis.addEventListener("voiceschanged", load);
      return () => {
        speechSynthesis.removeEventListener("voiceschanged", load);
        recognizer.stop();
        speaker.stop();
      };
    }
  }, []);
  useEffect(() => {
    const apply = registerSW({
      onNeedRefresh() {
        setUpdate(() => () => void apply(true));
      },
      onOfflineReady() {
        setNotice(
          (current) =>
            current || "Adventure downloaded. You can now reopen it offline.",
        );
      },
    });
  }, []);
  useEffect(() => {
    if (page !== "quest" || !timed || result || active.world !== 5) return;
    const timer = setInterval(
      () => setCountdown((t) => Math.max(0, t - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [page, timed, result, active.world, round]);
  useEffect(() => {
    if (
      page === "quest" &&
      timed &&
      active.world === 5 &&
      countdown === 0 &&
      !result
    ) {
      recognizer.stop();
      speaker.stop();
      setListening(false);
      setPage("reward");
    }
  }, [countdown, page, timed, active.world, result]);
  async function save(p: Progress) {
    setProgress(p);
    setSaving(true);
    try {
      await progressStore.save(p);
      return true;
    } catch {
      setNotice(
        "Could not save on this device. Export a backup to keep your progress.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }
  function stop() {
    recognizer.stop();
    speaker.stop();
    setListening(false);
    setFinishing(false);
  }
  function go(p: string) {
    stop();
    setPage(p);
  }
  function resetRound() {
    setAnswer("");
    setResult(null);
    setHint(false);
    setTranslation(false);
    setCandidate(null);
    setMicError("");
    setCountdown(90);
  }
  function start(q: Quest) {
    setSceneRun((r) => r + 1);
    stop();
    setActive(q);
    setWorld(q.world);
    setRound(0);
    setLives(q.world >= 4 ? 2 : 3);
    setScore(0);
    resetRound();
    setPage("quest");
  }
  function speak(text: string, slow = false) {
    recognizer.stop();
    setListening(false);
    setFinishing(false);
    speaker.speak(
      text,
      { ...settings, rate: slow ? 0.65 : settings.rate },
      () =>
        setNotice(
          "Audio unavailable. Check your installed English system voices or choose another voice in settings.",
        ),
    );
  }
  function chime() {
    if (!sounds) return;
    try {
      const a = new AudioContext(),
        o = a.createOscillator(),
        g = a.createGain();
      o.connect(g);
      g.connect(a.destination);
      o.frequency.value = 660;
      g.gain.setValueAtTime(0.04, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.25);
      o.start();
      o.stop(a.currentTime + 0.25);
      o.onended = () => void a.close();
    } catch {
      /* Optional effect only. */
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !answer.trim() ||
      result ||
      busy.current ||
      (mode === "spoken" && (!candidate || listening))
    )
      return;
    busy.current = true;
    stop();
    const r = recordAnswer(progress, word.id, answer, Date.now(), hint, mode);
    setResult(r);
    setScore((s) => s + (r.correct ? 1 : 0));
    if (!r.correct) setLives((l) => l - 1);
    else chime();
    await save(r.progress);
    busy.current = false;
  }
  async function next() {
    if (busy.current) return;
    stop();
    if (active.boss && !result?.correct && lives > 0) {
      resetRound();
      return;
    }
    if (round === active.words.length - 1 || lives === 0) {
      if (lives > 0) {
        let p = completeQuest(progress, active.id);
        if (active.id === "daily" && !p.claimedDays.includes(today()))
          p = { ...p, xp: p.xp + 25, claimedDays: [...p.claimedDays, today()] };
        await save(p);
        chime();
      }
      setPage("reward");
    } else {
      setRound((r) => r + 1);
      resetRound();
    }
  }
  function mic() {
    speaker.stop();
    setCandidate(null);
    setAnswer("");
    setMicError("");
    setFinishing(false);
    setListening(true);
    recognizer.start(
      false,
      settings.locale,
      (c) => {
        setCandidate(c);
        setAnswer(c.letters.join(""));
      },
      (m) => {
        setMicError(m);
        setListening(false);
      },
      () => {
        setListening(false);
        setFinishing(false);
      },
    );
  }
  function exportBackup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(progress, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "spelling-quest-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const records = Object.values(progress.records),
    attempts = records.reduce((n, r) => n + r.attempts, 0),
    correct = records.reduce((n, r) => n + r.correct, 0),
    mastered = records.filter((r) => r.mastered).length;
  const nextQuest =
    quests.find(
      (q) =>
        !progress.completedQuests.includes(q.id) && isUnlocked(progress, q),
    ) || quests[0];
  const due = records.filter((r) => r.nextReview <= Date.now()).length;
  function review(kind: "daily" | "weekly" | "review" = "review") {
    const pool = reviewWords(progress);
    const list = [
      ...pool,
      ...learningWords.filter((w) => !pool.some((p) => p.id === w.id)),
    ].slice(0, 10);
    start({ id: kind, world: 0, index: 0, boss: false, words: list });
  }
  const failed =
    lives === 0 || (timed && active.world === 5 && countdown === 0 && !result);
  const questTitle = active.boss
    ? win.boss
    : active.id === "daily"
      ? "The Lantern Keeper"
      : active.id === "weekly"
        ? "Weekly review challenge"
        : active.id === "review"
          ? "Memory trail"
          : `Trail ${active.index + 1}`;
  const questObjective = active.boss
    ? "Break the guardian’s shield. No hints. Each correct word weakens it."
    : win.objective;
  const questBanner = (
    <div className="battle-art">
      <WorldArt world={active.world} boss={active.boss} />
      <div>
        <p className="eyebrow">{win.name}</p>
        <h2>
          {active.boss
            ? win.boss
            : active.id === "daily"
              ? "The Lantern Keeper"
              : active.id === "weekly"
                ? "Weekly review challenge"
                : active.id === "review"
                  ? "Memory trail"
                  : `Trail ${active.index + 1}`}
        </h2>
        <p>
          {active.boss
            ? "Break the guardian’s shield. No hints. Each correct word weakens it."
            : win.objective}
        </p>
      </div>
    </div>
  );
  return (
    <>
      <header>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("map");
          }}
        >
          <Crest />
          <span>
            Spelling Quest<small>THE SPELLKEEPER’S JOURNEY</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {[
            ["map", "Adventure"],
            ["vault", "Word Vault"],
            ["profile", "Adventurer"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={page === id ? "selected" : ""}
              onClick={() => go(id)}
            >
              {label}
            </button>
          ))}
          <button aria-label="Audio settings" onClick={() => go("settings")}>
            Settings
          </button>
        </nav>
      </header>
      <main>
        <div className="topline">
          <span>JUNIOR SPELLING BEE · 2027</span>
          <span className="xp">
            ✦ {progress.xp} XP{" "}
            <span>· Level {Math.floor(progress.xp / 250) + 1}</span>
          </span>
        </div>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}
        {update && (
          <div className="notice">
            A new adventure update is ready. Finish your round first.{" "}
            <button onClick={update}>Update app</button>
          </div>
        )}
        {page === "map" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">YOUR ADVENTURE AWAITS</p>
                <h1>
                  Small words.
                  <br />
                  Extraordinary worlds.
                </h1>
                <p>
                  Six realms have lost their magic.
                  <br />
                  Your words have the power to bring it back.
                </p>
                <button
                  className="primary"
                  disabled={!ready}
                  onClick={() => start(nextQuest)}
                >
                  Continue your journey <span>→</span>
                </button>
                <div className="hero-meta">
                  10 words per quest <span>About 10 minutes</span>
                </div>
              </div>
              <div className="hero-playground">
                <Suspense
                  fallback={
                    <div className="playground-loading">
                      <WorldArt world={world} />
                      <p>Opening your world…</p>
                    </div>
                  }
                >
                  <IslandPlayground
                    world={world}
                    reduced={reduced}
                    onSelect={setWorld}
                  />
                </Suspense>
              </div>
            </section>
            <section className="daily">
              <TreasureChest />
              <div>
                <span className="eyebrow">THE LANTERN KEEPER’S REQUEST</span>
                <h3>
                  {progress.claimedDays.includes(today())
                    ? "Today’s treasure is yours."
                    : "Light ten lanterns today."}
                </h3>
                <p>
                  A short review journey · +25 XP treasure · no streak penalties
                </p>
              </div>
              <button disabled={!ready} onClick={() => review("daily")}>
                {progress.claimedDays.includes(today())
                  ? "Practise again"
                  : "Daily quest"}{" "}
                →
              </button>
            </section>
            <section className="world-section">
              <div className="section-title">
                <div>
                  <p className="eyebrow">SIX WORLDS. ONE EPIC JOURNEY.</p>
                  <h2>Choose your next chapter</h2>
                </div>
                <span className="pill">
                  {progress.completedQuests.length} / 25 quests restored
                </span>
              </div>
              <p className="small">
                Follow the difficulty path: simpler spellings first, trickier
                patterns later. These are game-derived levels, not official
                competition rankings.
              </p>
              <div className="world-grid">
                {worlds.map((w, i) => {
                  const qs = quests.filter((q) => q.world === i),
                    done = qs.filter((q) =>
                      progress.completedQuests.includes(q.id),
                    ).length;
                  return (
                    <article
                      key={w.name}
                      className={
                        "world " +
                        (world === i ? "active " : "") +
                        (done === qs.length ? "restored-world" : "")
                      }
                      style={{ "--world": w.color } as React.CSSProperties}
                    >
                      <button
                        className="world-art"
                        aria-label={`Explore ${w.name}`}
                        onClick={() => {
                          setWorld(i);
                          document
                            .getElementById("world-quests")
                            ?.scrollIntoView({
                              behavior: reduced ? "instant" : "smooth",
                              block: "center",
                            });
                        }}
                      >
                        <WorldArt world={i} thumbnail />
                        <b>{String(i + 1).padStart(2, "0")}</b>
                        {
                          <span className="restored">
                            {done === qs.length
                              ? "RESTORED"
                              : isUnlocked(progress, qs[0])
                                ? "PATH OPEN"
                                : "PATH SEALED"}
                          </span>
                        }
                      </button>
                      <div className="world-content">
                        <span className="chapter">
                          CHAPTER {String(i + 1).padStart(2, "0")} · {done}/
                          {qs.length} QUESTS
                        </span>
                        <h3>{w.name}</h3>
                        <p>{w.objective}</p>
                        <div className="world-bottom">
                          <span>
                            {w.rankRange[1] - w.rankRange[0] + 1} words ·{" "}
                            {difficultyBands[i]}
                          </span>
                          <button
                            aria-label={`Show ${w.name} quests`}
                            onClick={() => {
                              setWorld(i);
                              document
                                .getElementById("world-quests")
                                ?.scrollIntoView({
                                  behavior: reduced ? "instant" : "smooth",
                                  block: "center",
                                });
                            }}
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div
                className="quest-path panel"
                id="world-quests"
                style={
                  { "--world": worlds[world].color } as React.CSSProperties
                }
              >
                <p className="eyebrow">
                  {difficultyBands[world]} · {worlds[world].mechanic}
                </p>
                <h2>{worlds[world].name}</h2>
                <p>{worlds[world].objective}</p>
                <div className="nodes">
                  {quests
                    .filter((q) => q.world === world)
                    .map((q) => {
                      const unlocked = isUnlocked(progress, q),
                        done = progress.completedQuests.includes(q.id);
                      return (
                        <div className="node" key={q.id}>
                          <button
                            disabled={!ready || !unlocked}
                            className={done ? "done" : ""}
                            onClick={() => start(q)}
                            aria-label={`${q.boss ? "Boss battle" : "Quest"} ${q.index + 1}${!unlocked ? " locked" : ""}`}
                          >
                            {done ? "✓" : q.boss ? <Crest /> : q.index + 1}
                          </button>
                          <strong>
                            {q.boss
                              ? "Guardian battle"
                              : `Trail ${q.index + 1}`}
                          </strong>
                          <span>
                            {unlocked
                              ? q.boss
                                ? worlds[world].boss
                                : "10-word adventure"
                              : "Complete the previous quest"}
                          </span>
                        </div>
                      );
                    })}
                </div>
                <p className="small">
                  Paths open in order. All 250 words are also available for
                  practice in the Word Vault.
                </p>
              </div>
            </section>
            <footer>
              <span>A little practice. A lasting superpower.</span>
              <span>250 official words · No ads · Your own pace</span>
            </footer>
          </>
        )}
        {page === "quest" && (
          <section
            className={"play panel " + (active.boss ? "boss" : "")}
            style={{ "--world": win.color } as React.CSSProperties}
          >
            <Suspense fallback={questBanner}>
              <QuestScene
                key={sceneRun}
                world={active.world}
                boss={active.boss}
                wordCount={active.words.length}
                seed={active.id}
                reduced={reduced}
                title={questTitle}
                objective={questObjective}
                fallback={questBanner}
                answer={answer}
                resolution={
                  result
                    ? {
                        id: `${word.id}:${progress.records[word.id]?.attempts || 0}`,
                        correct: result.correct,
                        word: word.word,
                        retrySameGap: active.boss && !result.correct,
                        last:
                          round === active.words.length - 1 &&
                          lives > 0 &&
                          (!active.boss || result.correct),
                      }
                    : null
                }
              />
            </Suspense>
            <div className="quest-top">
              <span>
                {active.boss
                  ? `GUARDIAN SHIELD · ${active.words.length - score} / ${active.words.length}`
                  : `${score} SPELLS CAST`}
              </span>
              <span aria-label={`${lives} lives remaining`}>
                {Array.from({ length: active.world >= 4 ? 2 : 3 }, (_, i) => (
                  <i key={i} className={"life " + (i < lives ? "full" : "")} />
                ))}
              </span>
            </div>
            <progress
              aria-label={
                active.boss ? "Guardian shield broken" : "Quest progress"
              }
              value={active.boss ? score : round}
              max={active.words.length}
            />
            <div className="round-body">
              <p className="eyebrow">
                WORD {round + 1} OF {active.words.length}
                {active.world === 5 && timed
                  ? ` · ${countdown}s remaining`
                  : ""}
              </p>
              <h1>
                {result
                  ? result.correct
                    ? "A spell well cast!"
                    : "Every attempt helps you grow."
                  : "Listen. Then cast your spell."}
              </h1>
              <p>
                {result
                  ? "Read the word and remember its shape."
                  : "Play the audio, then spell the word you hear."}
              </p>
              <div className="mode-tabs" aria-label="Spelling mode">
                <button
                  className={mode === "typed" ? "selected" : ""}
                  disabled={!!result}
                  onClick={() => {
                    stop();
                    setMode("typed");
                    setAnswer("");
                    setCandidate(null);
                  }}
                >
                  Listen & Type
                </button>
                <button
                  className={mode === "spoken" ? "selected" : ""}
                  disabled={!!result}
                  onClick={() => {
                    stop();
                    setMode("spoken");
                    setAnswer("");
                    setCandidate(null);
                  }}
                >
                  Listen & Spell Aloud
                </button>
              </div>
              {!result && (
                <>
                  <div className="audio-controls">
                    <button
                      className="listen"
                      disabled={listening}
                      onClick={() => speak(word.word)}
                    >
                      ◉ Hear the word
                    </button>
                    {active.world === 2 && (
                      <button
                        disabled={listening}
                        onClick={() => speak(word.word, true)}
                      >
                        Slow replay
                      </button>
                    )}
                    {!active.boss && active.world < 3 && (
                      <>
                        <button
                          disabled={listening}
                          onClick={() => {
                            setHint(true);
                            speak(word.example_en);
                          }}
                        >
                          Sentence hint
                        </button>
                        <button
                          onClick={() => {
                            setHint(true);
                            setTranslation(true);
                          }}
                        >
                          Translation hint
                        </button>
                      </>
                    )}
                  </div>
                  {translation && <p className="hint">{word.translation_bg}</p>}
                  {active.world === 1 && !active.boss && (
                    <p className="hint">
                      Pattern clue: {word.word.length} letters · game-derived,
                      not an official difficulty ranking
                    </p>
                  )}
                  {!speaker.available() && (
                    <p role="alert">
                      No text-to-speech in this browser. Choose a browser with
                      an English system voice for this listening quest.
                    </p>
                  )}
                </>
              )}
              {mode === "spoken" && !result && (
                <section className="microphone" aria-label="Spoken spelling">
                  <p>
                    Say individual letters with a small pause: “A … B … C”. “B
                    as in bravo” is also supported. Take your time; pauses are
                    fine. Press Stop recording when you have finished all the
                    letters.
                  </p>
                  <p className="small">
                    Browser speech service · microphone audio may be processed
                    online by your browser provider. Spelling Quest does not
                    store recordings.
                  </p>
                  {!cap.supported && <p role="status">{cap.reason}</p>}
                  <div className="audio-controls">
                    <button
                      className="mic-button"
                      disabled={
                        !cap.supported || saving || listening || finishing
                      }
                      onClick={mic}
                    >
                      Start recording
                    </button>
                    <button
                      className={"mic-button " + (listening ? "recording" : "")}
                      disabled={!listening || finishing}
                      onClick={() => {
                        setFinishing(true);
                        recognizer.finish();
                      }}
                    >
                      Stop recording
                    </button>
                    <button
                      onClick={() => {
                        stop();
                        setCandidate(null);
                        setAnswer("");
                      }}
                    >
                      Cancel recording
                    </button>
                  </div>
                  <p className="small" role="status">
                    {finishing
                      ? "Finishing recording… waiting for the final letters."
                      : listening
                        ? "Recording letters… take your time. Complete letters appear when the browser finishes a phrase. Press Stop recording when you finish."
                        : candidate
                          ? "Transcription ready. Check every letter before scoring."
                          : "Microphone off. Nothing is scored until you confirm."}
                  </p>
                  {micError && (
                    <p className="error" role="alert">
                      {micError}
                    </p>
                  )}
                  {candidate && (
                    <div className="candidate">
                      <p>Heard: “{candidate.transcript}”</p>
                      <div className="letters" aria-label="Detected letters">
                        {answer.split("").map((l, i) => (
                          <span key={i}>{l.toUpperCase()}</span>
                        ))}
                      </div>
                      <p>
                        {candidate.revisionDetected
                          ? "The browser revised overlapping results. We kept the latest revision. Please check every letter, including doubled letters."
                          : candidate.ambiguous
                            ? "Recognition is uncertain. Correct any missing or mistaken letters."
                            : "Check the letters. Recognition can confuse B/P or M/N."}
                      </p>
                    </div>
                  )}
                </section>
              )}
              <form onSubmit={submit}>
                <label htmlFor="spelling">
                  {mode === "spoken"
                    ? "Confirm or correct recognized letters"
                    : "Your spelling"}
                </label>
                <input
                  id="spelling"
                  key={`${active.id}-${round}`}
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                  }}
                  disabled={
                    !!result ||
                    (mode === "spoken" &&
                      (!candidate || listening || finishing))
                  }
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={
                    mode === "spoken"
                      ? "Record your letters first…"
                      : "Type what you hear…"
                  }
                />
                {!result && (
                  <button
                    className="primary"
                    disabled={
                      !answer.trim() ||
                      saving ||
                      listening ||
                      finishing ||
                      (mode === "spoken" && !candidate)
                    }
                  >
                    {mode === "spoken"
                      ? "Confirm letters & cast spell →"
                      : "Cast spell →"}
                  </button>
                )}
              </form>
              {result && (
                <div
                  className={"feedback " + (result.correct ? "good" : "retry")}
                  role="status"
                >
                  <strong>{word.word}</strong>
                  <p>
                    {word.translation_bg} · {word.example_en}
                  </p>
                  <p>
                    {result.correct
                      ? `+${result.earned} XP · ${active.boss ? "The guardian’s shield weakens." : "The path grows brighter."}`
                      : "A life used. No XP lost. This word will return in review."}
                  </p>
                  <button
                    className="primary"
                    disabled={saving}
                    onClick={() => void next()}
                  >
                    {round === active.words.length - 1 || lives === 0
                      ? "See your journey"
                      : "Next word →"}
                  </button>
                </div>
              )}
              <p className="small">
                A spelling error costs one life. Recognition errors can be
                edited freely before you cast.
              </p>
            </div>
          </section>
        )}
        {page === "reward" && (
          <section
            className={"panel reward " + (failed ? "defeat" : "victory")}
          >
            <WorldArt world={active.world} boss={active.boss} />
            {!failed && <TreasureChest />}
            <p className="eyebrow">
              {failed
                ? "THE TRAIL WILL WAIT"
                : active.boss
                  ? "GUARDIAN DEFEATED"
                  : "QUEST COMPLETE"}
            </p>
            <h1>
              {failed
                ? "Rest. Return. Rise again."
                : active.boss
                  ? `${win.name} is restored.`
                  : "Another path shines brighter."}
            </h1>
            <p>
              {score} correct out of {round + (result ? 1 : 0)} attempted ·{" "}
              {progress.xp} total XP
            </p>
            <p>
              {failed
                ? "Your practice is saved. Try the quest again when you’re ready."
                : active.boss
                  ? `Treasure unlocked: ${win.relic}. Your next world awaits.`
                  : "The next path is open. First completion awards a 50 XP treasure."}
            </p>
            <button className="primary" onClick={() => start(active)}>
              Play again →
            </button>{" "}
            <button onClick={() => go("map")}>Adventure map</button>
            <p className="small">
              A good moment for a break. Short adventures build lasting skills.
            </p>
          </section>
        )}
        {page === "vault" && (
          <section className="panel">
            <p className="eyebrow">250 WORDS. A WORLD OF POSSIBILITY.</p>
            <h1>The Word Vault</h1>
            <p>
              Official spellings, Bulgarian translations and sentences,
              preserved exactly. Practice any word without unlocking its world.
              Difficulty sorting uses a game-derived estimate of spelling
              patterns, not an official ranking.
            </p>
            <div className="vault-tools">
              <input
                aria-label="Search official words"
                value={search}
                placeholder="Find a word or translation…"
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Filter words"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All 250 words</option>
                <option value="weak">Difficult words</option>
                <option value="due">Due for review</option>
                <option value="mastered">Mastered</option>
              </select>
              <select
                aria-label="Word ordering"
                value={vaultSort}
                onChange={(e) => setVaultSort(e.target.value)}
              >
                <option value="complexity">Difficulty: easier first</option>
                <option value="alphabetical">Alphabetical</option>
                <option value="official">Official list order</option>
              </select>
              <button onClick={() => review()}>Review trail · {due} due</button>
              <button onClick={() => review("weekly")}>
                Weekly review challenge
              </button>
            </div>
            <div className="vault-grid">
              {[...words]
                .sort(
                  vaultSort === "complexity"
                    ? compareComplexity
                    : vaultSort === "alphabetical"
                      ? (a, b) => a.word.localeCompare(b.word, "en")
                      : (a, b) => a.id - b.id,
                )
                .filter((w) => {
                  const r = progress.records[w.id];
                  return (
                    (w.word + " " + w.translation_bg)
                      .toLowerCase()
                      .includes(search.toLowerCase()) &&
                    (filter === "all" ||
                      (filter === "weak" && r && r.correct < r.attempts) ||
                      (filter === "due" && r && r.nextReview <= Date.now()) ||
                      (filter === "mastered" && r?.mastered))
                  );
                })
                .map((w) => (
                  <article className="word-card" key={w.id}>
                    <span className="chapter">
                      #{String(w.id).padStart(3, "0")} ·{" "}
                      {worlds[worldForWord(w.id)].name}
                    </span>
                    <h3>{w.word}</h3>
                    <p
                      className="difficulty-tag"
                      title={wordComplexity(w.word).reasons.join(" · ")}
                    >
                      {difficultyBands[worldForWord(w.id)]}
                    </p>
                    <p className="small">
                      {wordComplexity(w.word).reasons.join(" · ")}
                    </p>
                    <p>{w.translation_bg}</p>
                    <p className="example">{w.example_en}</p>
                    <progress
                      aria-label={`${w.word} mastery`}
                      value={Math.min(progress.records[w.id]?.streak || 0, 3)}
                      max="3"
                    />
                    <span className="small">
                      {progress.records[w.id]?.mastered
                        ? "Mastered"
                        : `${Math.min(progress.records[w.id]?.streak || 0, 3)} / 3 successful spaced sessions`}
                    </span>
                    <div>
                      <button
                        aria-label={`Hear ${w.word}`}
                        onClick={() => speak(w.word)}
                      >
                        Hear
                      </button>{" "}
                      <button
                        onClick={() => {
                          const wi = worldForWord(w.id);
                          start({
                            id: "practice",
                            world: wi,
                            index: 0,
                            boss: false,
                            words: [w],
                          });
                        }}
                      >
                        Practise
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}
        {page === "profile" && (
          <section className="panel">
            <p className="eyebrow">YOUR JOURNEY, AT A GLANCE</p>
            <h1>Adventurer’s journal</h1>
            <div className="stats">
              <div>
                <strong>{progress.xp}</strong>XP earned
              </div>
              <div>
                <strong>
                  {attempts ? Math.round((correct / attempts) * 100) : 0}%
                </strong>
                Overall accuracy
              </div>
              <div>
                <strong>{mastered}</strong>Words mastered
              </div>
              <div>
                <strong>{due}</strong>Due for review
              </div>
            </div>
            <p>
              {practiceStreak(progress.activeDays)} day practice streak ·{" "}
              {progress.activeDays.length} days explored ·{" "}
              {progress.completedQuests.length}/25 quests complete ·{" "}
              {Object.keys(progress.records).length}/250 words attempted
            </p>
            <p>
              Mastery takes three successful sessions at least 24 hours apart.
              Hints lower first-answer XP. Replays award 5 XP; quest treasure is
              awarded once.
            </p>
            <div className="stats">
              {(["typed", "spoken"] as Mode[]).map((m) => {
                const h = records
                  .flatMap((r) => r.history)
                  .filter((a) => a.mode === m);
                return (
                  <div key={m}>
                    <strong>
                      {h.length
                        ? Math.round(
                            (h.filter((a) => a.correct).length / h.length) *
                              100,
                          )
                        : 0}
                      %
                    </strong>
                    {m} accuracy · {h.length} attempts
                  </div>
                );
              })}
            </div>
            {!!progress.legacyCompletedQuests?.length && (
              <p className="notice">
                Your {progress.legacyCompletedQuests.length} earlier
                alphabetical quest completions and earned relics are saved.
                Trails now contain different words, so some reopen on the new
                difficulty path. Your XP and word history are unchanged.
              </p>
            )}
            <h2>Your relic collection</h2>
            <div className="relics">
              {worlds.map((w, i) => {
                const won = hasRelic(progress, i);
                return (
                  <div className={won ? "collected" : ""} key={w.name}>
                    <Crest />
                    <strong>{w.relic}</strong>
                    <small>{won ? "Collected" : `Defeat ${w.boss}`}</small>
                  </div>
                );
              })}
            </div>
            <h2>Achievements</h2>
            <div className="achievements">
              {[
                [attempts > 0, "First spell"],
                [
                  progress.completedQuests.length > 0 ||
                    (progress.legacyCompletedQuests || []).length > 0,
                  "Trailblazer",
                ],
                [mastered >= 10, "Memory keeper"],
                [
                  progress.completedQuests.length === 25 ||
                    (progress.legacyCompletedQuests || []).length === 25,
                  "Grand spellkeeper",
                ],
                [progress.claimedDays.length > 0, "Lantern keeper"],
              ].map(([won, title]) => (
                <span className={won ? "earned" : ""} key={String(title)}>
                  {won ? "✓" : "○"} {title}
                </span>
              ))}
            </div>
            <h2>Keep your story safe</h2>
            <button onClick={exportBackup}>↓ Export progress</button>{" "}
            <label className="file-button">
              ↑ Import backup
              <input
                type="file"
                accept="application/json"
                disabled={!ready || saving}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 5000000) throw Error();
                    const p = parseBackup(await file.text());
                    const saved = await save(p);
                    setNotice(
                      saved
                        ? "Backup imported."
                        : "Backup loaded for this visit but could not be saved. Export to keep it.",
                    );
                  } catch {
                    setNotice(
                      "Could not import: choose a valid version 1 Spelling Quest backup.",
                    );
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <p className="small">
              Import replaces this device’s progress. Export first to keep a
              copy. Devices do not sync. IndexedDB stores your progress locally.
            </p>
          </section>
        )}
        {page === "settings" && (
          <section className="panel settings">
            <p className="eyebrow">MAKE YOURSELF AT HOME</p>
            <h1>Audio & comfort</h1>
            <label>
              English accent
              <select
                value={settings.locale}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    locale: e.target.value,
                    voice: "",
                  })
                }
              >
                <option value="en-GB">English (UK)</option>
                <option value="en-US">English (US)</option>
              </select>
            </label>
            <label>
              Installed English voice
              <select
                value={settings.voice}
                onChange={(e) =>
                  setSettings({ ...settings, voice: e.target.value })
                }
              >
                <option value="">Automatic English voice</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} · {v.lang} {v.localService ? "· local" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Speaking speed: {settings.rate.toFixed(2)}
              <input
                type="range"
                min="0.5"
                max="1.2"
                step="0.05"
                value={settings.rate}
                onChange={(e) =>
                  setSettings({ ...settings, rate: Number(e.target.value) })
                }
              />
            </label>
            <button onClick={() => speak("Welcome to Spelling Quest.")}>
              Test voice
            </button>
            <p>
              Offline pronunciation requires an installed local English system
              voice. Browser voices may need internet. Install an English voice
              in your device’s speech settings if needed.
            </p>
            <p>
              Microphone access requires HTTPS or localhost. Spoken spelling
              always uses the browser speech service, which may process audio
              online and require internet. Start the microphone when you are
              ready; your browser handles microphone permission.
            </p>
            <label className="consent">
              <input
                type="checkbox"
                checked={reduced}
                onChange={(e) => {
                  setReduced(e.target.checked);
                  document.documentElement.classList.toggle(
                    "reduced-motion",
                    e.target.checked,
                  );
                }}
              />{" "}
              Disable decorative animation
            </label>
            <label className="consent">
              <input
                type="checkbox"
                checked={sounds}
                onChange={(e) => setSounds(e.target.checked)}
              />{" "}
              Enable success sounds (off by default)
            </label>
            <label className="consent">
              <input
                type="checkbox"
                checked={timed}
                onChange={(e) => setTimed(e.target.checked)}
              />{" "}
              Championship timer · 90 seconds per word
            </label>
            <p className="small">
              No accounts, ads, paid services or app backend. Speech and comfort
              settings apply to this visit. Your game progress is saved
              separately.
            </p>
          </section>
        )}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
