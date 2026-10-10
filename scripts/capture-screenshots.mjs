// Captures the landing and manifest screenshots from a REAL production build,
// seeded through the app's own import path. No pixel is edited afterwards.
//
//   npm run build && npx next start -p 9877     (in another terminal)
//   npm run screenshots
//
// Exit codes: 0 written, 2 could not run.
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import sharp from "sharp";

const BASE = "http://localhost:9877";
const SEED = new URL("./screenshot-seed.json", import.meta.url).pathname;
const LANDING = new URL("../public/landing/", import.meta.url).pathname;
const MANIFEST = new URL("../public/screenshots/", import.meta.url).pathname;
const STAGES = ["a_acheter", "tsundoku", "bibliotheque", "revendre"];
// First seeded title of each stage, in tab order: proves the pile is rendered.
const STAGE_TITLES = ["Les Misérables", "À la recherche du temps perdu", "Madame Bovary", "Bel-Ami"];
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const SEEDED_TITLE = "Les Misérables"; // first stage, so visible once the first mobile tab is selected

async function webp(buffer, name) {
  await writeFile(`${LANDING}${name}.webp`, await sharp(buffer).webp({ quality: 80 }).toBuffer());
  console.log(`wrote public/landing/${name}.webp`);
}

async function ready(page, theme, entry) {
  await page.waitForSelector(`html[data-theme="${theme}"]`);
  if (entry) await page.waitForSelector(`html[data-entry="${entry}"]`);
  await page.evaluate(() => document.fonts.ready);
}

async function main() {
  try {
    await fetch(BASE);
  } catch {
    console.error(`Nothing on ${BASE}. Run: npm run build && npx next start -p 9877`);
    return 2;
  }

  await mkdir(LANDING, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const context = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1 });
    const page = await context.newPage();

    // Seed through the real import flow.
    await page.goto(`${BASE}/settings`);
    await page.locator('input[type="file"]').first().setInputFiles(SEED);
    await page.getByRole("button", { name: "Remplacer tout" }).click();
    await page.getByText("15 livres", { exact: true }).waitFor();

    for (const theme of ["light", "dark"]) {
      await page.setViewportSize(MOBILE);
      await page.goto(`${BASE}/settings`);
      await page.getByRole("button", { name: "Préférences" }).click(); // collapsed by default
      await page
        .locator(theme === "light" ? 'button:has(svg circle[r="5"])' : 'button:has(svg path[d^="M21 12.79"])')
        .click();
      await ready(page, theme);

      await page.setViewportSize(DESKTOP);
      await page.goto(`${BASE}/`);
      await ready(page, theme, "app");
      await page.getByText(SEEDED_TITLE).first().waitFor();
      await page.waitForTimeout(500); // let the entrance animation settle
      await webp(await page.screenshot(), `board-1440-${theme}`);

      await page.setViewportSize(MOBILE);
      await page.goto(`${BASE}/`);
      await ready(page, theme, "app");
      const tabs = page.getByRole("tab");
      await tabs.nth(0).click();
      await page.getByText(SEEDED_TITLE).first().waitFor();
      for (let i = 0; i < STAGES.length; i++) {
        await tabs.nth(i).click();
        await page.getByText(STAGE_TITLES[i]).first().waitFor();
        await page.waitForTimeout(500); // let the pile transition settle
        const shot = await page.screenshot();
        await webp(shot, `pile-${STAGES[i]}-${theme}`);
      }
      // Board frame at 390: the default tab (first stage tab).
      await tabs.nth(0).click();
      await page.getByText(STAGE_TITLES[0]).first().waitFor();
      await page.waitForTimeout(500);
      const board390 = await page.screenshot();
      await webp(board390, `board-390-${theme}`);

      if (theme === "light") {
        // Manifest-only /add frame; the landing does not use it.
        await page.goto(`${BASE}/add`);
        await ready(page, theme);
        await page.getByText("Ajouter un livre").first().waitFor();
        await page.waitForTimeout(500);
        const add = await page.screenshot();
        await writeFile(`${MANIFEST}screenshot-board.png`, board390);
        await writeFile(`${MANIFEST}screenshot-add.png`, add);
        console.log("wrote public/screenshots/screenshot-{board,add}.png");
      }
    }
  } finally {
    await browser.close();
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(2);
  },
);
