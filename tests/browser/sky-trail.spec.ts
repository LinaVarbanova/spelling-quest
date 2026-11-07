import { test, expect } from "@playwright/test";
test("Sky Trail mounts with reduced motion without exposing the answer", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue your journey" }).click();
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
