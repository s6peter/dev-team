// Headless screenshots via puppeteer-core + system Chrome.
//   node scripts/screenshot.mjs [label]   (label => screenshots/<label>/)
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/usr/bin/google-chrome";
const BASE = "http://localhost:3456";
const ADMIN = { email: "queengbraids@gmail.com", password: "QueenG!admin2026" };
const label = process.argv[2] || "shot";
const dir = `screenshots/${label}`;
mkdirSync(dir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 950 },
});

async function shot(page, name) {
  await sleep(700);
  await page.screenshot({ path: `${dir}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
}

async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  await sleep(1200); // let client render + images settle
}

try {
  // ---- public pages ----
  const pub = browser.newPage ? await browser.newPage() : null;
  const page = pub || (await browser.pages())[0];
  for (const [path, name] of [
    ["/", "public-home"],
    ["/services", "public-services"],
    ["/book", "public-book"],
    ["/policies", "public-policies"],
  ]) {
    console.log(`public ${path}`);
    await goto(page, path);
    await shot(page, name);
  }

  // ---- admin (login) ----
  console.log("admin login");
  await goto(page, "/admin");
  await page.waitForSelector('input[type="email"]', { timeout: 8000 }).catch(() => {});
  const hasLogin = await page.$('input[type="email"]');
  if (hasLogin) {
    await page.type('input[type="email"]', ADMIN.email, { delay: 10 });
    await page.type('input[type="password"]', ADMIN.password, { delay: 10 });
    await Promise.all([
      page.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Sign in");
        b && b.click();
      }),
      sleep(2500),
    ]);
  }
  await goto(page, "/admin");
  // screenshot each admin tab
  const tabs = ["calendar", "appointments", "clients", "analytics", "services", "schedule", "settings", "reviews"];
  for (const t of tabs) {
    const clicked = await page.evaluate((tab) => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().toLowerCase() === tab);
      if (b) { b.click(); return true; }
      return false;
    }, t);
    await sleep(1400);
    if (clicked) await shot(page, `admin-${t}`);
    else console.log(`  (tab ${t} not found)`);
  }
} catch (e) {
  console.error("screenshot error:", e.message);
} finally {
  await browser.close();
}
console.log(`done -> ${dir}`);
