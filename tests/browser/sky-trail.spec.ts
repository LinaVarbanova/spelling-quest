import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { compareComplexity } from "../../src/difficulty";
const learningWords = JSON.parse(
  readFileSync("words-2027-junior.json", "utf8"),
).entries.sort(compareComplexity);
test("Sky Trail mounts with reduced motion without exposing the answer", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.locator(".quest-stage canvas").waitFor();
  await expect(page.locator('[data-scene-phase="ready"]')).toBeVisible({
    timeout: 500,
  });
  await expect(page.locator(".round-body")).not.toContainText("body");
  await expect(
    page.getByRole("heading", { name: "Trail 1", exact: true }),
  ).toBeVisible();
});
test("quest falls back to its original banner when WebGL is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (
        this: HTMLCanvasElement,
        type: string,
        ...args: unknown[]
      ) {
        if (type.includes("webgl")) return null;
        return Reflect.apply(original, this, [type, ...args]);
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".battle-art .world-artwork")).toBeVisible();
  await expect(page.getByLabel("Your spelling", { exact: true })).toBeEnabled();
});
test("context loss releases the quest scene and restores the banner", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.locator(".quest-stage canvas").waitFor();
  await page
    .locator(".quest-stage canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.locator(".battle-art")).toBeVisible();
  await expect(page.getByLabel("Your spelling", { exact: true })).toBeEnabled();
});

test("a correct spell crosses while Next stays immediately usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  const scene = page.locator(".quest-stage");
  await expect(scene).toHaveAttribute("data-scene-phase", "ready");
  await page.getByLabel("Your spelling", { exact: true }).fill("body");
  await page.getByRole("button", { name: "Cast spell" }).click();
  await expect(page.getByRole("button", { name: "Next word" })).toBeEnabled({
    timeout: 300,
  });
  await expect(scene).toHaveAttribute("data-scene-gold", "1", {
    timeout: 6000,
  });
  await expect(scene).toHaveAttribute("data-scene-arrived", "1", {
    timeout: 6000,
  });
});

test("a miss marks the lantern blue and dims exactly one life", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.getByLabel("Your spelling", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Cast spell" }).click();
  await expect(page.locator('[data-scene-blue="1"]')).toBeVisible();
  await expect(page.locator(".life.full")).toHaveCount(2);
  await expect(page.locator(".quest-stage")).toHaveAttribute(
    "data-scene-gold",
    "0",
  );
  await expect(page.getByRole("button", { name: "Next word" })).toBeEnabled();
});

test("a full reduced-motion trail opens its gate without waiting for animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  for (let i = 0; i < 10; i++) {
    await page
      .getByLabel("Your spelling", { exact: true })
      .fill(learningWords[i].word);
    await page.getByRole("button", { name: "Cast spell" }).click();
    if (i < 9) await page.getByRole("button", { name: "Next word" }).click();
  }
  const scene = page.locator(".quest-stage");
  await expect(scene).toHaveAttribute("data-scene-arrived", "10");
  await expect(scene).toHaveAttribute("data-scene-phase", "finished");
  await expect(scene).toHaveAttribute("data-scene-gate", "open");
  await expect(
    page.getByRole("button", { name: "See your journey" }),
  ).toBeEnabled();
});

test("guardian retry keeps its shield; correct spells crack all segments", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Adventurer", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        curriculumVersion: 2,
        xp: 200,
        completedQuests: ["0-0", "0-1", "0-2", "0-3"],
        records: {},
        activeDays: [],
        claimedDays: [],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Backup imported.");
  await page.getByRole("button", { name: "Adventure", exact: true }).click();
  await page
    .getByRole("button", { name: "Boss battle 5", exact: true })
    .click();
  const scene = page.locator(".quest-stage");
  await expect(scene).toHaveAttribute("data-scene-shield", "10");
  await page.getByLabel("Your spelling", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Cast spell" }).click();
  await expect(scene).toHaveAttribute("data-scene-arrived", "0");
  await expect(scene).toHaveAttribute("data-scene-shield", "10");
  await page.getByRole("button", { name: "Next word" }).click();
  for (let i = 40; i < 50; i++) {
    await page
      .getByLabel("Your spelling", { exact: true })
      .fill(learningWords[i].word);
    await page.getByRole("button", { name: "Cast spell" }).click();
    if (i < 49) await page.getByRole("button", { name: "Next word" }).click();
  }
  await expect(scene).toHaveAttribute("data-scene-shield", "0");
  await expect(scene).toHaveAttribute("data-scene-phase", "finished");
  await expect(scene).toHaveAttribute("data-scene-blue", "0");
});
