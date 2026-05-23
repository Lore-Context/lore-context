/**
 * Anthropic client adapter.
 *
 * Acceptance refs: S3.
 *
 * Anthropic's `messages.create({ system, messages, model, max_tokens, ... })`
 * keeps the system prompt as a separate top-level parameter (string or
 * array of content blocks), NOT as a leading element in `messages`. Our
 * inject logic therefore writes into / appends to `system` rather than
 * prepending a system role into `messages`.
 */

export interface AnthropicMessage {
  role: "user" | "assistant";
  content:
    | string
    | Array<{ type: string; text?: string; [k: string]: unknown }>;
  [k: string]: unknown;
}

export type AnthropicSystemParam =
  | string
  | Array<{ type: "text"; text: string; [k: string]: unknown }>
  | undefined;

/**
 * Return the textual content of the most recent user message.
 */
export function extractLastUserMessageAnthropic(
  messages: ReadonlyArray<AnthropicMessage>,
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && msg.role === "user") {
      const content = msg.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        const text = content
          .filter((p) => typeof p === "object" && p !== null && (p as { type?: string }).type === "text")
          .map((p) => (p as { text?: string }).text ?? "")
          .filter((s) => s.length > 0)
          .join("\n");
        return text || null;
      }
      return null;
    }
  }
  return null;
}

/**
 * Inject a context block into the Anthropic `system` parameter.
 *  - undefined → string preamble+block
 *  - string → existing + "\n\n" + preamble+block
 *  - array → concat a new text block at end
 *
 * Returns a new value; never mutates input.
 */
export function injectIntoAnthropicSystem(
  existingSystem: AnthropicSystemParam,
  contextBlock: string,
  preamble: string,
): AnthropicSystemParam {
  const block = `${preamble}${contextBlock}`;
  if (existingSystem === undefined) {
    return block;
  }
  if (typeof existingSystem === "string") {
    return existingSystem.length > 0 ? `${existingSystem}\n\n${block}` : block;
  }
  // Array form
  return [...existingSystem, { type: "text", text: block }];
}
