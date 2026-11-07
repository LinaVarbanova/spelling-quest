/** Transparent game-derived spelling complexity, not an official or individually calibrated ranking. */
const trickySpellings: Record<string, { floor: number; reason: string }> = {
  rhythm: {
    floor: 24,
    reason: "Y as a vowel and an unusual consonant sequence",
  },
  hygiene: { floor: 23, reason: "Unusual vowel order and soft g" },
  environment: { floor: 23, reason: "Long word with an easily missed n" },
  noticeable: { floor: 22, reason: "Retained e before -able" },
  successful: { floor: 22, reason: "Double c, double s and single l ending" },
  intelligent: { floor: 21, reason: "Double l and unstressed ending" },
  inadequate: {
    floor: 21,
    reason: "Long word with unstressed vowels and -quate",
  },
  explanation: { floor: 20, reason: "Unstressed vowels and -ation ending" },
  electricity: {
    floor: 20,
    reason: "Repeated letter patterns and -city ending",
  },
  mosquito: { floor: 19, reason: "Unusual -squito letter sequence" },
  cupboard: {
    floor: 19,
    reason: "Silent p and less predictable letter sequence",
  },
  geography: { floor: 19, reason: "Soft g, vowel order and ph" },
  protagonist: { floor: 19, reason: "Long sequence with unstressed vowels" },
  gymnastics: { floor: 18, reason: "Soft g and y used as a vowel" },
  bicycle: { floor: 17, reason: "Two c spellings and final -cle" },
  pursue: { floor: 17, reason: "Unusual final -sue sequence" },
  science: { floor: 17, reason: "Sc and unusual vowel sequence" },
  weird: { floor: 17, reason: "Unusual ei vowel order" },
  guilty: { floor: 16, reason: "Unusual ui vowel sequence" },
  muscle: { floor: 16, reason: "Silent c and final -cle" },
  cough: { floor: 16, reason: "Unpredictable -ough spelling" },
  naughty: { floor: 16, reason: "Augh letter sequence" },
  laugh: { floor: 16, reason: "Augh letter sequence" },
  medicine: { floor: 16, reason: "Soft c and unstressed vowels" },
  lightning: {
    floor: 16,
    reason: "Gh spelling and easily confused letter sequence",
  },
  salmon: { floor: 15, reason: "Silent l" },
  honest: { floor: 15, reason: "Silent h" },
  swordfish: { floor: 15, reason: "Silent w in a compound word" },
  juice: { floor: 14, reason: "Unusual ui and final -ce" },
  country: { floor: 14, reason: "Less predictable ou vowel pattern" },
  trouble: { floor: 14, reason: "Ou vowel pattern and final -ble" },
  double: { floor: 14, reason: "Ou vowel pattern and final -ble" },
  drawer: { floor: 14, reason: "Less predictable vowel and ending" },
  almond: { floor: 14, reason: "Less predictable l spelling across accents" },
  treasure: { floor: 14, reason: "Vowel sequence and -sure ending" },
  believe: { floor: 14, reason: "Ie vowel order" },
  fasten: { floor: 13, reason: "Silent t" },
  climb: { floor: 13, reason: "Silent b" },
  lamb: { floor: 12, reason: "Silent b" },
  build: { floor: 12, reason: "Unusual ui vowel sequence" },
  building: { floor: 13, reason: "Unusual ui vowel sequence" },
  heart: { floor: 12, reason: "Less predictable ear vowel pattern" },
  honey: { floor: 12, reason: "Less predictable o vowel spelling" },
  know: { floor: 11, reason: "Silent k" },
  knee: { floor: 11, reason: "Silent k" },
  ghost: { floor: 11, reason: "Silent h" },
  quiet: { floor: 11, reason: "Easily confused vowel sequence" },
  pretty: { floor: 10, reason: "Less predictable e vowel spelling" },
  move: { floor: 9, reason: "Less predictable final-e vowel pattern" },
  poor: { floor: 8, reason: "Less predictable oo vowel pattern" },
  find: { floor: 6, reason: "Long vowel before -nd" },
  want: { floor: 7, reason: "Less predictable a vowel spelling" },
  word: { floor: 8, reason: "Less predictable or vowel spelling" },
};
// Guard against accidental entries in this reference table: only official words call this function.
export function wordComplexity(word: string) {
  const text = word.toLowerCase(),
    reasons: string[] = [];
  let score = Math.max(0, text.length - 3) * 1.15;
  if (text.length >= 8) {
    score += 1;
    reasons.push("Longer letter sequence");
  }
  if (text.length >= 10) score += 1;
  const doubles = text.match(/([b-df-hj-np-tv-z])\1/g) || [];
  if (doubles.length) {
    score += doubles.length * 1.4;
    reasons.push("Double consonants");
  }
  const vowels =
    text.match(/ai|ay|ea|ee|oa|oo|ou|ow|oi|oy|ie|ei|au|ue|ui/g) || [];
  if (vowels.length) {
    score += vowels.length * 0.85;
    reasons.push("Vowel teams");
  }
  if (/[aeiou][^aeiou]e$/.test(text)) {
    score += 0.4;
    reasons.push("Final-e pattern");
  }
  if (/ph|gh|kn|mb/.test(text)) {
    score += 2;
    reasons.push("Less common consonant pattern");
  }
  if (/c[iey]|g[iey]/.test(text)) {
    score += 0.8;
    reasons.push("Soft c or g pattern");
  }
  if (/tion$|sion$|sity$|sure$|ture$|able$/.test(text)) {
    score += 2.5;
    reasons.push("Longer spelling ending");
  }
  if (/ch|sh|th|wh|ck|qu/.test(text)) score += 0.35;
  const tricky = trickySpellings[text];
  if (tricky) {
    score = Math.max(score, tricky.floor);
    reasons.push(tricky.reason);
  }
  return {
    score: Math.round(score * 100) / 100,
    reasons: reasons.length ? reasons : ["Shorter, common spelling pattern"],
  };
}
export function compareComplexity(
  a: { word: string; id: number },
  b: { word: string; id: number },
) {
  return (
    wordComplexity(a.word).score - wordComplexity(b.word).score ||
    a.word.length - b.word.length ||
    a.word.localeCompare(b.word, "en") ||
    a.id - b.id
  );
}
