import { Buffer } from "node:buffer";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage();
  await page.goto(process.env.PLAYGROUND_DEV_URL || "http://localhost:5173/");
  await page.getByRole("button", { name: "Continue your journey" }).waitFor();
  await page.waitForTimeout(600);
  await mkdir(new URL("../public/worlds/", import.meta.url), {
    recursive: true,
  });
  for (let world = 0; world < 6; world++) {
    const data = await page.evaluate(async (world) => {
      const module = await import("/src/playground-scene.ts");
      const poster = module.renderRealmPoster(world);
      const image = document.createElement("img");
      image.src = poster;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 560;
      const context = canvas.getContext("2d");
      if (!context) throw Error("Could not create card renderer");
      context.drawImage(image, 0, 0, 960, 560);
      return { poster, card: canvas.toDataURL("image/webp", 0.94) };
    }, world);
    await writeFile(
      new URL(`../public/worlds/realm-${world + 1}.webp`, import.meta.url),
      Buffer.from(data.poster.split(",")[1], "base64"),
    );
    await writeFile(
      new URL(`../public/worlds/realm-${world + 1}-card.webp`, import.meta.url),
      Buffer.from(data.card.split(",")[1], "base64"),
    );
    console.log(`Rendered original 2400 × 1400 realm ${world + 1}`);
  }
} finally {
  await browser.close();
}
