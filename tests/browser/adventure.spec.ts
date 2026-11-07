import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const curriculum = JSON.parse(readFileSync("words-2027-junior.json", "utf8"));
test("complete a quest, persist XP, unlock trail and reload offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Continue your journey" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".round-body")).not.toContainText("accident");
  for (let i = 0; i < 10; i++) {
    await page
      .getByLabel("Your spelling", { exact: true })
      .fill(curriculum.entries[i].word);
    await page.getByRole("button", { name: "Cast spell" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: curriculum.entries[i].word }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: i === 9 ? "See your journey" : "Next word" })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Another path shines brighter." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".xp")).toContainText("250 XP");
  await page.getByRole("button", { name: "Quest 2", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Trail 2", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".brand")).toContainText("Spelling Quest");
  await expect(page.locator(".xp")).toContainText("250 XP");
});
test("all words searchable; tablet layout fits; unsupported speech is explicit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 1280 });
  await page.goto("/");
  await page.getByRole("button", { name: "Word Vault", exact: true }).click();
  await expect(page.locator(".word-card")).toHaveCount(250);
  await page
    .getByLabel("Search official words")
    .fill(curriculum.entries[249].word);
  await expect(page.locator(".word-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Practise", exact: true }).click();
  await page
    .getByRole("button", { name: "Listen & Spell Aloud", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start recording" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm letters & cast spell" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/tablet-quest.png",
    fullPage: true,
  });
});
test("spoken candidate must be confirmed; recognition errors do not score", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class FakeRecognition {
      processLocally = true;
      lang = "";
      continuous = false;
      interimResults = false;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        document.documentElement.dataset.recognitionLocal = String(
          this.processLocally,
        );
        setTimeout(() => {
          this.onresult?.({
            results: [
              {
                isFinal: true,
                0: { transcript: "a c c i d e n t", confidence: 0.95 },
              },
            ],
            resultIndex: 0,
          });
        }, 30);
      }
      stop() {
        setTimeout(() => this.onend?.(), 30);
      }
      abort() {}
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: FakeRecognition,
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page
    .getByRole("button", { name: "Listen & Spell Aloud", exact: true })
    .click();
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByLabel("Detected letters")).toContainText("A");
  await expect(page.locator("html")).toHaveAttribute(
    "data-recognition-local",
    "false",
  );
  await expect(page.locator(".xp")).toContainText("0 XP");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Confirm letters & cast spell" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Stop recording", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm letters & cast spell" })
    .click();
  await expect(page.locator(".feedback")).toContainText("+20 XP");
});
test("mistakes consume lives; microphone denial never scores", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class Denied {
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          this.onerror?.({ error: "not-allowed" });
          this.onend?.();
        }, 20);
      }
      stop() {}
      abort() {}
    }
    Object.defineProperty(window, "SpeechRecognition", { value: Denied });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page
    .getByRole("button", { name: "Listen & Spell Aloud", exact: true })
    .click();
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByRole("alert")).toContainText("permission was denied");
  await expect(page.locator(".xp")).toContainText("0 XP");
  await page
    .getByRole("button", { name: "Listen & Type", exact: true })
    .click();
  await page.getByLabel("Your spelling", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Cast spell" }).click();
  await expect(page.getByLabel("2 lives remaining")).toBeVisible();
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(page.locator(".round-body")).toContainText("WORD 2 OF 10");
});
test("spoken spelling defaults to browser service without consent checkboxes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page
    .getByRole("button", { name: "Listen & Spell Aloud", exact: true })
    .click();
  await expect(
    page.getByText("Browser speech service ·", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Recognition engine")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Confirm letters & cast spell" }),
  ).toBeDisabled();
});
test("map fits landscape and phone screens", async ({ page }) => {
  for (const [width, height] of [
    [1280, 800],
    [1024, 768],
    [360, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Small words. Extraordinary worlds." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1280)
      await page.screenshot({
        path: "test-results/adventure-map.png",
        fullPage: true,
      });
  }
});
test("import, boss retry, relic reward and export are playable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Adventurer", exact: true }).click();
  await expect(page.locator("input[type=file]")).toBeEnabled();
  const backup = {
    version: 1,
    xp: 200,
    completedQuests: ["0-0", "0-1", "0-2", "0-3"],
    records: {},
    activeDays: [],
    claimedDays: [],
  };
  await page.locator("input[type=file]").setInputFiles({
    name: "progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("status")).toContainText("Backup imported.");
  await page.getByRole("button", { name: "Adventure", exact: true }).click();
  await page
    .getByRole("button", { name: "Boss battle 5", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "The Thorn Guardian" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sentence hint" })).toHaveCount(
    0,
  );
  await page.getByLabel("Your spelling", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Cast spell" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(page.locator(".round-body")).toContainText("WORD 1 OF 10");
  for (let i = 40; i < 50; i++) {
    await page
      .getByLabel("Your spelling", { exact: true })
      .fill(curriculum.entries[i].word);
    await page.getByRole("button", { name: "Cast spell" }).click();
    await page
      .getByRole("button", {
        name: i === 49 ? "See your journey" : "Next word",
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Enchanted Forest is restored." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Adventurer", exact: true }).click();
  await expect(page.locator(".relics .collected")).toContainText(
    "Emerald Leaf",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress" }).click();
  expect((await download).suggestedFilename()).toBe(
    "spelling-quest-backup.json",
  );
});

test("paused spelling resumes after a browser session ends and Stop collects the final letter", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const instances: PausedRecognition[] = [];
    let starts = 0;
    class PausedRecognition {
      text = "";
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() {
        instances.push(this);
      }
      start() {
        document.documentElement.dataset.recordingStarts = String(++starts);
      }
      emit(text: string) {
        this.text = text;
        this.onresult?.({
          results: [
            { isFinal: true, 0: { transcript: text, confidence: 0.95 } },
          ],
          resultIndex: 0,
        });
      }
      stop() {
        this.emit(this.text + " t");
        this.onend?.();
      }
      abort() {}
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: PausedRecognition,
    });
    Object.defineProperty(window, "recordingTest", {
      value: (text: string, end = false) => {
        if (text) instances.at(-1)?.emit(text);
        if (end) instances.at(-1)?.onend?.();
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page
    .getByRole("button", { name: "Listen & Spell Aloud", exact: true })
    .click();
  const start = page.getByRole("button", {
      name: "Start recording",
      exact: true,
    }),
    stop = page.getByRole("button", { name: "Stop recording", exact: true });
  await expect(stop).toBeDisabled();
  await start.click();
  await expect(start).toBeDisabled();
  const emit = async (text: string, end = false) =>
    page.evaluate(
      ({ text, end }) =>
        (
          window as unknown as {
            recordingTest: (text: string, end: boolean) => void;
          }
        ).recordingTest(text, end),
      { text, end },
    );
  await emit("a c");
  await page.waitForTimeout(600);
  await emit("", true);
  await expect(page.locator("html")).toHaveAttribute(
    "data-recording-starts",
    "2",
  );
  await expect(stop).toBeEnabled();
  await expect(start).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Confirm letters & cast spell" }),
  ).toBeDisabled();
  await emit("c i d e n");
  await stop.click();
  await expect(
    page.getByLabel("Confirm or correct recognized letters"),
  ).toHaveValue("accident");
  await expect(stop).toBeDisabled();
  await expect(start).toBeEnabled();
  await page
    .getByRole("button", { name: "Confirm letters & cast spell" })
    .click();
  await expect(page.locator(".feedback")).toContainText("+20 XP");
});

test("3D playground selection is keyboard accessible and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Interactive world playground" }),
  ).toBeVisible();
  await expect(page.locator(".playground-canvas")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  const dragon = page.getByRole("button", {
    name: "Preview Dragon’s Lair",
    exact: true,
  });
  await dragon.focus();
  await page.keyboard.press("Enter");
  await expect(dragon).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".selected-realm")).toContainText("Dragon’s Lair");
  const art = page.locator(".world .realm-render");
  await expect(art).toHaveCount(6);
  for (const image of await art.all())
    expect(
      await image.evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBe(960);
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.getByRole("button", { name: "Cast spell" })).toBeDisabled();
});

test("WebGL unavailable still provides world previews and a playable quest", async ({
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
        if (
          type === "webgl" ||
          type === "webgl2" ||
          type === "experimental-webgl"
        )
          return null;
        return Reflect.apply(original, this, [type, ...args]);
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByText(
      "3D view unavailable. Explore with the world buttons below.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Preview Crystal Caves", exact: true })
    .click();
  await expect(page.locator(".selected-realm")).toContainText("Crystal Caves");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.getByLabel("Your spelling", { exact: true })).toBeEnabled();
});
