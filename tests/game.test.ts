import { describe, it, expect } from "vitest";
import {
  words,
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
    expect(quests.flatMap((q) => q.words)).toEqual(words);
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
