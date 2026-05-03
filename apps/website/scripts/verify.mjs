import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSiteFiles, localeCodes, pageSlugs } from "../src/site.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const files = generateSiteFiles();
const rootUrl = new URL("https://lorecontext.com");

const failures = [];
const languageLabels = [
  "English",
  "한국어",
  "日本語",
  "简体中文",
  "繁體中文",
  "Tiếng Việt",
  "Español",
  "Português",
  "Русский",
  "Türkçe",
  "Deutsch",
  "Français",
  "Italiano",
  "Ελληνικά",
  "Polski",
  "Українська",
  "Bahasa Indonesia"
];
const heroChips = ["LOCAL ALPHA OPEN", "REST API", "MCP STDIO", "POSTGRES 16", "DASHBOARD", "PRIVATE DEPLOY"];
const homepageStructureMarkers = [
  'id="problem"',
  'id="system"',
  'id="features"',
  'id="alpha"',
  'id="eval"',
  'id="integrations"',
  'id="start"',
  'class="skip-link"',
  'class="problem-visual"',
  'class="system-board"',
  'class="alpha-grid"',
  'class="eval-shell"',
  'class="integrations-grid"',
  'class="terminal"'
];
const premiumInfrastructureLabels = [
  "Memory evidence ledger",
  "context.compose()",
  "gov · gate",
  "System diagram · context plane v0.6",
  "read path · policy gate · persist + audit",
  "Build manifest",
  "Activation report",
  "AI-readable docs",
  "Distribution pack",
  "Design partner intake",
  "Private Deployment"
];
const homeRuntimeLabels = [
  "redland2024@gmail.com",
  "mailto:redland2024@gmail.com",
  "context.ledger",
  "alpha-banner",
  "use-case-strip",
  "Demo memories",
  "Golden clients",
  "used_in_response",
  "stale_score",
  "review_status",
  "Recall@5",
  "Precision@5",
  "Latency",
  "pnpm quickstart -- --dry-run --activation-report",
  "MCP clients",
  "context.query",
  "composer",
  "Postgres",
  "Activation report",
  "Eval Playground",
  "Private Deployment",
  "problem-visual",
  "system-board",
  "feature-viz",
  "eval-shell"
];
const docsPageMarkers = [
  "Run the alpha locally",
  "GitHub source",
  "v0.6.0-alpha release",
  "Getting started",
  "API reference",
  "Deployment",
  "Integrations",
  "RELEASE GATE",
  "38 REST paths verified by pnpm openapi:check",
  "Context traces expose used and ignored memory rows",
  "17 locales and 189 static files generated",
  "LOCALIZED DOCS",
  "Community PRs can improve translation quality"
];
const englishV3Copy = [
  "<h1>Audit, govern, and migrate your AI agent's memory.</h1>",
  "The open-source control plane for agent memory eval, evidence, and portability.",
  "Run it locally, query demo memory, and open an Evidence Ledger trace before you trust durable agent context.",
  "Agents remember. Teams need proof.",
  "One context plane. Every agent surface.",
  "Built for operators, not memory hype.",
  "Eval proof report. On your own data.",
  "The memory gap",
  "git clone https://github.com/Lore-Context/lore-context",
  "Start with a local alpha. Prove memory quality before you scale it."
];
const motionKeys = [
  "cursorBlink",
  "ledgerScan",
  "nodePulse",
  "barReveal",
  "sparkDraw",
  "flowDash",
  "surfaceSweep",
  "revealRise",
  "gridDrift",
  "signalRing",
  "terminalClip",
  "statusGlow"
];

const launchPageCount = 4;
// v1.0 layer: pricing, download, compare, sitemap are net-new (not in pageSlugs).
// company, contact, terms, cookies, docs, privacy, status override pageSlugs entries.
const v10NetNewTopLevel = 4;
const expectedFileCount = 6 + launchPageCount + pageSlugs.length + v10NetNewTopLevel + localeCodes.length * (1 + pageSlugs.length);
if (files.size !== expectedFileCount) {
  failures.push(`Expected ${expectedFileCount} generated files, got ${files.size}.`);
}

for (const locale of localeCodes) {
  const homePath = `${locale}/index.html`;
  const html = files.get(homePath);
  if (!html) {
    failures.push(`Missing locale homepage: ${homePath}`);
    continue;
  }

  requireTexts(homePath, html, ["Lore Context", "REDLAND PTE. LTD.", ...heroChips, ...homeRuntimeLabels]);
  requireTexts(homePath, html, [...homepageStructureMarkers, ...premiumInfrastructureLabels]);

  if (locale === "en") {
    requireTexts(homePath, html, englishV3Copy);
  } else if (html.includes("The control plane for AI-agent memory, eval, and governance.")) {
    failures.push(`${homePath} leaked English hero statement into a non-English locale.`);
  }

  if (!html.includes(`lang="${htmlLang(locale)}"`)) {
    failures.push(`${homePath} missing expected html lang.`);
  }

  if ((html.match(/rel="alternate"/g) ?? []).length !== localeCodes.length + 1) {
    failures.push(`${homePath} should include hreflang alternates for every supported locale plus x-default.`);
  }

  if ((html.match(/<a\s+data-locale-link/g) ?? []).length !== localeCodes.length) {
    failures.push(`${homePath} should expose ${localeCodes.length} language switch links.`);
  }

  if ((html.match(/class="feature-card"/g) ?? []).length !== 6) {
    failures.push(`${homePath} should expose 6 product feature cards.`);
  }

  if ((html.match(/class="alpha-row"/g) ?? []).length !== 10) {
    failures.push(`${homePath} should expose 10 alpha/build status rows.`);
  }

  if ((html.match(/class="integration"/g) ?? []).length !== 10) {
    failures.push(`${homePath} should expose 10 integration tiles.`);
  }

  for (const label of languageLabels) {
    if (!html.includes(label)) failures.push(`${homePath} missing language label: ${label}`);
  }

  if (!html.includes("<footer") || !html.includes("UEN 202304648K")) {
    failures.push(`${homePath} missing production footer/company information.`);
  }
}

for (const locale of localeCodes) {
  for (const slug of pageSlugs) {
    const path = `${locale}/${slug}.html`;
    if (!files.has(path)) failures.push(`Missing localized page: ${path}`);
  }
  const contactPath = `${locale}/contact.html`;
  const contactHtml = files.get(contactPath) ?? "";
  requireTexts(contactPath, contactHtml, ["redland2024@gmail.com", 'meta name="description" content="Email: redland2024@gmail.com"']);

  const docsPath = `${locale}/docs.html`;
  const docsHtml = files.get(docsPath) ?? "";
  requireTexts(docsPath, docsHtml, docsPageMarkers);
  if ((docsHtml.match(/class="doc-card"/g) ?? []).length !== 7) {
    failures.push(`${docsPath} should expose 7 primary documentation cards.`);
  }
  if ((docsHtml.match(/class="doc-step"/g) ?? []).length !== 4) {
    failures.push(`${docsPath} should expose 4 quickstart steps.`);
  }
  if ((docsHtml.match(/class="doc-locale-grid"/g) ?? []).length !== 1) {
    failures.push(`${docsPath} should expose a localized docs grid.`);
  }
}

for (const path of [
  "index.html",
  "_headers",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "llms-full.txt",
  "quickstart/index.html",
  "blog/index.html",
  "blog/v0-6-distribution-and-trust-sprint/index.html",
  "benchmark/index.html",
  "download.html",
  "compare.html",
  "sitemap.html",
  ...pageSlugs.map((slug) => `${slug}.html`)
]) {
  if (!files.has(path)) failures.push(`Missing release file: ${path}`);
}

// v1.0 consumer surface — required content checks. The locale-prefixed v0.6
// alpha homepage at <locale>/index.html keeps its v3 hero copy; these checks
// only validate the new English-canonical top-level pages.
const v10HomeMarkers = [
  "<h1>All your agents. One shared memory.</h1>",
  "v1.0.0-rc.2 Public SaaS beta readiness",
  ">Request beta access<",
  ">See how it works<",
  'data-v10-cta="beta"',
  'data-v10-banner',
  'data-v10-section="how-it-works"',
  'data-v10-section="surfaces"',
  'data-v10-section="pricing-preview"',
  'data-v10-pricing'
];
requireTexts("index.html", files.get("index.html") ?? "", v10HomeMarkers);

const v10PricingMarkers = ["v1.0 / PRICING", "$2.99/mo", "$7.99/mo", "$19/mo", "Hard caps", "no overage"];
requireTexts("pricing.html", files.get("pricing.html") ?? "", v10PricingMarkers);

const v10PrivacyMarkers = ["v1.0 / PRIVACY", "summarizes by default", "Pause and private mode", "Authorized sources only", "Summary-only default"];
requireTexts("privacy.html", files.get("privacy.html") ?? "", v10PrivacyMarkers);

const v10DownloadMarkers = ["v1.0 / PRIVATE BETA", "Request beta access", "Google sign-in for invited users", "lore connect", "Chrome MV3"];
requireTexts("download.html", files.get("download.html") ?? "", v10DownloadMarkers);

const v10DocsMarkers = ["v1.0 / DOCS", "Sign in with Google", "Memory Inbox", "Evidence Ledger", "lore connect", '/en/docs.html'];
requireTexts("docs.html", files.get("docs.html") ?? "", v10DocsMarkers);

const v10StatusMarkers = ["v1.0 / STATUS", "Public SaaS beta readiness is live", "1.0.0-rc.2", "Browser extension", "Capture ingestion"];
requireTexts("status.html", files.get("status.html") ?? "", v10StatusMarkers);

const v10ChangelogMarkers = ["CHANGELOG", "v1.0.0-rc.2", "Public SaaS beta readiness", "not stable GA"];
requireTexts("changelog.html", files.get("changelog.html") ?? "", v10ChangelogMarkers);

const v10CompareMarkers = ["v1.0 / COMPARE", "Supermemory", "Mem0", "Zep", "Letta", "No SOC 2 claim"];
requireTexts("compare.html", files.get("compare.html") ?? "", v10CompareMarkers);

const v10SitemapMarkers = ["SITEMAP", "REDLAND PTE. LTD.", "202304648K", "Software and application development"];
requireTexts("sitemap.html", files.get("sitemap.html") ?? "", v10SitemapMarkers);

const v10CompanyMarkers = ["COMPANY", "REDLAND PTE. LTD.", "202304648K", "1 North Bridge Road", "Singapore 179094", "Software and application development"];
requireTexts("company.html", files.get("company.html") ?? "", v10CompanyMarkers);

const v10ContactMarkers = ["CONTACT", "redland2024@gmail.com", "REDLAND PTE. LTD."];
requireTexts("contact.html", files.get("contact.html") ?? "", v10ContactMarkers);

const v10TermsMarkers = ["TERMS", "REDLAND PTE. LTD.", "Singapore", "No production reliance"];
requireTexts("terms.html", files.get("terms.html") ?? "", v10TermsMarkers);

const v10CookiesMarkers = ["COOKIES", "advertising cookies", "third-party tracking", "localStorage"];
requireTexts("cookies.html", files.get("cookies.html") ?? "", v10CookiesMarkers);

requireTexts("sitemap.xml", files.get("sitemap.xml") ?? "", [
  "https://lorecontext.com/pricing.html",
  "https://lorecontext.com/company.html",
  "https://lorecontext.com/contact.html",
  "https://lorecontext.com/terms.html",
  "https://lorecontext.com/cookies.html",
  "https://lorecontext.com/sitemap.html"
]);

// The v1.0 surface must avoid affirmative claims the lane explicitly
// forbids (negations like "No SOC 2 claim" are allowed; the regex matches
// only positive marketing).
const forbiddenAffirmations = [
  /\bSOC ?2 (?:certified|compliant|ready)\b/i,
  /\b(?:Lore is|we are) generally available\b/i,
  /\bsign in with GitHub\b/i,
  /\bunlimited (?:capture|recall|memory|storage)\s+(?:for everyone|tier|included|guaranteed)\b/i,
  /\bbeats? all benchmarks\b/i
];
for (const path of [
  "index.html", "pricing.html", "privacy.html", "download.html", "docs.html", "status.html", "changelog.html", "compare.html",
  "company.html", "contact.html", "terms.html", "cookies.html", "sitemap.html"
]) {
  const text = files.get(path) ?? "";
  for (const pattern of forbiddenAffirmations) {
    if (pattern.test(text)) {
      failures.push(`${path} contains a forbidden v1.0 marketing claim: ${pattern}`);
    }
  }
}

requireTexts("blog/v0-6-distribution-and-trust-sprint/index.html", files.get("blog/v0-6-distribution-and-trust-sprint/index.html") ?? "", [
  "@lore-context/server",
  "0.6.0-alpha.1",
  "public GHCR OCI image"
]);

requireTexts("en/status.html", files.get("en/status.html") ?? "", [
  "@lore-context/server version 0.6.0-alpha.1 on npm plus GHCR OCI image",
  "Official MCP Registry active with npm and OCI install paths"
]);

const headers = files.get("_headers") ?? "";
requireTexts("_headers", headers, [
  "Content-Security-Policy: default-src 'self'",
  "X-Content-Type-Options: nosniff",
  "Referrer-Policy: strict-origin-when-cross-origin",
  "Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()",
  "frame-ancestors 'none'",
  "/llms.txt",
  "/llms-full.txt"
]);

const robotsTxt = files.get("robots.txt") ?? "";
requireTexts("robots.txt", robotsTxt, [
  "User-agent: *",
  "Sitemap: https://lorecontext.com/sitemap.xml",
  "LLMs: https://lorecontext.com/llms.txt"
]);

const llmsTxt = files.get("llms.txt") ?? "";
requireTexts("llms.txt", llmsTxt, [
  "# Lore Context",
  "Evidence Ledger",
  "Governance",
  "Eval runner",
  "MIF export/import",
  "MCP stdio",
  "pnpm quickstart -- --dry-run --activation-report",
  "https://github.com/Lore-Context/lore-context/blob/main/docs/getting-started.md",
  "https://github.com/Lore-Context/lore-context/blob/main/docs/release-status.md",
  "public repository material only",
  "All your agents. One shared memory.",
  "v1.0.0-rc.2"
]);
const llmsFullTxt = files.get("llms-full.txt") ?? "";
requireTexts("llms-full.txt", llmsFullTxt, [
  "# Lore Context Public Context Pack",
  "not another memory database",
  "Evidence Ledger",
  "MIF-style export/import",
  "Release status: https://github.com/Lore-Context/lore-context/blob/main/docs/release-status.md",
  "Claims LLMs should avoid",
  "Do not claim Lore is generally available production SaaS",
  "human review is required",
  "redland2024@gmail.com"
]);

for (const [path, text] of [["llms.txt", llmsTxt], ["llms-full.txt", llmsFullTxt]]) {
  if (/[.]omc|[.]omx|lore-cloud|memvid-repo|playwright-mcp|customer data\b|secret key|LORE_API_KEY=.*lore_/i.test(text)) {
    failures.push(`${path} leaks private planning, research, or credential-shaped material.`);
  }
}

for (const locale of localeCodes) {
  if (!files.get("sitemap.xml")?.includes(`https://lorecontext.com/${locale}/`)) {
    failures.push(`sitemap.xml missing locale homepage: ${locale}`);
  }
}

const idIndex = new Map();
for (const [path, html] of files) {
  if (!path.endsWith(".html")) continue;
  idIndex.set(path, new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1])));
}

for (const [path, html] of files) {
  if (!path.endsWith(".html")) continue;

  requireTexts(path, html, [
    '<meta name="description"',
    'rel="canonical"',
    'property="og:type" content="website"',
    'property="og:site_name" content="Lore Context"',
    'property="og:title"',
    'property="og:description"',
    'property="og:url"',
    'name="twitter:card" content="summary"',
    'name="twitter:title"',
    'name="twitter:description"'
  ]);

  if (!html.includes("redland2024@gmail.com")) {
    failures.push(`${path} must keep the canonical REDLAND contact email.`);
  }

  if (/support@lorecontext\.com|security@lorecontext\.com|privacy@lorecontext\.com/.test(html)) {
    failures.push(`${path} still contains an old lorecontext.com contact email.`);
  }

  if (/href=["']#["']/.test(html)) failures.push(`${path} contains placeholder href="#".`);
  if (/<script\b[^>]*\bsrc=["']https?:/i.test(html)) failures.push(`${path} loads a remote script asset.`);
  if (/<link\b(?=[^>]*rel=["']stylesheet["'])(?=[^>]*href=["']https?:)/i.test(html)) failures.push(`${path} loads a remote stylesheet asset.`);
  if (/<(?:img|source|video|audio|iframe)\b[^>]*(?:src|srcset)=["']https?:/i.test(html)) failures.push(`${path} loads a remote media asset.`);
  if (/@import\s+(?:url\()?["']?https?:/i.test(html) || /url\(["']?https?:/i.test(html)) {
    failures.push(`${path} depends on a remote CSS asset.`);
  }

  for (const tag of html.matchAll(/<(?:a|link)\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    validateHref(path, tag[0], tag[1], idIndex);
  }
}

const english = files.get("en/index.html") ?? "";
if (!english.includes("initLoreMotion")) {
  failures.push("Homepage should include the progressive motion enhancement script.");
}
if (!english.includes("terminal-status")) {
  failures.push("Final command terminal should expose a verified status line.");
}
if (!/class="ledger-row active"/.test(english)) {
  failures.push("Hero should expose an active ledger row for evidence motion.");
}
if (!/class="section-eye"/.test(english)) {
  failures.push("Section eyebrow treatment is required for the premium infrastructure layout.");
}

for (const key of motionKeys) {
  if (!new RegExp(`@keyframes\\s+${key}`).test(english)) failures.push(`Missing motion keyframe: ${key}`);
}

if (!/@media\(prefers-reduced-motion:reduce\)/.test(english)) {
  failures.push("Motion must respect prefers-reduced-motion.");
}

try {
  const actualFiles = await walk(dist);
  const expectedFiles = new Set(files.keys());
  for (const path of actualFiles) {
    if (!expectedFiles.has(path)) failures.push(`Unexpected stale dist file: ${path}`);
  }
  for (const [path, generated] of files) {
    const built = await readFile(join(dist, path), "utf8");
    if (built !== generated) failures.push(`Built dist/${path} does not match generated source.`);
  }
} catch {
  // Running verify before build is allowed; in-memory generation is still checked.
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Website production verification passed for ${localeCodes.length} locales and ${files.size} generated files.`);

function requireTexts(path, html, texts) {
  for (const text of texts) {
    if (!html.includes(text)) failures.push(`${path} missing required text: ${text}`);
  }
}

function htmlLang(locale) {
  if (locale === "zh-hans") return "zh-Hans";
  if (locale === "zh-hant") return "zh-Hant";
  return locale;
}

function validateHref(currentPath, tag, href, idIndex) {
  if (/^(mailto:|tel:)/i.test(href)) return;

  const target = resolveHref(currentPath, href);
  if (!target) {
    if (href.startsWith("https://github.com/") && /rel=["'][^"']*noreferrer/i.test(tag)) return;
    failures.push(`${currentPath} has unapproved external href: ${href}`);
    return;
  }

  if (!files.has(target.path)) {
    failures.push(`${currentPath} links to missing internal file: ${href}`);
    return;
  }

  if (target.fragment && !idIndex.get(target.path)?.has(target.fragment)) {
    failures.push(`${currentPath} links to missing fragment: ${href}`);
  }
}

function resolveHref(currentPath, href) {
  const [raw, fragment = ""] = href.split("#");
  if (href.startsWith("#")) return { path: currentPath, fragment };
  if (/^https?:\/\//i.test(href)) {
    const parsed = new URL(href);
    if (parsed.origin !== rootUrl.origin) return null;
    return { path: generatedPathFromUrlPath(parsed.pathname), fragment: parsed.hash.slice(1) };
  }
  if (href.startsWith("/")) return { path: generatedPathFromUrlPath(raw), fragment };
  if (raw.endsWith(".html")) {
    const base = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/") + 1) : "";
    return { path: generatedPathFromUrlPath(`/${base}${raw}`), fragment };
  }
  return null;
}

function generatedPathFromUrlPath(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!clean) return "index.html";
  if (clean.endsWith("/")) return `${clean}index.html`;
  return clean;
}

async function walk(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      paths.push(...(await walk(join(dir, entry.name), nextPrefix)));
    } else {
      paths.push(nextPrefix);
    }
  }
  return paths.sort();
}
