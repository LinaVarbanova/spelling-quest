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
    page.getByRole("button", { name: "Start microphone" }),
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
          this.onend?.();
        }, 30);
      }
      stop() {}
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
  await page.getByRole("button", { name: "Start microphone" }).click();
  await expect(page.getByLabel("Detected letters")).toContainText("A");
  await expect(page.locator("html")).toHaveAttribute(
    "data-recognition-local",
    "false",
  );
  await expect(page.locator(".xp")).toContainText("0 XP");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
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
  await page.getByRole("button", { name: "Start microphone" }).click();
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
