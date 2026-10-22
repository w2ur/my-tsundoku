// Captures the landing and manifest screenshots from a REAL production build,
// seeded through the app's own import path. No pixel is edited afterwards.
//
//   npm run build && npx next start -p 9877     (in another terminal)
//   npm run screenshots                  French and English
//   npm run screenshots -- fr|en         one locale only
//
// French assets keep their historical names (board-1440-light.webp); English
// ones carry an -en suffix (board-1440-light-en.webp). The manifest screenshots
// are French only. The locale is switched through Settings > Preferences, like
// a visitor would, so the English frames show the real English interface.
//
// Exit codes: 0 written, 2 could not run.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";

const BASE = "http://localhost:9877";
const SEED = fileURLToPath(new URL("./screenshot-seed.json", import.meta.url));
const LANDING = fileURLToPath(new URL("../public/landing/", import.meta.url));
const README = fileURLToPath(new URL("../README.md", import.meta.url));
const MANIFEST = fileURLToPath(new URL("../public/screenshots/", import.meta.url));
const STAGES = ["a_acheter", "tsundoku", "bibliotheque", "revendre"];
// First seeded title of each stage, in tab order: proves the pile is rendered.
const STAGE_TITLES = ["Les Misérables", "À la recherche du temps perdu", "Madame Bovary", "Bel-Ami"];
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const SEEDED_TITLE = "Les Misérables"; // first stage, so visible once the first mobile tab is selected
// The labels the script waits on or clicks; everything else is located by role or shape.
const UI = {
  fr: { preferences: "Préférences", replaceAll: "Remplacer tout", count: "15 livres", addTitle: "Ajouter un livre", suffix: "" },
  en: { preferences: "Preferences", replaceAll: "Replace all", count: "15 books", addTitle: "Add a book", suffix: "-en" },
};

async function webp(buffer, name, suffix) {
  name = `${name}${suffix}`;
  await writeFile(`${LANDING}${name}.webp`, await sharp(buffer).webp({ quality: 80 }).toBuffer());
  console.log(`wrote public/landing/${name}.webp`);
}

// The seed file owns each manifest screenshot's description; keep the README
// alt text in step so a recapture never leaves it describing an older frame.
async function syncReadmeAlts() {
  const { screenshots } = JSON.parse(await readFile(SEED, "utf8"));
  let readme = await readFile(README, "utf8");
  for (const { file, alt } of screenshots) {
    const image = new RegExp(`!\\[[^\\]]*\\]\\(public/screenshots/${file}\\)`);
    if (!image.test(readme)) throw new Error(`README.md does not embed ${file}`);
    readme = readme.replace(image, () => `![${alt}](public/screenshots/${file})`);
  }
  await writeFile(README, readme);
  console.log("synced README.md screenshot alt texts from the seed");
}

async function ready(page, theme, entry) {
  await page.waitForSelector(`html[data-theme="${theme}"]`);
  if (entry) await page.waitForSelector(`html[data-entry="${entry}"]`);
  await page.evaluate(() => document.fonts.ready);
}

async function captureLocale(browser, locale) {
  const ui = UI[locale];
  const context = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();

    // A fresh context starts in French; switch through the real preference toggle.
    await page.goto(`${BASE}/settings`);
    await page.getByRole("button", { name: UI.fr.preferences }).click(); // collapsed by default
    await page.getByRole("button", { name: locale.toUpperCase(), exact: true }).click();
    await page.waitForSelector(`html[lang="${locale}"]`);

    // Seed through the real import flow.
    await page.locator('input[type="file"]').first().setInputFiles(SEED);
    await page.getByRole("button", { name: ui.replaceAll }).click();
    await page.getByText(ui.count, { exact: true }).waitFor();

    for (const theme of ["light", "dark"]) {
      await page.setViewportSize(MOBILE);
      await page.goto(`${BASE}/settings`);
      await page.getByRole("button", { name: ui.preferences }).click(); // collapsed by default
      await page
        .locator(theme === "light" ? 'button:has(svg circle[r="5"])' : 'button:has(svg path[d^="M21 12.79"])')
        .click();
      await ready(page, theme);

      await page.setViewportSize(DESKTOP);
      await page.goto(`${BASE}/`);
      await ready(page, theme, "app");
      await page.getByText(SEEDED_TITLE).first().waitFor();
      await page.waitForTimeout(500); // let the entrance animation settle
      await webp(await page.screenshot(), `board-1440-${theme}`, ui.suffix);

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
        await webp(shot, `pile-${STAGES[i]}-${theme}`, ui.suffix);
      }
      // Board frame at 390 (first stage tab): manifest only, the landing reuses pile-a_acheter.
      await tabs.nth(0).click();
      await page.getByText(STAGE_TITLES[0]).first().waitFor();
      await page.waitForTimeout(500);
      const board390 = await page.screenshot();

      if (theme === "light" && locale === "fr") {
        // Manifest-only /add frame; the landing does not use it.
        await page.goto(`${BASE}/add`);
        await ready(page, theme);
        await page.getByText(ui.addTitle).first().waitFor();
        await page.waitForTimeout(500);
        const add = await page.screenshot();
        await writeFile(`${MANIFEST}screenshot-board.png`, board390);
        await writeFile(`${MANIFEST}screenshot-add.png`, add);
        console.log("wrote public/screenshots/screenshot-{board,add}.png");
        await syncReadmeAlts();
      }
    }
  } finally {
    await context.close();
  }
}

async function main() {
  const arg = process.argv[2];
  if (arg && !(arg in UI)) {
    console.error(`Unknown locale "${arg}". Use fr or en, or no argument for both.`);
    return 2;
  }
  const locales = arg ? [arg] : Object.keys(UI);

  try {
    await fetch(BASE);
  } catch {
    console.error(`Nothing on ${BASE}. Run: npm run build && npx next start -p 9877`);
    return 2;
  }

  await mkdir(LANDING, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const locale of locales) await captureLocale(browser, locale);
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
