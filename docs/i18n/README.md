# Lore Context — Translation Contributor Guide

Thank you for helping localize Lore Context. This document explains how the project's
multilingual documentation is organized and how to contribute improvements to a
specific language.

## Status

Lore Context v0.4.0-alpha ships with the full developer-facing documentation set
translated into 17 languages. Translations are **machine-translated** as a baseline
and clearly labeled at the top of each file:

> 🤖 This document was machine-translated from English. Improvements via PR are welcome
> — see the [translation contributor guide](../README.md).

The English version (`/README.md`) is the canonical source of truth. When the English
source changes, translations drift until a contributor updates them.

## Supported Languages

| Locale code | Native name | Notes |
|---|---|---|
| `en` | English | Source of truth (root `/README.md`) |
| `zh-CN` | 简体中文 | |
| `zh-TW` | 繁體中文 | |
| `ja` | 日本語 | |
| `ko` | 한국어 | |
| `vi` | Tiếng Việt | |
| `es` | Español | Latin-American Spanish baseline |
| `pt` | Português | Brazilian Portuguese baseline |
| `ru` | Русский | |
| `tr` | Türkçe | |
| `de` | Deutsch | |
| `fr` | Français | |
| `it` | Italiano | |
| `el` | Ελληνικά | |
| `pl` | Polski | |
| `uk` | Українська | |
| `id` | Bahasa Indonesia | |

Locale codes follow IETF BCP 47 with the GitHub-recognized variants for
Simplified/Traditional Chinese.

## Directory Layout

```text
README.md                    ← English (canonical source)
docs/i18n/
  README.md                  ← This guide
  zh-CN/
    README.md                ← 简体中文 README
    getting-started.md       ← 5-min quickstart, translated
    architecture.md          ← architecture deep dive, translated
    api-reference.md         ← REST API reference, translated
    deployment.md            ← deployment guide, translated
    integrations.md          ← integration guide, translated
    CONTRIBUTING.md          ← contributor guide, translated
    SECURITY.md              ← security policy, translated
    CHANGELOG.md             ← changelog, translated
  ja/
    ... same set of docs ...
  (every locale has the same 9 files)
```

The full doc set is translated for v0.4.0-alpha. Future docs added to the English source
should be translated into all 17 locales as part of the same PR or a follow-up i18n PR.

## How to Contribute a Translation Update

### Quick fix to an existing translation

1. Fork the repository.
2. Edit `docs/i18n/<locale>/<doc>.md` directly.
3. Open a PR with a title prefix `i18n(<locale>):` — for example
   `i18n(ja): fix terminology for "context query"`.
4. Tag the PR with the `i18n` label.

A maintainer who reads the target language reviews and merges. If no maintainer for the
language is available, the PR will sit in `i18n-needs-review` for community review.

### Resyncing a translation after the English source changes

When the English source moves ahead of a translation, translations should be resynced.
You can do this by:

1. Comparing the English file to your locale's version side by side.
2. Editing the localized file to match the new structure of the English source.
3. Translating only the changed prose; leave code blocks, file paths, and command-line
   examples in English.

If you are using a translation tool (DeepL, Google Translate, an LLM), please:

- Run a manual review pass for technical terms.
- Test that internal links still resolve (relative paths to `/docs/` and `/README.md`
  may need adjustment depending on file location).
- Keep markdown structure identical (same heading levels, same code-block delimiters).

### Adding a new language

If you'd like to add a language not currently in the matrix:

1. Open an issue titled `i18n: request <Native Name> (<bcp47-code>)` describing your
   ability to maintain it.
2. Wait for maintainer ack — we want at least one ongoing maintainer per language.
3. Once acked, copy `docs/i18n/en/` (or the canonical English files) into a new
   `docs/i18n/<bcp47-code>/` directory.
4. Update the language switcher header in the canonical English `/README.md`.
5. Update this contributor guide's language matrix.
6. Open the PR.

## Style Rules

- **Keep technical terms in English** when no widely-accepted localized term exists:
  REST, MCP, JSON, JSON-RPC, MIF, JWT, API key, OAuth, Postgres, pgvector, zod, Bearer,
  semver, B-tree, GIN, jsonb, p95, Recall@K, Precision@K, MRR, prefers-reduced-motion.
- **Translate prose** that explains those terms.
- **Never translate code** inside fenced code blocks. Variable names, env vars, file
  paths, command-line arguments stay in English.
- **Translate inline labels** in tables and lists where they read as prose
  ("Production", "Optional", "Coming soon").
- **Preserve markdown structure exactly**: same heading levels, same anchor link text in
  English so cross-locale links don't break.
- **Quotation conventions**: use the destination language's preferred quotation marks
  (e.g., 「」 for Japanese, „" for German, « » for French) for prose; keep `"..."`
  for code and string literals.
- **Numbers and units**: keep ASCII digits; use the destination language's decimal
  separator only in narrative text, not in code or commands.
- **Honorifics**: not required. Use a neutral, professional register suitable for
  developer documentation.

## Anti-patterns

These will block merge:

- Translating function names, environment variables, or shell commands.
- Removing the machine-translation banner from a translated file unless the file has
  been substantially rewritten by a fluent native reviewer.
- Translating sample data values that are referenced in code (e.g.,
  `"project_id": "demo"` should stay literal).
- Adding marketing claims or product roadmap language not in the English source.
- Inserting tracking links, advertising, or affiliate URLs.

## Maintainer Notes

If you maintain a language and want write access to merge translation PRs directly,
open an issue tagged `i18n-maintainer-application` and we'll coordinate. We expect
maintainers to:

- Respond to translation PRs within 7 days during typical activity.
- Commit to syncing the translation when the English source changes substantially.
- Read all merge-blocking comments and resolve them.

## Tools and Resources

- [GitHub markdown preview](https://github.com/markdown-toolkit/markdown-toolkit) for
  rendering before commit.
- [DeepL](https://www.deepl.com/translator) for prose translation (good for
  EU languages; lower quality for some Asian languages).
- LLMs (Claude, GPT, Gemini) — usable for first-pass translation, but always review.
- For CJK / RTL: ensure your editor saves UTF-8 without BOM and respects bidi
  controls.

## Questions

Open an issue with the `i18n-question` label or join the discussions at
https://github.com/Lore-Context/lore-context/discussions.

Thank you for making Lore Context approachable in your language.
