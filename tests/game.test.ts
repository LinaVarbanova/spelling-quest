import { describe, it, expect } from "vitest";
import {
  words,
  learningWords,
  wordComplexity,
  worldForWord,
  hasRelic,
  quests,
  worlds,
  freshProgress,
  recordAnswer,
  completeQuest,
  isUnlocked,
  parseBackup,
  reviewWords,
} from "../src/game";
import { parseLetters } from "../src/speech";
import "fake-indexeddb/auto";
import { progressStore } from "../src/storage";
describe("official curriculum", () => {
  it("preserves 250 unique contiguous official entries in exactly one primary quest", () => {
    expect(words).toHaveLength(250);
    expect(new Set(words.map((w) => w.word)).size).toBe(250);
    expect(words.map((w) => w.id)).toEqual(
      Array.from({ length: 250 }, (_, i) => i + 1),
    );
    expect(quests.flatMap((q) => q.words)).toEqual(learningWords);
    expect(
      [...quests.flatMap((q) => q.words)].sort((a, b) => a.id - b.id),
    ).toEqual(words);
    expect(worlds).toHaveLength(6);
    expect(quests).toHaveLength(25);
    expect(quests.filter((q) => q.boss)).toHaveLength(6);
    for (const w of words)
      for (const key of ["word", "translation_bg", "example_en"] as const)
        expect(w[key].trim().length).toBeGreaterThan(0);
  });
});
describe("scoring and mastery", () => {
  it("normalizes case and whitespace but does not accept approximate spelling", () => {
    const p = freshProgress();
    expect(recordAnswer(p, 1, " ACCIDENT ").correct).toBe(true);
    expect(recordAnswer(p, 1, "accidant").earned).toBe(0);
    expect(recordAnswer(p, 1, "accident", 1, true).earned).toBe(10);
  });
  it("requires spaced successful sessions and resets on a mistake", () => {
    let p = freshProgress();
    for (const time of [1000, 2000])
      p = recordAnswer(p, 1, "accident", time).progress;
    expect(p.records[1].streak).toBe(1);
    expect(p.records[1].mastered).toBe(false);
    for (const time of [86403000, 172804000])
      p = recordAnswer(p, 1, "accident", time, false, "spoken").progress;
    expect(p.records[1].mastered).toBe(true);
    expect(p.records[1].history.at(-1)?.mode).toBe("spoken");
    p = recordAnswer(p, 1, "wrong", 172805000).progress;
    expect(p.records[1].streak).toBe(0);
    expect(p.records[1].nextReview).toBe(172805000);
  });
  it("supports a configurable schedule and ranks mistakes first", () => {
    let p = recordAnswer(freshProgress(), 2, "wrong", 100).progress;
    p = recordAnswer(p, 1, "accident", 200, false, "typed", [2, 4]).progress;
    expect(p.records[1].nextReview).toBe(200 + 2 * 86400000);
    expect(reviewWords(p, 300)[0].id).toBe(2);
  });
});
describe("progression and storage", () => {
  it("unlocks ordered quests and grants treasure once", () => {
    const p = freshProgress();
    expect(isUnlocked(p, quests[1])).toBe(false);
    const done = completeQuest(p, quests[0].id);
    expect(isUnlocked(done, quests[1])).toBe(true);
    expect(done.xp).toBe(50);
    expect(completeQuest(done, quests[0].id)).toEqual(done);
  });
  it("round trips versioned IndexedDB state and rejects corrupt imports", async () => {
    const p = completeQuest(
      recordAnswer(freshProgress(), 250, words[249].word, 1000, false, "spoken")
        .progress,
      quests[0].id,
    );
    expect(parseBackup(JSON.stringify(p))).toEqual(p);
    await progressStore.save(p);
    expect(await progressStore.load()).toEqual(p);
    expect(() => parseBackup('{"version":2}')).toThrow();
    expect(() => parseBackup(JSON.stringify({ ...p, xp: -2 }))).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...p, records: { 251: p.records[250] } })),
    ).toThrow();
  });
});
describe("letter recognition fairness", () => {
  it("parses names and phonetic markers without guessing whole words", () => {
    expect(
      parseLetters("ay bee see double you zed", 0.9).letters.join(""),
    ).toBe("abcwz");
    expect(parseLetters("B as in bravo E E", 0.9).letters.join("")).toBe("bee");
    expect(parseLetters("accident", 0.9).ambiguous).toBe(true);
    expect(parseLetters("bee pee", 0.2).ambiguous).toBe(true);
  });
});

describe("complexity progression", () => {
  it("increases deterministically without mutating the authoritative order", () => {
    const scores = learningWords.map((w) => wordComplexity(w.word).score);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
    expect(learningWords[0].word).not.toBe(words[0].word);
    expect(words[0].word).toBe("accident");
    for (let i = 1; i < worlds.length; i++) {
      const previous = quests
          .filter((q) => q.world === i - 1)
          .flatMap((q) => q.words),
        current = quests.filter((q) => q.world === i).flatMap((q) => q.words);
      expect(wordComplexity(previous.at(-1)!.word).score).toBeLessThanOrEqual(
        wordComplexity(current[0].word).score,
      );
    }
  });
  it("ranks short irregular spellings above longer predictable words", () => {
    expect(wordComplexity("rhythm").score).toBeGreaterThan(
      wordComplexity("animal").score,
    );
    expect(wordComplexity("cough").score).toBeGreaterThan(
      wordComplexity("potato").score,
    );
    expect(wordComplexity("cupboard").reasons).toContain(
      "Silent p and less predictable letter sequence",
    );
  });
  it("locates worlds by difficulty assignment rather than original official IDs", () => {
    for (const q of quests)
      for (const w of q.words) expect(worldForWord(w.id)).toBe(q.world);
    expect(worldForWord(1)).not.toBe(0);
  });
  it("migrates legacy quests without losing XP, word history, days, or earned relics", () => {
    const p = recordAnswer(freshProgress(), 1, "accident", 1000).progress;
    const old = {
      ...p,
      curriculumVersion: undefined,
      xp: 500,
      completedQuests: ["0-0", "0-1", "0-2", "0-3", "0-4"],
    };
    const migrated = parseBackup(JSON.stringify(old));
    expect(migrated.curriculumVersion).toBe(2);
    expect(migrated.xp).toBe(500);
    expect(migrated.records).toEqual(p.records);
    expect(migrated.activeDays).toEqual(p.activeDays);
    expect(migrated.claimedDays).toEqual(p.claimedDays);
    expect(migrated.legacyCompletedQuests).toEqual(old.completedQuests);
    expect(migrated.completedQuests).toEqual([]);
    expect(hasRelic(migrated, 0)).toBe(true);
    expect(completeQuest(migrated, "0-0").xp).toBe(500);
    expect(parseBackup(JSON.stringify(migrated))).toEqual(migrated);
  });
  it("keeps all completions when the old curriculum was finished and rejects unknown curriculum versions", () => {
    const p = {
      ...freshProgress(),
      curriculumVersion: undefined,
      completedQuests: quests.map((q) => q.id),
    };
    expect(parseBackup(JSON.stringify(p)).completedQuests).toEqual(
      quests.map((q) => q.id),
    );
    expect(() =>
      parseBackup(
        JSON.stringify({ ...freshProgress(), curriculumVersion: 99 }),
      ),
    ).toThrow();
  });
});
