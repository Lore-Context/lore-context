import { describe, it, expect } from "vitest";
import { getDomain, getProvider, getSourceLabel, isSupported } from "../src/extractor.js";

describe("extractor.getProvider", () => {
  it("identifies ChatGPT", () => {
    expect(getProvider("https://chatgpt.com/c/123")).toBe("chatgpt");
    expect(getProvider("https://chat.openai.com/")).toBe("chatgpt");
  });
  it("identifies Claude", () => {
    expect(getProvider("https://claude.ai/chat/abc")).toBe("claude");
  });
  it("identifies Gemini", () => {
    expect(getProvider("https://gemini.google.com/app")).toBe("gemini");
  });
  it("identifies Perplexity", () => {
    expect(getProvider("https://perplexity.ai/search")).toBe("perplexity");
    expect(getProvider("https://www.perplexity.ai/")).toBe("perplexity");
  });
  it("returns unknown for unsupported domains", () => {
    expect(getProvider("https://google.com")).toBe("unknown");
    expect(getProvider("https://gmail.com")).toBe("unknown");
    expect(getProvider("https://example.com/perplexity")).toBe("unknown");
  });
  it("rejects malformed urls", () => {
    expect(getProvider("not a url")).toBe("unknown");
  });
});

describe("extractor.isSupported", () => {
  it("returns true for the four supported AI sites", () => {
    expect(isSupported("https://chatgpt.com/")).toBe(true);
    expect(isSupported("https://claude.ai/")).toBe(true);
    expect(isSupported("https://gemini.google.com/")).toBe(true);
    expect(isSupported("https://perplexity.ai/")).toBe(true);
  });
  it("returns false for unsupported sites", () => {
    expect(isSupported("https://example.com/")).toBe(false);
    expect(isSupported("https://chatgpt.com.evil.com/")).toBe(false);
  });
});

describe("extractor.getDomain", () => {
  it("returns the lowercased hostname", () => {
    expect(getDomain("https://Chatgpt.com/x")).toBe("chatgpt.com");
  });
  it("returns empty string for malformed urls", () => {
    expect(getDomain("not a url")).toBe("");
  });
});

describe("extractor.getSourceLabel", () => {
  it("returns the user-facing label per provider", () => {
    expect(getSourceLabel("https://chatgpt.com/")).toBe("ChatGPT");
    expect(getSourceLabel("https://claude.ai/")).toBe("Claude.ai");
    expect(getSourceLabel("https://gemini.google.com/")).toBe("Gemini");
    expect(getSourceLabel("https://perplexity.ai/")).toBe("Perplexity");
  });
});
