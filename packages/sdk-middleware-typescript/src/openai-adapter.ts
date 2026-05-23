/**
 * OpenAI client adapter — extracts last user message, injects context, etc.
 *
 * Acceptance refs: S2 (OpenAI hybrid mode wiring).
 */

export interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool" | "function";
  content: string | Array<{ type: string; text?: string; [k: string]: unknown }> | null;
  [k: string]: unknown;
}

/**
 * Return the textual content of the latest message with role="user".
 * Handles both string content and OpenAI v4 array-of-parts content.
 */
export function extractLastUserMessage(messages: ReadonlyArray<OpenAIMessage>): string | null {
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
 * Inject a context block as a system message.
 *  - If messages[0] is already a system message, append (so user-supplied system prompts are preserved)
 *  - Otherwise, prepend a new system message at index 0
 *
 * Returns a NEW array; does not mutate input.
 */
export function injectIntoMessages(
  messages: ReadonlyArray<OpenAIMessage>,
  contextBlock: string,
  preamble: string,
): OpenAIMessage[] {
  const block = `${preamble}${contextBlock}`;
  if (messages.length > 0 && messages[0] && messages[0].role === "system") {
    const first = messages[0];
    const existing = typeof first.content === "string" ? first.content : "";
    const merged = existing.length > 0 ? `${existing}\n\n${block}` : block;
    return [{ ...first, content: merged }, ...messages.slice(1)];
  }
  return [{ role: "system", content: block }, ...messages];
}
