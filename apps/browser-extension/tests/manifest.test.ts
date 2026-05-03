import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(here, "..", "src", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;

describe("manifest", () => {
  it("is MV3", () => {
    expect(manifest.manifest_version).toBe(3);
  });
  it("has the v1.0 name and version", () => {
    expect(manifest.name).toBe("Lore Memory Capture");
    expect(String(manifest.version)).toMatch(/^1\.0\./);
  });
  it("uses a service worker module background", () => {
    const bg = manifest.background as { service_worker: string; type: string };
    expect(bg.service_worker).toBe("background.js");
    expect(bg.type).toBe("module");
    expect((manifest as { background: { scripts?: unknown } }).background.scripts).toBeUndefined();
  });
  it("does not request broad <all_urls> or browsing-history permissions", () => {
    const perms = manifest.permissions as string[];
    expect(perms).not.toContain("<all_urls>");
    expect(perms).not.toContain("history");
    expect(perms).not.toContain("webNavigation");
    expect(perms).not.toContain("topSites");
  });
  it("only host-permits the four supported AI sites", () => {
    const hosts = manifest.host_permissions as string[];
    const allowed = [
      "chatgpt.com",
      "chat.openai.com",
      "claude.ai",
      "gemini.google.com",
      "perplexity.ai"
    ];
    for (const host of hosts) {
      const okay = allowed.some((d) => host.includes(d));
      expect(okay, `unexpected host_permission: ${host}`).toBe(true);
    }
  });
  it("declares an options page and an action popup", () => {
    expect(manifest.options_page).toBe("options.html");
    expect((manifest.action as { default_popup: string }).default_popup).toBe("popup.html");
  });
  it("limits content_scripts to the same hosts", () => {
    const scripts = manifest.content_scripts as Array<{ matches: string[] }>;
    expect(scripts).toHaveLength(1);
    for (const m of scripts[0].matches) {
      expect(m).toMatch(/(chatgpt\.com|chat\.openai\.com|claude\.ai|gemini\.google\.com|perplexity\.ai)/);
    }
  });
});
