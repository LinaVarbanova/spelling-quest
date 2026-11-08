import { test, expect } from "@playwright/test";
test("legacy pets remain equipped; adoption, hair and wings appear in a playable quest", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Adventurer", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "old-shop.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        curriculumVersion: 2,
        xp: 500,
        completedQuests: [],
        records: {},
        activeDays: [],
        claimedDays: [],
        collection: {
          spent: 8,
          owned: [
            "pet-none",
            "robe-lilac",
            "hat-mage",
            "staff-sun",
            "aura-none",
            "pet-fox",
          ],
          equipped: {
            pet: "pet-fox",
            robe: "robe-lilac",
            hat: "hat-mage",
            staff: "staff-sun",
            aura: "aura-none",
          },
        },
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Backup imported");
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.getByRole("button", { name: "Shop", exact: true }).click();
  await expect(page.getByLabel("42 tokens available")).toBeVisible();
  await page
    .getByRole("button", {
      name: "Adopt & equip Cloud Bunny · 10 tokens",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("Cloud Bunny equipped");
  await page.getByRole("button", { name: "Hair", exact: true }).click();
  await page
    .getByRole("button", { name: "Buy Silver sweep · 5 tokens", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Equip Silver sweep", exact: true })
    .click();
  await page.getByRole("button", { name: "Hats", exact: true }).click();
  await page.getByRole("button", { name: "Equip No hat", exact: true }).click();
  await page
    .getByRole("button", { name: "Wings & packs", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Buy Crystal wings · 12 tokens", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Equip Crystal wings", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Crystal wings equipped",
  );
  await expect(page.getByLabel("15 tokens available")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  const scene = page.locator(".quest-stage");
  await expect(scene).toHaveAttribute("data-scene-pet", "pet-bunny");
  await expect(scene).toHaveAttribute("data-scene-hair", "hair-silver");
  await expect(scene).toHaveAttribute("data-scene-back", "back-fairy");
  await expect(page.locator(".active-companion")).toHaveText(
    "Companion: Cloud Bunny",
  );
  await page.getByLabel("Your spelling", { exact: true }).fill("body");
  await page.getByRole("button", { name: "Cast spell" }).click();
  await expect(scene).toHaveAttribute("data-scene-arrived", "1");
  await expect(page.locator(".active-companion")).toHaveText(
    "Companion: Cloud Bunny",
  );
});
