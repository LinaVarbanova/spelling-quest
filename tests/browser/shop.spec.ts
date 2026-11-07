import { test, expect } from "@playwright/test";
test("earned tokens buy and equip pets and robes, persist, export and appear in quests", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Adventurer", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "old-progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        curriculumVersion: 2,
        xp: 300,
        completedQuests: [],
        records: {},
        activeDays: [],
        claimedDays: [],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Backup imported.");
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await expect(page.getByLabel("30 tokens available")).toBeVisible();
  await page
    .getByRole("button", { name: "Preview Ember Fox", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Trying on: Ember Fox" }),
  ).toBeVisible();
  await expect(page.getByLabel("30 tokens available")).toBeVisible();
  await page
    .getByRole("button", { name: "Buy Ember Fox · 8 tokens", exact: true })
    .click();
  await expect(page.getByLabel("22 tokens available")).toBeVisible();
  await page
    .getByRole("button", { name: "Equip Ember Fox", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Ember Fox equipped");
  await page.getByRole("button", { name: "Robes", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Buy Tideweaver robe · 5 tokens",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Equip Tideweaver robe", exact: true })
    .click();
  await expect(page.getByLabel("17 tokens available")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await expect(page.getByLabel("17 tokens available")).toBeVisible();
  await page.getByRole("button", { name: "Adventurer", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "↓ Export progress", exact: true })
    .click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(backup.xp).toBe(300);
  expect(backup.collection.spent).toBe(13);
  expect(backup.collection.equipped).toMatchObject({
    pet: "pet-fox",
    robe: "robe-tide",
  });
  await page.getByRole("button", { name: "Adventure", exact: true }).click();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".quest-stage")).toHaveAttribute(
    "data-scene-pet",
    "pet-fox",
  );
  await expect(page.locator(".quest-stage")).toHaveAttribute(
    "data-scene-robe",
    "robe-tide",
  );
  await page.getByLabel("Your spelling", { exact: true }).fill("body");
  await page.getByRole("button", { name: "Cast spell" }).click();
  await expect(page.locator(".quest-stage")).toHaveAttribute(
    "data-scene-gold",
    "1",
  );
  await expect(page.locator(".xp")).toContainText("320 XP");
});
test("shop fits touch viewports and unavailable purchases are disabled", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Buy Ember Fox · 8 tokens", exact: true }),
  ).toBeDisabled();
  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByRole("button", { name: "Preview Ember Fox", exact: true }),
  ).toBeEnabled();
});
