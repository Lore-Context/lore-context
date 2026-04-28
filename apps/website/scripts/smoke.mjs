import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { localeCodes } from "../src/site.mjs";

let chromium;
let devices;
try {
  ({ chromium, devices } = await import("playwright"));
} catch {
  throw new Error("Playwright is not installed. Run `pnpm install` and `pnpm exec playwright install chromium`.");
}

const websiteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.LORE_WEBSITE_SMOKE_PORT ?? 4174);
const baseUrl = `http://127.0.0.1:${port}`;
const expectedHtmlLang = new Map([
  ["zh-hans", "zh-Hans"],
  ["zh-hant", "zh-Hant"]
]);

let server;
let browser;

try {
  await run("node", ["scripts/build.mjs"]);
  server = start("node", ["scripts/serve.mjs", "--port", String(port)]);
  await waitForUrl(`${baseUrl}/`);
  await verifyLanguageChooser();
  await verifyLocaleRoutes();

  browser = await chromium.launch({ headless: true });
  await verifyDesktop(browser);
  await verifyMobile(browser);

  console.log(JSON.stringify({ ok: true, baseUrl, localesVerified: localeCodes.length, viewports: ["desktop", "mobile"] }, null, 2));
} finally {
  if (browser) await browser.close();
  await stop(server);
}

async function verifyLanguageChooser() {
  const html = await fetchHtml(`${baseUrl}/`);
  assert.match(html, /Choose your language\./, "Root language chooser should render.");
  assert.equal((html.match(/data-locale-link/g) ?? []).length, localeCodes.length, "Root language chooser should list all locales.");
}

async function verifyLocaleRoutes() {
  for (const locale of localeCodes) {
    const html = await fetchHtml(`${baseUrl}/${locale}/`);
    const htmlLang = expectedHtmlLang.get(locale) ?? locale;
    assert.match(html, new RegExp(`<html lang="${escapeRegex(htmlLang)}"`), `${locale} route should render locale html lang.`);
    assert.match(html, /redland2024@gmail\.com/, `${locale} route should keep the REDLAND contact email.`);
  }
}

async function verifyDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto(`${baseUrl}/en/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Lore Context." }).waitFor();
  await page.getByText("Agents remember. Teams need proof.", { exact: true }).waitFor();
  await page.locator(".surface .ledger-row").first().waitFor();
  await page.locator(".system-board").waitFor();
  await page.locator(".feature-card").nth(5).waitFor();
  await page.locator(".alpha-row").nth(8).waitFor();
  await page.locator(".eval-shell").waitFor();
  await page.locator(".integration").nth(9).waitFor();
  await assertNoHorizontalOverflow(page, "desktop /en/");

  await page.getByRole("link", { name: /^Docs$/ }).first().click();
  await page.waitForURL(/\/en\/docs\.html$/);
  await page.getByRole("heading", { name: "Docs" }).waitFor();
}

async function verifyMobile(browser) {
  const device = devices["iPhone 13"] ?? { viewport: { width: 390, height: 844 }, userAgent: "LoreSmokeMobile" };
  const context = await browser.newContext(device);
  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/en/`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Lore Context." }).waitFor();
    await assertNoHorizontalOverflow(page, "mobile /en/");

    await page.locator(".lang-menu summary").click();
    await page.locator('.lang-panel a[href="/id/"]').click();
    await page.waitForURL(/\/id\/$/);
    await page.getByText("Agen mengingat. Tim membutuhkan bukti.", { exact: true }).waitFor();
    await assertNoHorizontalOverflow(page, "mobile /id/");
  } finally {
    await context.close();
  }
}

async function fetchHtml(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200, `${url} should return 200.`);
  const contentType = response.headers.get("content-type") ?? "";
  assert.match(contentType, /text\/html/, `${url} should return HTML.`);
  return response.text();
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${label} overflowed horizontally by ${overflow}px.`);
}

function start(command, args) {
  const child = spawn(command, args, {
    cwd: websiteRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function run(command, args) {
  const child = start(command, args);
  const code = await new Promise((resolve) => child.once("exit", resolve));
  if (code !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with code ${code}`);
  }
}

async function waitForUrl(url) {
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw lastError ?? new Error(`${url} did not become ready`);
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
