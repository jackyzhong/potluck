// node capture.mjs <outDir> [light|dark]
import { createRequire } from "node:module";
import path from "node:path";

// Playwright is not a project dependency; this resolves a globally installed one.
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = "http://localhost:3555";
const LEDGER = "4d310fa6-5e2a-588a-bf2e-2ecbf9bfea75";
const SAM = "1b7de7d0-f5aa-5b84-9105-1b7e3a355015";
const out = process.argv[2];
const themes = process.argv[3] ? [process.argv[3]] : ["light", "dark"];
const HIDE_DEV = "nextjs-portal{display:none!important}";

async function ctx(browser, theme, width, height, scale) {
  const c = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: theme, hasTouch: width < 500 });
  await c.addInitScript(([L, S, T]) => {
    localStorage.setItem("potluck:viewer:" + L, S);
    localStorage.setItem("potluck:theme", T);
  }, [LEDGER, SAM, theme]);
  return c;
}
async function open(c, q = "") {
  const p = await c.newPage();
  await p.goto(`${BASE}/ledger/${LEDGER}${q}`, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: HIDE_DEV });
  await p.waitForTimeout(800);
  return p;
}
const shot = (p, name, opts) => p.screenshot({ path: path.join(out, name), animations: "disabled", ...opts });
async function bottomSheetClip(p, sel, height) {
  const box = await p.locator(sel).first().boundingBox();
  return { x: 0, y: box.y, width: 390, height };
}

(async () => {
  const b = await chromium.launch();
  for (const theme of themes) {
    // laptop: 1440x900 at 1.5x -> 2160x1350
    let c = await ctx(b, theme, 1440, 900, 1.5);
    let p = await open(c);
    await p.getByText("Dinner at the Boathouse").first().click();
    await p.waitForTimeout(700);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.mouse.move(700, 895);
    await p.waitForTimeout(300);
    await shot(p, `laptop-${theme}.png`);
    await c.close();

    // phone at 390x844 @2x
    c = await ctx(b, theme, 390, 844, 2);
    p = await open(c);
    await shot(p, `phone-${theme}.png`);
    const hero = p.locator('section[aria-labelledby="hero-label"]').first();
    const hb = await hero.boundingBox();
    await shot(p, `hero-${theme}.png`, { clip: { x: hb.x, y: hb.y, width: 358, height: 245 } });

    // viewer sheet
    await p.getByRole("button", { name: /switch person/ }).first().click();
    await p.waitForTimeout(800);
    await shot(p, `viewer-${theme}.png`, { clip: await bottomSheetClip(p, '[aria-labelledby="viewer-sheet-title"]', 458) });
    await p.keyboard.press("Escape");
    await p.waitForTimeout(400);

    // composer sheet
    await p.getByRole("button", { name: "Add expense" }).last().click();
    await p.waitForTimeout(800);
    const dlg = p.getByRole("dialog").last();
    await dlg.getByRole("textbox").first().fill("Late-night poutine");
    await dlg.locator('input[inputmode="decimal"]').first().fill("64.50");
    await dlg.getByRole("tab", { name: "Percent" }).click();
    await p.waitForTimeout(300);
    const pcts = { Your: "40", "Priya's": "30", "Marco's": "20", "Lena's": "10" };
    for (const [who, v] of Object.entries(pcts)) {
      const f = dlg.locator(`input[aria-label="${who} percentage"]`);
      if (await f.count()) await f.fill(v);
    }
    await dlg.evaluate(() => document.activeElement && document.activeElement.blur());
    await p.waitForTimeout(400);
    await shot(p, `composer-${theme}.png`, { clip: { x: 0, y: (await dlg.boundingBox()).y, width: 390, height: 566 } });
    await c.close();

    // settle-up plan, phone balances tab
    c = await ctx(b, theme, 390, 844, 2);
    p = await open(c, "?tab=balances");
    const plan = p.locator('[aria-labelledby="settle-plan-title"]').first();
    await plan.scrollIntoViewIfNeeded();
    await p.waitForTimeout(300);
    const pb = await plan.boundingBox();
    await shot(p, `plan-${theme}.png`, { clip: { x: pb.x, y: pb.y, width: 358, height: 420 } });
    await c.close();
  }
  await b.close();
})();
