import curriculum from "../words-2027-junior.json";
export const words = curriculum.entries;
export type Word = (typeof words)[number];
export const worlds = [
  {
    name: "Enchanted Forest",
    objective: "Restore the lanterns along the hidden woodland trail.",
    boss: "The Thorn Guardian",
    relic: "Emerald Leaf",
    mechanic: "Discover · translation & sentence hints",
    color: "#3b7960",
    range: [1, 50],
  },
  {
    name: "Crystal Caves",
    objective: "Recover the crystal shards and open the underground gate.",
    boss: "The Crystal Sentinel",
    relic: "Prism Shard",
    mechanic: "Patterns · letter-count clues",
    color: "#537eab",
    range: [51, 100],
  },
  {
    name: "Whispering Mountains",
    objective: "Light the summit beacons before the mist returns.",
    boss: "The Storm Warden",
    relic: "Sky Feather",
    mechanic: "Listen · slower replay",
    color: "#8076a0",
    range: [101, 150],
  },
  {
    name: "Shadow Castle",
    objective: "Break the silence and return light to the ancient halls.",
    boss: "The Echo Knight",
    relic: "Moon Key",
    mechanic: "Memory · fewer hints",
    color: "#6d657b",
    range: [151, 190],
  },
  {
    name: "Dragon’s Lair",
    objective: "Collect the embers and awaken the sleeping forge.",
    boss: "The Ember Dragon",
    relic: "Dragon Ember",
    mechanic: "Endurance · two lives",
    color: "#b46c4f",
    range: [191, 230],
  },
  {
    name: "Champion’s Kingdom",
    objective: "Restore the crown and earn your place among the spellkeepers.",
    boss: "The Crown Keeper",
    relic: "Spellkeeper Crown",
    mechanic: "Championship · no hints",
    color: "#b79b4a",
    range: [231, 250],
  },
];
export type Quest = {
  id: string;
  world: number;
  index: number;
  boss: boolean;
  words: Word[];
};
export const quests: Quest[] = worlds.flatMap((w, world) =>
  Array.from(
    { length: Math.ceil((w.range[1] - w.range[0] + 1) / 10) },
    (_, index) => ({
      id: `${world}-${index}`,
      world,
      index,
      boss: index === Math.ceil((w.range[1] - w.range[0] + 1) / 10) - 1,
      words: words.slice(
        w.range[0] - 1 + index * 10,
        Math.min(w.range[0] - 1 + (index + 1) * 10, w.range[1]),
      ),
    }),
  ),
);
export type Mode = "typed" | "spoken";
export type Attempt = {
  at: number;
  correct: boolean;
  mode: Mode;
  hint: boolean;
};
export type WordProgress = {
  attempts: number;
  correct: number;
  streak: number;
  lastSeen: number;
  nextReview: number;
  hints: number;
  mastered: boolean;
  history: Attempt[];
};
export type Progress = {
  version: 1;
  xp: number;
  completedQuests: string[];
  records: Record<string, WordProgress>;
  activeDays: string[];
  claimedDays: string[];
};
export const freshProgress = (): Progress => ({
  version: 1,
  xp: 0,
  completedQuests: [],
  records: {},
  activeDays: [],
  claimedDays: [],
});
export const reviewDays = [1, 3, 7, 14, 30];
export function recordAnswer(
  progress: Progress,
  id: number,
  answer: string,
  now = Date.now(),
  hint = false,
  mode: Mode = "typed",
  schedule = reviewDays,
): { progress: Progress; correct: boolean; earned: number } {
  const word = words.find((w) => w.id === id);
  if (!word) throw Error("Unknown word");
  if (!schedule.length || schedule.some((n) => !Number.isFinite(n) || n <= 0))
    throw Error("Invalid review schedule");
  const correct = answer.trim().toLowerCase() === word.word.toLowerCase();
  const old = progress.records[id];
  const streak = correct
    ? old && old.streak > 0 && now - old.lastSeen < 86400000
      ? old.streak
      : (old?.streak || 0) + 1
    : 0;
  const earned = correct ? (old?.correct ? 5 : hint ? 10 : 20) : 0;
  const day = new Date(now).toLocaleDateString("en-CA");
  return {
    correct,
    earned,
    progress: {
      ...progress,
      xp: progress.xp + earned,
      activeDays: [...new Set([...progress.activeDays, day])],
      records: {
        ...progress.records,
        [id]: {
          attempts: (old?.attempts || 0) + 1,
          correct: (old?.correct || 0) + (correct ? 1 : 0),
          streak,
          lastSeen: now,
          nextReview:
            now +
            (correct
              ? schedule[Math.min(Math.max(streak - 1, 0), schedule.length - 1)]
              : 0) *
              86400000,
          hints: (old?.hints || 0) + (hint ? 1 : 0),
          mastered: streak >= 3,
          history: [...(old?.history || []), { at: now, correct, mode, hint }],
        },
      },
    },
  };
}
export function isUnlocked(p: Progress, q: Quest) {
  const i = quests.findIndex((x) => x.id === q.id);
  return i >= 0 && (i === 0 || p.completedQuests.includes(quests[i - 1].id));
}
export function completeQuest(p: Progress, id: string): Progress {
  if (!quests.some((q) => q.id === id) || p.completedQuests.includes(id))
    return p;
  return { ...p, xp: p.xp + 50, completedQuests: [...p.completedQuests, id] };
}
function reviewPriority(r: WordProgress) {
  const misses = r.attempts - r.correct;
  return misses / Math.max(1, r.attempts) + Math.log1p(misses) / 10;
}
export function reviewWords(p: Progress, now = Date.now()) {
  return words
    .filter((w) => p.records[w.id])
    .sort((a, b) => {
      const x = p.records[a.id],
        y = p.records[b.id];
      return (
        Number(y.nextReview <= now) - Number(x.nextReview <= now) ||
        reviewPriority(y) - reviewPriority(x) ||
        x.nextReview - y.nextReview
      );
    })
    .slice(0, 10);
}
export function parseBackup(text: string): Progress {
  const p = JSON.parse(text);
  if (
    p?.version !== 1 ||
    !Number.isSafeInteger(p.xp) ||
    p.xp < 0 ||
    !p.records ||
    typeof p.records !== "object" ||
    Array.isArray(p.records) ||
    !Array.isArray(p.completedQuests) ||
    new Set(p.completedQuests).size !== p.completedQuests.length ||
    p.completedQuests.some((id: unknown) => !quests.some((q) => q.id === id)) ||
    !Array.isArray(p.activeDays) ||
    !Array.isArray(p.claimedDays) ||
    [...p.activeDays, ...p.claimedDays].some(
      (d) => typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d),
    )
  )
    throw Error("Invalid version 1 backup");
  for (const [id, r] of Object.entries(p.records) as [string, WordProgress][]) {
    if (
      !words.some((w) => String(w.id) === id) ||
      !r ||
      typeof r.mastered !== "boolean" ||
      ["attempts", "correct", "streak", "lastSeen", "nextReview", "hints"].some(
        (k) =>
          !Number.isSafeInteger(r[k as keyof WordProgress]) ||
          Number(r[k as keyof WordProgress]) < 0,
      ) ||
      r.correct > r.attempts ||
      r.hints > r.attempts ||
      r.streak > r.correct ||
      r.mastered !== r.streak >= 3 ||
      !Array.isArray(r.history) ||
      r.history.length !== r.attempts ||
      r.history.some(
        (a) =>
          !a ||
          !Number.isSafeInteger(a.at) ||
          a.at < 0 ||
          !["typed", "spoken"].includes(a.mode) ||
          typeof a.correct !== "boolean" ||
          typeof a.hint !== "boolean",
      ) ||
      r.history.filter((a) => a.correct).length !== r.correct
    )
      throw Error("Invalid word progress");
  }
  return p;
}

export function practiceStreak(days: string[], now = new Date()): number {
  const dates = new Set(days);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (!dates.has(cursor.toLocaleDateString("en-CA")))
    cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(cursor.toLocaleDateString("en-CA"))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
