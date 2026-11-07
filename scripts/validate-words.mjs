import { readFileSync } from "node:fs";
const { entries } = JSON.parse(
  readFileSync(new URL("../words-2027-junior.json", import.meta.url)),
);
if (
  entries.length !== 250 ||
  new Set(entries.map((e) => e.word.toLowerCase())).size !== 250 ||
  entries.some(
    (e, i) =>
      e.id !== i + 1 ||
      ["word", "translation_bg", "example_en"].some(
        (k) => typeof e[k] !== "string" || !e[k].trim(),
      ),
  )
)
  throw Error("Invalid official curriculum");
console.log("Validated all 250 official words.");
